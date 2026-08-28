from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.database.session import get_db
from backend.schemas.enrollment_schema import EnrollmentResponse
from backend.services.enrollment_service import transition_enrollment
from backend.models.waitlist import Waitlist
from backend.models.patient import Patient
from backend.models.user import User
from backend.models.enrollment import Enrollment
from backend.api.auth_deps import get_optional_current_user, require_patient

from backend.models.trial import Trial

router = APIRouter(prefix="/trials", tags=["Enrollment"])

@router.get("/enrollments/my", response_model=List[EnrollmentResponse])
def get_my_enrollments(
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Retrieve all enrollments/invitations strictly for the authenticated patient (Data Ownership)."""
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        return []
    return db.query(Enrollment).filter_by(patient_id=patient.patient_id).order_by(Enrollment.enrolled_at.desc().nullslast(), Enrollment.accepted_at.desc().nullslast(), Enrollment.invited_at.desc().nullslast()).all()

@router.get("/enrollments/all", response_model=List[EnrollmentResponse])
def get_all_enrollments(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieve all study enrollments across trials for researchers and clinical staff."""
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients can only view their own enrollments."
        )
    return db.query(Enrollment).order_by(Enrollment.enrolled_at.desc().nullslast(), Enrollment.accepted_at.desc().nullslast(), Enrollment.invited_at.desc().nullslast()).all()

@router.post("/{trial_id}/apply", response_model=EnrollmentResponse)
def apply_to_trial(
    trial_id: str,
    reason: Optional[str] = None,
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Allows authenticated patient to apply to an open trial after eligibility check."""
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    
    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found.")
    if trial.status != "OPEN":
        raise HTTPException(status_code=400, detail="Trial is not open for recruitment applications.")

    # Validate that patient has an eligible ScreeningResult for this trial
    from backend.models.screening import ScreeningResult
    latest_screening = db.query(ScreeningResult).filter_by(
        trial_id=trial_id,
        patient_id=patient.patient_id
    ).order_by(ScreeningResult.screened_at.desc().nullslast()).first()

    if not latest_screening or not latest_screening.eligible:
        raise HTTPException(
            status_code=400,
            detail="Eligibility screening required. You must meet trial eligibility criteria before applying."
        )

    # Check for existing enrollment to ensure idempotent behavior and prevent accidental auto-accept
    existing_enrollment = db.query(Enrollment).filter_by(trial_id=trial_id, patient_id=patient.patient_id).first()
    if existing_enrollment:
        if existing_enrollment.status == "INVITED":
            return existing_enrollment
        elif existing_enrollment.status in ["ACCEPTED", "ENROLLED"]:
            return existing_enrollment
        elif existing_enrollment.status in ["DROPPED", "DECLINED"]:
            raise HTTPException(status_code=400, detail=f"Cannot apply: Current enrollment status is {existing_enrollment.status}.")

    try:
        return transition_enrollment(
            db, 
            patient.patient_id, 
            trial_id, 
            "INVITED", 
            user.email, 
            reason or "Direct Patient Application via Clinical Portal",
            screening_id=latest_screening.screening_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{trial_id}/invite/{patient_id}", response_model=EnrollmentResponse)
def invite_patient(
    trial_id: str, 
    patient_id: str, 
    user_id: str = Query("SYSTEM"), 
    reason: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot issue study invitations."
        )
    actor_id = current_user.email if current_user else user_id
    try:
        return transition_enrollment(db, patient_id, trial_id, "INVITED", actor_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{trial_id}/accept/{patient_id}", response_model=EnrollmentResponse)
def accept_invite(
    trial_id: str, 
    patient_id: str, 
    user_id: str = Query("SYSTEM"), 
    reason: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only accept invitations for yourself."
            )
    actor_id = current_user.email if current_user else user_id
    try:
        return transition_enrollment(db, patient_id, trial_id, "ACCEPTED", actor_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{trial_id}/decline/{patient_id}", response_model=EnrollmentResponse)
def decline_invite(
    trial_id: str, 
    patient_id: str, 
    user_id: str = Query("SYSTEM"), 
    reason: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only decline invitations for yourself."
            )
    actor_id = current_user.email if current_user else user_id
    try:
        return transition_enrollment(db, patient_id, trial_id, "DECLINED", actor_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{trial_id}/enroll/{patient_id}", response_model=EnrollmentResponse)
def enroll_patient(
    trial_id: str, 
    patient_id: str, 
    user_id: str = Query("SYSTEM"), 
    reason: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot perform final enrollment confirmation."
        )
    actor_id = current_user.email if current_user else user_id
    try:
        return transition_enrollment(db, patient_id, trial_id, "ENROLLED", actor_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{trial_id}/drop/{patient_id}", response_model=EnrollmentResponse)
def drop_patient(
    trial_id: str, 
    patient_id: str, 
    user_id: str = Query("SYSTEM"), 
    reason: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot drop other participants."
        )
    actor_id = current_user.email if current_user else user_id
    try:
        return transition_enrollment(db, patient_id, trial_id, "DROPPED", actor_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/waitlists/all")
def get_all_waitlists(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot view the internal study waitlist registry."
        )
    return db.query(Waitlist).order_by(Waitlist.trial_id.asc(), Waitlist.rank.asc()).all()

@router.get("/{trial_id}/waitlist")
def get_waitlist(
    trial_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot view the internal study waitlist registry."
        )
    return db.query(Waitlist).filter_by(trial_id=trial_id).order_by(Waitlist.rank.asc()).all()

@router.post("/{trial_id}/waitlist")
def add_to_waitlist(
    trial_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot modify waitlist records."
        )
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required.")
    
    match_percentage = float(payload.get("match_percentage", 0.0))

    # Check if candidate is already waitlisted
    existing = db.query(Waitlist).filter_by(trial_id=trial_id, patient_id=patient_id, status="WAITING").first()
    if existing:
        return existing

    max_rank = db.query(Waitlist).filter_by(trial_id=trial_id, status="WAITING").count()
    new_entry = Waitlist(
        trial_id=trial_id,
        patient_id=patient_id,
        rank=max_rank + 1,
        match_percentage=match_percentage,
        status="WAITING"
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry