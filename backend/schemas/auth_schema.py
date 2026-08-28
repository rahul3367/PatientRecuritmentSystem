from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime, date
from backend.schemas.patient_schema import VitalsCreate, ConditionCreate, AllergyCreate, VitalsResponse, ConditionResponse, AllergyResponse

class UserRegister(BaseModel):
    email: str
    password: str
    role: Literal["RESEARCHER", "PATIENT"] = "RESEARCHER"
    
    # Common profile fields
    name: str
    
    # Researcher-specific fields (Optional, no demo defaults)
    organization: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None
    
    # Patient-specific fields
    patient_id: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    previous_surgery: Optional[str] = None
    consent: Optional[bool] = True
    
    vitals: Optional[VitalsCreate] = None
    conditions: Optional[List[ConditionCreate]] = None
    allergies: Optional[List[AllergyCreate]] = None

class SendOTPRequest(BaseModel):
    email: str

class SendOTPResponse(BaseModel):
    success: bool
    message: str
    email: str
    expires_in_seconds: int = 600

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class VerifyOTPResponse(BaseModel):
    success: bool
    message: str
    email: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ResearcherProfileResponse(BaseModel):
    id: int
    user_id: int
    name: str
    organization: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = None
    contact: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class PatientProfileSummaryResponse(BaseModel):
    patient_id: str
    user_id: Optional[int] = None
    name: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    previous_surgery: Optional[str] = None
    consent: Optional[bool] = None
    active_trial_id: Optional[str] = None
    vitals: List[VitalsResponse] = []
    conditions: List[ConditionResponse] = []
    allergies: List[AllergyResponse] = []

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    role: str
    name: str
    profile_id: Optional[str] = None  # researcher ID (int as str) or patient_id (e.g. 'P000001')
    researcher: Optional[ResearcherProfileResponse] = None
    patient: Optional[PatientProfileSummaryResponse] = None

class AuthMeResponse(BaseModel):
    user_id: int
    email: str
    role: str
    is_active: bool
    researcher: Optional[ResearcherProfileResponse] = None
    patient: Optional[PatientProfileSummaryResponse] = None

