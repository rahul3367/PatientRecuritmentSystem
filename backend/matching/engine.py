import logging
from typing import Dict, Any, Tuple, Optional
from backend.models.patient import Patient
from backend.models.trial import Trial
from backend.schemas.criterion_schema import CriterionResponse
from backend.utils.age_calculator import calculate_age
from backend.matching.hard_criteria import evaluate_hard_criteria
from backend.matching.soft_criteria import evaluate_soft_criteria
from backend.matching.scoring import aggregate_scores
from backend.matching.verdict import determine_verdict
from backend.matching.explainability import generate_explanations

logger = logging.getLogger("matching_engine")
logger.setLevel(logging.INFO)

def flatten_patient_data(patient: Patient) -> Tuple[Dict[str, Any], Optional[int]]:
    """
    Extracts nested ORM data into a flat dictionary for the matching rules.
    Returns the flattened dict AND the vitals_id used for the snapshot.
    """
    data = {
        "age": calculate_age(patient.dob) if patient.dob else None,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "smoking": patient.smoking,
        "alcohol": patient.alcohol,
        "previous_surgery": patient.previous_surgery
    }
    
    vitals_id = None
    
    # Grab the most recent vitals if they exist
    if patient.vitals:
        latest_vitals = sorted(patient.vitals, key=lambda x: x.recorded_at, reverse=True)[0]
        vitals_id = latest_vitals.vitals_id
        data.update({
            "bp_systolic": latest_vitals.bp_systolic,
            "bp_diastolic": latest_vitals.bp_diastolic,
            "heart_rate": latest_vitals.heart_rate,
            "hba1c": latest_vitals.hba1c,
            "bmi": latest_vitals.bmi,
            "cholesterol": latest_vitals.cholesterol,
            "alt": latest_vitals.alt,
            "creatinine": latest_vitals.creatinine,
            "blood_glucose": latest_vitals.blood_glucose
        })
        
    # Flatten related tables into searchable lists
    data["conditions"] = [c.condition_name for c in patient.conditions] if patient.conditions else []
    data["allergies"] = [a.allergen for a in patient.allergies] if patient.allergies else []
    
    return data, vitals_id

def run_matching_engine(patient: Patient, trial: Trial, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    The core orchestrator. Returns the exact shape of ScreeningResultResponse, 
    completely isolated from database IO.
    Supports optional overrides (e.g. from dynamic eligibility forms).
    """
    p_id = getattr(patient, "patient_id", "UNKNOWN")
    t_id = getattr(trial, "trial_id", "UNKNOWN")

    # 1. Active-trial conflict check (Short Circuit)
    if patient.active_trial_id is not None and patient.active_trial_id != trial.trial_id:
        logger.info(f"[MATCHING] Patient {p_id} vs Trial {t_id} -> REJECTED (Active trial conflict: {patient.active_trial_id})")
        return {
            "match_percentage": 0.0,
            "verdict": "REJECTED",
            "eligible": False,
            "vitals_id": None,
            "criteria_snapshot": {
                "reason": "Patient is actively enrolled in another trial."
            }
        }
        
    # Serialize criteria to pass to functions and save in the snapshot
    serialized_criteria = [CriterionResponse.model_validate(c) for c in (trial.criteria or [])]
    hard_criteria = [c for c in serialized_criteria if c.classification == "HARD"]
    soft_criteria = [c for c in serialized_criteria if c.classification == "SOFT"]
    
    # 2. Flatten data & capture vitals_id
    patient_data, vitals_id = flatten_patient_data(patient)
    
    # Merge overrides if provided
    if overrides:
        for k, v in overrides.items():
            if v is not None:
                if k == "conditions" and isinstance(v, list):
                    existing_conds = set(patient_data.get("conditions", []))
                    existing_conds.update(v)
                    patient_data["conditions"] = list(existing_conds)
                elif k == "allergies" and isinstance(v, list):
                    existing_allergies = set(patient_data.get("allergies", []))
                    existing_allergies.update(v)
                    patient_data["allergies"] = list(existing_allergies)
                else:
                    patient_data[k] = v
    
    # 3. Evaluate Hard Criteria
    hard_passed, hard_failures = evaluate_hard_criteria(patient_data, hard_criteria)
    failed_fields = {f["field"] for f in hard_failures}
    passed_hard_criteria = [c for c in hard_criteria if c.field not in failed_fields]
        
    # 4. Evaluate Soft Criteria & Score
    soft_contributions = evaluate_soft_criteria(patient_data, soft_criteria)
    score_result = aggregate_scores(soft_contributions)
    match_percentage = score_result["match_percentage"]
    
    # 5. Determine Verdict
    verdict = determine_verdict(match_percentage, hard_passed=hard_passed)
    eligible = (verdict in ["APPROVED", "NEEDS_REVIEW"])
    
    # 6. Generate Explainability Snapshot with all passed & failed criteria
    explanations = generate_explanations(hard_failures, soft_contributions, passed_hard_criteria=passed_hard_criteria)
    
    logger.info(f"[MATCHING] Patient {p_id} vs Trial {t_id} -> {verdict} ({match_percentage}%) | Eligible={eligible} | Soft: {soft_contributions}")

    # 7. Return Result Shape (Ready for service layer to write to DB)
    return {
        "match_percentage": match_percentage,
        "verdict": verdict,
        "eligible": eligible,
        "vitals_id": vitals_id,
        "criteria_snapshot": {
            "criteria_used": [c.model_dump() for c in serialized_criteria],
            "explanations": explanations
        }
    }