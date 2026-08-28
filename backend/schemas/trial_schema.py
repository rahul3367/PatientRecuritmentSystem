from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from .criterion_schema import CriterionResponse

class TrialCreate(BaseModel):
    trial_name: str
    description: Optional[str] = None
    source_type: Optional[str] = None
    target_recruitment: Optional[int] = None
    original_text: Optional[str] = None
    researcher_id: Optional[int] = None

class TrialUpdate(BaseModel):
    trial_name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    status: Optional[str] = None
    target_recruitment: Optional[int] = None
    original_text: Optional[str] = None
    researcher_id: Optional[int] = None

class TrialResponse(TrialCreate):
    trial_id: str
    status: Optional[str] = None
    researcher_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    criteria: List[CriterionResponse] = []

    model_config = ConfigDict(from_attributes=True)