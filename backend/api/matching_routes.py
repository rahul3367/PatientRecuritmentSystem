from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.matching_schema import (
    MatchResponse,
    ScreeningResultResponse,
    CandidateResult,
    TrialCandidateResult,
    ScreenRequest,
)
from backend.services.matching_service import (
    screen_patient_for_trial,
    find_trials_for_patient,
    find_patients_for_trial,
)
from backend.models.patient import Patient
from backend.models.user import User
from backend.models.screening import ScreeningResult
from backend.api.auth_deps import get_optional_current_user, require_patient

router = APIRouter(prefix="/matching", tags=["Matching"])

@router.get("/my/trials", response_model=List[TrialCandidateResult])
def get_my_recommended_trials(
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Find all open trials the authenticated patient is eligible for (Data Ownership)."""
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        return []
    try:
        return find_trials_for_patient(db, patient.patient_id, persist=False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/patient/{patient_id}/trial/{trial_id}", response_model=MatchResponse)
def match_patient_to_trial(
    patient_id: str, 
    trial_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    On-demand matching (persist=False).
    Does NOT generate a screening_id - response.data.screening_id and
    response.data.screened_at will be null. Safe for polling.
    """
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You cannot view screening scores for another patient."
            )
    try:
        result = screen_patient_for_trial(db, patient_id, trial_id, persist=False)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

from pydantic import BaseModel
from typing import Any, Dict
from backend.services.matching_service import check_trial_eligibility_with_inputs

class DynamicEligibilityCheckPayload(BaseModel):
    form_inputs: Optional[Dict[str, Any]] = None

@router.post("/trial/{trial_id}/check-eligibility")
def check_dynamic_eligibility(
    trial_id: str,
    payload: DynamicEligibilityCheckPayload = None,
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Dynamic eligibility check for the authenticated patient against a specific trial's criteria.
    Merges stored patient profile with form inputs and logs evaluation.
    """
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    
    inputs = payload.form_inputs if payload else {}
    try:
        result = check_trial_eligibility_with_inputs(db, patient.patient_id, trial_id, form_inputs=inputs, persist=True)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/screen/", response_model=MatchResponse)
def persist_screening(
    req: ScreenRequest, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Persisted screening (persist=True).
    Generates a screening_id for human-in-the-loop verification.
    """
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot initiate official screening verification logs."
        )
    try:
        result = screen_patient_for_trial(db, req.patient_id, req.trial_id, persist=True)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/patient/{patient_id}/trials", response_model=List[TrialCandidateResult])
def get_trials_for_patient(
    patient_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Find all OPEN trials a given patient is currently eligible for.
    """
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Cannot view recommendations for another patient."
            )
    try:
        return find_trials_for_patient(db, patient_id, persist=False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/trial/{trial_id}/patients", response_model=List[CandidateResult])
def get_patients_for_trial(
    trial_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Rank all patients against one trial (bulk scoring - can be slow for large patient counts)."""
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot view the candidate discovery pool."
        )
    try:
        return find_patients_for_trial(db, trial_id, persist=False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/screenings", response_model=List[ScreeningResultResponse])
def get_all_screenings(
    trial_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Retrieve screenings for clinical triage and researcher workspaces."""
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients can only view their own screenings."
        )
    query = db.query(ScreeningResult)
    if trial_id:
        query = query.filter(ScreeningResult.trial_id == trial_id)
    return query.order_by(ScreeningResult.screened_at.desc().nullslast()).all()