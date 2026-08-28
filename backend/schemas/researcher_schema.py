from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ResearcherBase(BaseModel):
    name: str
    organization: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None

class ResearcherCreate(ResearcherBase):
    user_id: int

class ResearcherUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None

class ResearcherResponse(ResearcherBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
