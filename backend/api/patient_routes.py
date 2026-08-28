from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.patient_schema import PatientCreate, PatientUpdate, PatientResponse, BatchUploadResponse
from backend.services.patient_service import create_patient, list_patients
from backend.services.batch_upload_service import process_batch_upload
from backend.models.patient import Patient
from backend.models.user import User
from backend.utils.audit import create_audit_log
from backend.api.auth_deps import get_optional_current_user, require_patient

router = APIRouter(prefix="/patients", tags=["Patients"])

from backend.services.patient_service import create_patient, list_patients, update_patient as update_patient_svc, is_patient_profile_complete

def _format_patient_response(patient: Patient) -> PatientResponse:
    resp = PatientResponse.model_validate(patient)
    resp.is_profile_complete = is_patient_profile_complete(patient)
    return resp

@router.get("/me", response_model=PatientResponse)
def get_my_patient_profile(
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Retrieve clinical profile for the currently authenticated patient (Data Ownership).
    Identity is resolved directly from the verified JWT user_id.
    """
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient clinical profile not found for this account."
        )
    return _format_patient_response(patient)

@router.put("/me", response_model=PatientResponse)
def update_my_patient_profile(
    patient_update: PatientUpdate,
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Update clinical profile for the authenticated patient during onboarding or profile editing.
    """
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient clinical profile not found."
        )
    
    updated = update_patient_svc(db, patient.patient_id, patient_update)
    create_audit_log(
        db=db, user_id=user.email, action="UPDATE_MY_PROFILE",
        entity_type="Patient", entity_id=patient.patient_id,
        old_value="PROFILE", new_value="UPDATED", reason="Patient self-service profile update"
    )
    return _format_patient_response(updated)

@router.get("/", response_model=List[PatientResponse])
def get_all_patients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # If a patient calls the registry endpoint, enforce privacy: return only themselves
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        return [patient] if patient else []
    return list_patients(db, skip=skip, limit=limit)

@router.post("/", response_model=PatientResponse)
def register_patient(
    patient: PatientCreate, 
    force: bool = False, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT" and not patient.user_id:
        patient.user_id = current_user.id
    result = create_patient(db, patient, force=force)
    if result.get("is_duplicate"):
        raise HTTPException(status_code=409, detail={"message": "Duplicate found", "details": result["details"]})
    return result["patient"]

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str, 
    patient_update: PatientUpdate, 
    user_id: str = Query("SYSTEM"), 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Patient role can only update their own record
    if current_user and current_user.role == "PATIENT":
        if patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only update your own patient record."
            )
            
    actor_id = current_user.email if current_user else user_id
    update_data = patient_update.model_dump(exclude_unset=True)
    
    # Strictly enforce active_trial_id invariant at the route level
    update_data.pop("active_trial_id", None)
        
    for key, value in update_data.items():
        old_val = getattr(patient, key)
        if old_val != value:
            setattr(patient, key, value)
            
            # Audit log for direct demographic updates
            create_audit_log(
                db=db, user_id=actor_id, action="UPDATE_PATIENT",
                entity_type="Patient", entity_id=patient_id,
                old_value=str(old_val), new_value=str(value), reason=f"Updated {key}"
            )
            
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Patient role can only access their own record
    if current_user and current_user.role == "PATIENT":
        if patient.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not have permission to view another patient's data."
            )
    return patient

@router.post("/batch-upload", response_model=BatchUploadResponse)
def batch_upload(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot perform batch clinical uploads."
        )
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel file.")
    return process_batch_upload(db, file.file)

@router.post("/generate-virtual")
def generate_virtual_patient():
    return {"message": "Virtual patient generation endpoint (To be implemented)."}