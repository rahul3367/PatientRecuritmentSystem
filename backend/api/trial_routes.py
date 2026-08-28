from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.trial_schema import TrialCreate, TrialUpdate, TrialResponse
from backend.schemas.criterion_schema import CriterionCreate, CriterionResponse
from backend.services.trial_service import create_draft, confirm_criteria
from backend.services.pdf_service import extract_text_from_pdf
from backend.models.trial import Trial
from backend.models.researcher import Researcher
from backend.models.user import User
from backend.utils.audit import create_audit_log
from backend.api.auth_deps import get_optional_current_user, get_current_user, require_researcher

router = APIRouter(prefix="/trials", tags=["Trials"])

@router.get("/my", response_model=List[TrialResponse])
def get_my_trials(
    auth_data: tuple = Depends(require_researcher),
    db: Session = Depends(get_db)
):
    """List trials owned strictly by the authenticated researcher (Data Ownership)."""
    user, researcher = auth_data
    return db.query(Trial).filter(Trial.researcher_id == researcher.id).order_by(Trial.created_at.desc().nullslast(), Trial.trial_id.desc()).all()

@router.get("/", response_model=List[TrialResponse])
def get_all_trials(
    status: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    search: Optional[str] = None,
    condition: Optional[str] = None,
    skip: int = 0, 
    limit: int = 1000, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """List trials with optional filtering ordered latest-first by created_at."""
    query = db.query(Trial)
    
    if status:
        query = query.filter(Trial.status.ilike(f"%{status}%"))
    if search:
        query = query.filter(
            (Trial.trial_name.ilike(f"%{search}%")) | 
            (Trial.description.ilike(f"%{search}%")) |
            (Trial.trial_id.ilike(f"%{search}%"))
        )
    if year:
        from sqlalchemy import extract
        query = query.filter(extract('year', Trial.created_at) == year)
    if month:
        from sqlalchemy import extract
        query = query.filter(extract('month', Trial.created_at) == month)
        
    query = query.order_by(Trial.created_at.desc().nullslast(), Trial.trial_id.desc())
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=TrialResponse)
def create_manual_trial(
    trial_data: TrialCreate, 
    criteria: List[CriterionCreate], 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user:
        if current_user.role == "PATIENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Access forbidden: Patients cannot create clinical trials."
            )
        researcher = db.query(Researcher).filter_by(user_id=current_user.id).first()
        researcher_id = researcher.id if researcher else None
    else:
        researcher_id = trial_data.researcher_id

    return confirm_criteria(db, trial_data, criteria, researcher_id=researcher_id, background_tasks=background_tasks)

@router.post("/extract-pdf")
def extract_pdf_protocol(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot extract protocol documents."
        )
    try:
        content = file.file.read()
        extracted_text = extract_text_from_pdf(content)
        return {"text": extracted_text, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF extraction failed: {str(e)}")

@router.post("/draft", response_model=List[CriterionCreate])
def create_trial_draft(
    file: Optional[UploadFile] = File(None), 
    text: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot create trial drafts."
        )
    if file:
        content = file.file.read()
        extracted_text = extract_text_from_pdf(content)
        return create_draft(extracted_text)
    elif text:
        return create_draft(text)
    else:
        raise HTTPException(status_code=400, detail="Must provide either 'file' or 'text'.")

@router.post("/{trial_id}/confirm-criteria", response_model=TrialResponse)
def confirm_trial_criteria(
    trial_id: str, 
    trial_data: TrialCreate, 
    criteria: List[CriterionCreate], 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    researcher_id = None
    if current_user:
        if current_user.role == "PATIENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Patients cannot modify trial criteria."
            )
        researcher = db.query(Researcher).filter_by(user_id=current_user.id).first()
        if researcher:
            existing = db.query(Trial).filter_by(trial_id=trial_id).first()
            if existing and existing.researcher_id is not None and existing.researcher_id != researcher.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden: You cannot modify criteria for a trial you do not own."
                )
            researcher_id = researcher.id

    return confirm_criteria(db, trial_data, criteria, provided_trial_id=trial_id, researcher_id=researcher_id, background_tasks=background_tasks)

@router.put("/{trial_id}", response_model=TrialResponse)
def update_trial(
    trial_id: str, 
    trial_update: TrialUpdate, 
    user_id: str = Query("SYSTEM"), 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot update trials."
        )
    
    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
        
    if current_user and current_user.role == "RESEARCHER":
        researcher = db.query(Researcher).filter_by(user_id=current_user.id).first()
        if researcher and trial.researcher_id is not None and trial.researcher_id != researcher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You can only update trials you own."
            )

    actor_id = current_user.email if current_user else user_id
    for key, value in trial_update.model_dump(exclude_unset=True).items():
        old_val = getattr(trial, key)
        if old_val != value:
            setattr(trial, key, value)
            
            # FIX: Audit log for trial updates
            create_audit_log(
                db=db, user_id=actor_id, action="UPDATE_TRIAL",
                entity_type="Trial", entity_id=trial_id,
                old_value=str(old_val), new_value=str(value), reason=f"Updated {key}"
            )
        
    db.commit()
    db.refresh(trial)
    return trial

@router.get("/{trial_id}", response_model=TrialResponse)
def get_trial(trial_id: str, db: Session = Depends(get_db)):
    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    return trial

@router.get("/{trial_id}/criteria", response_model=List[CriterionResponse])
def get_trial_criteria(trial_id: str, db: Session = Depends(get_db)):
    """Retrieve all specific eligibility criteria for a given trial."""
    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    return trial.criteria