from sqlalchemy.orm import Session, joinedload

from backend.schemas.patient_schema import PatientCreate, PatientUpdate
from backend.models.patient import (
    Patient,
    PatientVitals,
    PatientCondition,
    PatientAllergy,
)
from backend.utils.patient_id import generate_patient_id
from backend.services.duplicate_service import check_duplicate


def create_patient(
    db: Session,
    patient_data: PatientCreate,
    force: bool = False,
):
    """
    Create a new patient along with optional:
    - Vitals
    - Conditions
    - Allergies

    Consent is mandatory for registration.

    Duplicate checking is performed unless force=True.
    """

    # ---------------------------------------------------------
    # 1. CONSENT CHECK
    # ---------------------------------------------------------

    if patient_data.consent is not True:
        raise ValueError(
            "Patient consent is required for registration."
        )

    # ---------------------------------------------------------
    # 2. DUPLICATE CHECK
    # ---------------------------------------------------------

    if not force:
        dup_check = check_duplicate(
            db,
            patient_data.name,
            patient_data.dob,
            patient_data.phone,
        )

        if dup_check["duplicate"]:
            return {
                "is_duplicate": True,
                "details": dup_check,
                "patient": None,
            }

    # ---------------------------------------------------------
    # 3. GENERATE PATIENT ID
    # ---------------------------------------------------------

    patient_id = generate_patient_id(db)

    # ---------------------------------------------------------
    # 4. CREATE PATIENT
    # ---------------------------------------------------------

    db_patient = Patient(
        patient_id=patient_id,
        user_id=patient_data.user_id,
        name=patient_data.name,
        gender=patient_data.gender,
        dob=patient_data.dob,
        location=patient_data.location,
        phone=patient_data.phone,
        blood_group=patient_data.blood_group,
        previous_surgery=patient_data.previous_surgery,
        smoking=patient_data.smoking,
        alcohol=patient_data.alcohol,
        consent=True,
    )

    db.add(db_patient)

    # ---------------------------------------------------------
    # 5. CREATE VITALS
    # ---------------------------------------------------------

    if patient_data.vitals is not None:
        vitals_dict = patient_data.vitals.model_dump(
            exclude_unset=True
        )

        db_vitals = PatientVitals(
            patient_id=patient_id,
            **vitals_dict,
        )

        db.add(db_vitals)

    # ---------------------------------------------------------
    # 6. CREATE CONDITIONS
    # ---------------------------------------------------------

    for cond in patient_data.conditions:
        db_condition = PatientCondition(
            patient_id=patient_id,
            **cond.model_dump(),
        )

        db.add(db_condition)

    # ---------------------------------------------------------
    # 7. CREATE ALLERGIES
    # ---------------------------------------------------------

    for allergy in patient_data.allergies:
        db_allergy = PatientAllergy(
            patient_id=patient_id,
            **allergy.model_dump(),
        )

        db.add(db_allergy)

    # ---------------------------------------------------------
    # 8. COMMIT EVERYTHING
    # ---------------------------------------------------------

    try:
        db.commit()
        db.refresh(db_patient)

    except Exception:
        db.rollback()
        raise

    # ---------------------------------------------------------
    # 9. RETURN RESULT
    # ---------------------------------------------------------

    return {
        "is_duplicate": False,
        "details": None,
        "patient": db_patient,
    }


def get_patient(
    db: Session,
    patient_id: str,
) -> Patient | None:
    """
    Retrieve a patient by patient ID.
    """

    return (
        db.query(Patient)
        .filter(Patient.patient_id == patient_id)
        .first()
    )


def is_patient_profile_complete(patient: Patient) -> bool:
    """
    Determines if a patient profile has sufficient clinical and demographic details for matching.
    """
    if not patient:
        return False
    if not patient.dob or not patient.gender:
        return False
    if patient.smoking is None or patient.alcohol is None:
        return False
    if not patient.consent:
        return False
    if not patient.vitals or len(patient.vitals) == 0:
        return False
    return True


def update_patient(
    db: Session,
    patient_id: str,
    patient_data: PatientUpdate,
) -> Patient | None:
    """
    Update patient information including nested vitals, conditions, and allergies.
    active_trial_id is intentionally not handled here.
    """

    patient = (
        db.query(Patient)
        .filter(Patient.patient_id == patient_id)
        .first()
    )

    if patient is None:
        return None

    update_data = patient_data.model_dump(
        exclude_unset=True
    )

    # 1. Update direct Patient attributes
    vitals_data = update_data.pop("vitals", None)
    conditions_data = update_data.pop("conditions", None)
    allergies_data = update_data.pop("allergies", None)
    update_data.pop("active_trial_id", None)

    for field, value in update_data.items():
        if hasattr(patient, field):
            setattr(patient, field, value)

    # 2. Update/Add Vitals if provided
    if vitals_data:
        # Create a new latest vitals entry
        db_vitals = PatientVitals(
            patient_id=patient_id,
            **vitals_data,
        )
        db.add(db_vitals)

    # 3. Replace/Update Conditions if explicitly provided
    if conditions_data is not None:
        db.query(PatientCondition).filter_by(patient_id=patient_id).delete()
        for cond in conditions_data:
            db_condition = PatientCondition(
                patient_id=patient_id,
                **cond,
            )
            db.add(db_condition)

    # 4. Replace/Update Allergies if explicitly provided
    if allergies_data is not None:
        db.query(PatientAllergy).filter_by(patient_id=patient_id).delete()
        for allergy in allergies_data:
            db_allergy = PatientAllergy(
                patient_id=patient_id,
                **allergy,
            )
            db.add(db_allergy)

    # 5. Commit and refresh
    try:
        db.commit()
        db.refresh(patient)
    except Exception:
        db.rollback()
        raise

    return patient


def list_patients(
    db: Session,
    skip: int = 0,
    limit: int = 500,
) -> list[Patient]:
    """
    Return a paginated list of patients with eager loading of all health records.
    """

    skip = max(skip, 0)
    limit = min(max(limit, 1), 1000)

    return (
        db.query(Patient)
        .options(
            joinedload(Patient.vitals),
            joinedload(Patient.conditions),
            joinedload(Patient.allergies)
        )
        .order_by(Patient.patient_id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )