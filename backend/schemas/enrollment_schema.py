from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

# Thin request bodies (patient_id and trial_id are handled via API route paths)
class InviteRequest(BaseModel):
    pass

class EnrollRequest(BaseModel):
    pass

class DeclineRequest(BaseModel):
    pass

class DropRequest(BaseModel):
    pass

class EnrollmentResponse(BaseModel):
    enrollment_id: int
    trial_id: str
    patient_id: str
    status: str
    screening_id: Optional[int] = None
    
    invited_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    declined_at: Optional[datetime] = None
    enrolled_at: Optional[datetime] = None
    dropped_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)