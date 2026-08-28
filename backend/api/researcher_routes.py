from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Tuple

from backend.database.session import get_db
from backend.api.auth_deps import require_researcher
from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.trial import Trial
from backend.schemas.researcher_schema import ResearcherResponse, ResearcherUpdate
from backend.schemas.trial_schema import TrialResponse

router = APIRouter(prefix="/researchers", tags=["Researchers"])

@router.get("/me", response_model=ResearcherResponse)
def get_my_researcher_profile(
    auth_data: Tuple[User, Researcher] = Depends(require_researcher)
):
    """Retrieve profile of the currently logged in researcher."""
    _, researcher = auth_data
    return researcher

@router.put("/me", response_model=ResearcherResponse)
def update_my_researcher_profile(
    payload: ResearcherUpdate,
    auth_data: Tuple[User, Researcher] = Depends(require_researcher),
    db: Session = Depends(get_db)
):
    """Update profile details of the currently logged in researcher."""
    _, researcher = auth_data
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(researcher, key, value)
    db.commit()
    db.refresh(researcher)
    return researcher

@router.get("/me/trials", response_model=List[TrialResponse])
def get_my_trials(
    auth_data: Tuple[User, Researcher] = Depends(require_researcher),
    db: Session = Depends(get_db)
):
    """List all trials owned strictly by the currently logged in researcher."""
    _, researcher = auth_data
    # Return ONLY trials belonging to this researcher (empty list [] if none)
    return db.query(Trial).filter(Trial.researcher_id == researcher.id).all()
