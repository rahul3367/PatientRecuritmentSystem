from sqlalchemy.orm import Session, joinedload
from backend.models.patient import Patient
from backend.models.trial import Trial
from backend.models.screening import ScreeningResult
from backend.matching.engine import run_matching_engine
from typing import List, Dict, Any


def _get_patient_eager(db: Session, patient_id: str) -> Patient:
    return db.query(Patient).options(
        joinedload(Patient.vitals),
        joinedload(Patient.conditions),
        joinedload(Patient.allergies)
    ).filter(Patient.patient_id == patient_id).first()


def _get_trial_eager(db: Session, trial_id: str) -> Trial:
    return db.query(Trial).options(
        joinedload(Trial.criteria)
    ).filter(Trial.trial_id == trial_id).first()


def _compute_gaps(criteria_snapshot: dict) -> List[str]:
    """
    BUG FIX: explainability.py always marks SOFT explanations as passed=True
    (soft criteria don't "fail" - that's the whole point of them being soft),
    so filtering on `not exp["passed"]` never finds anything for an eligible
    candidate - "gaps" was always an empty list. A meaningful gap is instead
    a SOFT criterion that contributed less than its max possible score, i.e.
    an imperfect but non-disqualifying match worth surfacing to a reviewer.
    """
    explanations = (criteria_snapshot or {}).get("explanations", [])
    return [
        exp["message"] for exp in explanations
        if exp.get("type") == "SOFT" and exp.get("score", 0) < exp.get("max_score", 0)
    ]


def _persist_screening(db: Session, patient_id: str, trial_id: str, result: Dict[str, Any]) -> ScreeningResult:
    db_screening = ScreeningResult(
        patient_id=patient_id,
        trial_id=trial_id,
        vitals_id=result.get("vitals_id"),
        match_percentage=result["match_percentage"],
        verdict=result["verdict"],
        eligible=result["eligible"],
        criteria_snapshot=result["criteria_snapshot"]
    )
    db.add(db_screening)
    return db_screening


def screen_patient_for_trial(db: Session, patient_id: str, trial_id: str, persist: bool = True) -> Dict[str, Any]:
    """
    Mode 1: Single patient vs Single trial.
    If persist=True, saves the screening result to the database and the
    returned dict is enriched with DB-generated fields (screening_id, screened_at).
    """
    patient = _get_patient_eager(db, patient_id)
    trial = _get_trial_eager(db, trial_id)

    if not patient or not trial:
        raise ValueError("Patient or Trial not found.")

    result = run_matching_engine(patient, trial)

    # BUG FIX (patient_id/trial_id missing from response): run_matching_engine()
    # is deliberately patient/trial-agnostic in its return shape - it doesn't know
    # (or need to know) which specific patient/trial it was called with, so it never
    # includes those keys. That's fine for the engine's own unit tests, but it means
    # the dict this function returns was missing two REQUIRED fields on
    # ScreeningResultResponse, and the untyped GET/POST matching routes were the
    # only reason that went unnoticed (no response_model was validating the shape).
    # Inject them here, once, so every caller - persisted or not - gets a complete,
    # schema-valid result without the engine needing to know about IDs at all.
    result = {**result, "patient_id": patient.patient_id, "trial_id": trial.trial_id}

    if persist:
        db_screening = _persist_screening(db, patient.patient_id, trial.trial_id, result)
        db.commit()
        db.refresh(db_screening)
        # Merge in DB-generated fields so callers (e.g. the /screen/ endpoint)
        # get screening_id and screened_at back without a second query.
        result = {
            **result,
            "screening_id": db_screening.screening_id,
            "screened_at": db_screening.screened_at,
        }

    return result


from backend.models.patient import Patient, PatientVitals, PatientCondition, PatientAllergy
from datetime import datetime, timezone


def _persist_patient_inputs(db: Session, patient: Patient, form_inputs: Dict[str, Any]):
    if not form_inputs or not isinstance(form_inputs, dict):
        return

    from backend.matching.hard_criteria import STANDARD_ALIASES, _normalize_str, _parse_float, _parse_bool

    vitals_updates = {}

    for k, v in form_inputs.items():
        if v is None or v == "":
            continue

        k_clean = _normalize_str(k)
        k_slug = k_clean.replace(" ", "_")

        canonical_key = None
        for std_key, aliases in STANDARD_ALIASES.items():
            if k_clean == std_key or k_slug == std_key or any(k_clean == a or k_slug == a.replace(" ", "_") for a in aliases):
                canonical_key = std_key
                break

        target_key = canonical_key or k_slug

        if target_key in {"gender", "blood_group", "previous_surgery"}:
            setattr(patient, target_key, str(v).strip())
        elif target_key in {"smoking", "alcohol"}:
            b_val = _parse_bool(v)
            if b_val is not None:
                setattr(patient, target_key, b_val)
        elif target_key in {"bp_systolic", "bp_diastolic", "heart_rate"}:
            num = _parse_float(v)
            if num is not None:
                vitals_updates[target_key] = int(num)
        elif target_key in {"hba1c", "bmi", "cholesterol", "alt", "creatinine", "blood_glucose"}:
            num = _parse_float(v)
            if num is not None:
                vitals_updates[target_key] = float(num)
        elif target_key == "conditions":
            cond_list = v if isinstance(v, list) else [v]
            existing_cond_names = {c.condition_name.strip().lower() for c in (patient.conditions or [])}
            for c_item in cond_list:
                if c_item and str(c_item).strip().lower() not in existing_cond_names:
                    db.add(PatientCondition(patient_id=patient.patient_id, condition_name=str(c_item).strip()))
                    existing_cond_names.add(str(c_item).strip().lower())
        elif target_key == "allergies":
            allergy_list = v if isinstance(v, list) else [v]
            existing_allergens = {a.allergen.strip().lower() for a in (patient.allergies or [])}
            for a_item in allergy_list:
                if a_item and str(a_item).strip().lower() not in existing_allergens:
                    db.add(PatientAllergy(patient_id=patient.patient_id, allergen=str(a_item).strip()))
                    existing_allergens.add(str(a_item).strip().lower())
        else:
            b_val = _parse_bool(v)
            if b_val is True and len(k_clean) > 3 and not any(neg in k_clean for neg in ["exclusion", "exclude", "without", "no "]):
                existing_cond_names = {c.condition_name.strip().lower() for c in (patient.conditions or [])}
                if k.strip().lower() not in existing_cond_names:
                    db.add(PatientCondition(patient_id=patient.patient_id, condition_name=k.strip()))

    if vitals_updates:
        if patient.vitals and len(patient.vitals) > 0:
            latest_vitals = sorted(patient.vitals, key=lambda x: x.recorded_at, reverse=True)[0]
            for vk, vv in vitals_updates.items():
                setattr(latest_vitals, vk, vv)
            latest_vitals.recorded_at = datetime.now(timezone.utc)
        else:
            new_vitals = PatientVitals(
                patient_id=patient.patient_id,
                recorded_at=datetime.now(timezone.utc),
                **vitals_updates
            )
            db.add(new_vitals)
            if patient.vitals is None:
                patient.vitals = []
            patient.vitals.append(new_vitals)

    db.flush()


def check_trial_eligibility_with_inputs(
    db: Session, 
    patient_id: str, 
    trial_id: str, 
    form_inputs: Dict[str, Any] = None, 
    persist: bool = True
) -> Dict[str, Any]:
    """
    Evaluates dynamic eligibility form inputs against a trial for a patient.
    Persists valid clinical data to patient profile and screening record for patient+trial.
    """
    patient = _get_patient_eager(db, patient_id)
    trial = _get_trial_eager(db, trial_id)

    if not patient or not trial:
        raise ValueError("Patient or Trial not found.")

    if persist and form_inputs:
        _persist_patient_inputs(db, patient, form_inputs)

    result = run_matching_engine(patient, trial, overrides=form_inputs)
    result = {**result, "patient_id": patient.patient_id, "trial_id": trial.trial_id}

    if persist:
        db_screening = _persist_screening(db, patient.patient_id, trial.trial_id, result)
        db.commit()
        db.refresh(db_screening)
        result["screening_id"] = db_screening.screening_id
        result["screened_at"] = db_screening.screened_at

    if result["eligible"]:
        message = "Based on the information provided, you currently meet the required eligibility criteria for this study."
    else:
        message = "You do not meet one or more required eligibility criteria for this study."

    result["message"] = message
    result["can_apply"] = result["eligible"]
    return result


def find_trials_for_patient(db: Session, patient_id: str, persist: bool = False) -> List[dict]:
    """
    Mode 2: Rank all OPEN trials for a single patient. Returns lightweight
    per-trial candidate dicts (trial_id/trial_name, NOT patient_id/patient_name -
    since we're iterating over trials for one already-known patient, the
    patient identity is constant and the trial identity is what varies).

    This used to live inline inside the API route, which put business logic
    in the route layer - moved here to match the rest of the codebase's
    routes-are-thin convention, and so it can share _persist_screening /
    _compute_gaps with the other two modes instead of duplicating them.
    """
    patient = _get_patient_eager(db, patient_id)
    if not patient:
        raise ValueError("Patient not found.")

    trials = db.query(Trial).options(joinedload(Trial.criteria)).filter(Trial.status == "OPEN").all()

    candidates = []
    for trial in trials:
        try:
            if persist:
                with db.begin_nested():
                    res = run_matching_engine(patient, trial)
                    _persist_screening(db, patient.patient_id, trial.trial_id, res)
            else:
                res = run_matching_engine(patient, trial)

            if res["eligible"]:
                candidates.append({
                    "trial_id": trial.trial_id,
                    "trial_name": trial.trial_name,
                    "match_percentage": res["match_percentage"],
                    "verdict": res["verdict"],
                    "gaps": _compute_gaps(res["criteria_snapshot"]),
                })
        except Exception:
            continue

    if persist:
        db.commit()

    return sorted(candidates, key=lambda x: x["match_percentage"], reverse=True)


def find_patients_for_trial(db: Session, trial_id: str, persist: bool = False) -> List[dict]:
    """
    Mode 3: Rank all patients for a trial. Returns lightweight candidate dicts.
    If persist=True, logs every evaluation to the database using SAVEPOINT isolation.
    """
    trial = _get_trial_eager(db, trial_id)
    if not trial:
        raise ValueError("Trial not found.")

    # In a real production system with millions of rows, this would be a pre-filtered DB query.
    # For the hackathon scale, we score all patients in memory.
    patients = db.query(Patient).options(
        joinedload(Patient.vitals),
        joinedload(Patient.conditions),
        joinedload(Patient.allergies)
    ).all()

    # Check for latest persisted screening results per patient for this trial (e.g. from dynamic form evaluation)
    from backend.services.dashboard_service import get_latest_screenings_per_patient
    latest_screenings = {
        s.patient_id: s for s in get_latest_screenings_per_patient(db, trial_id)
    }

    candidates = []

    for patient in patients:
        try:
            if patient.patient_id in latest_screenings:
                s = latest_screenings[patient.patient_id]
                candidates.append({
                    "patient_id": patient.patient_id,
                    "patient_name": patient.name,
                    "match_percentage": s.match_percentage,
                    "verdict": s.verdict,
                    "eligible": s.eligible,
                    "gaps": _compute_gaps(s.criteria_snapshot),
                    "criteria_snapshot": s.criteria_snapshot
                })
            else:
                if persist:
                    with db.begin_nested():
                        res = run_matching_engine(patient, trial)
                        _persist_screening(db, patient.patient_id, trial.trial_id, res)
                else:
                    res = run_matching_engine(patient, trial)

                candidates.append({
                    "patient_id": patient.patient_id,
                    "patient_name": patient.name,
                    "match_percentage": res["match_percentage"],
                    "verdict": res["verdict"],
                    "eligible": res["eligible"],
                    "gaps": _compute_gaps(res["criteria_snapshot"]),
                    "criteria_snapshot": res.get("criteria_snapshot")
                })
        except Exception:
            # Continue the loop for valid patients; let the batch finish
            continue

    if persist:
        db.commit()

    return sorted(candidates, key=lambda x: x["match_percentage"], reverse=True)