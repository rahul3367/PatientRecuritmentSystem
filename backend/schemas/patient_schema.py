from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class VitalsCreate(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    hba1c: Optional[float] = None
    bmi: Optional[float] = None
    cholesterol: Optional[float] = None
    alt: Optional[float] = None
    creatinine: Optional[float] = None
    blood_glucose: Optional[float] = None

class VitalsResponse(VitalsCreate):
    vitals_id: int
    patient_id: str
    recorded_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ConditionCreate(BaseModel):
    condition_name: str
    diagnosed_at: Optional[date] = None

class ConditionResponse(ConditionCreate):
    condition_id: int
    patient_id: str
    model_config = ConfigDict(from_attributes=True)

class AllergyCreate(BaseModel):
    allergen: str

class AllergyResponse(AllergyCreate):
    allergy_id: int
    patient_id: str
    model_config = ConfigDict(from_attributes=True)

class PatientCreate(BaseModel):
    name: str
    gender: Optional[str] = None
    dob: Optional[date] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    
    # Restored fields
    previous_surgery: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    consent: bool # Mandatory check on creation
    user_id: Optional[int] = None
    
    vitals: Optional[VitalsCreate] = None
    conditions: List[ConditionCreate] = []
    allergies: List[AllergyCreate] = []

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    
    previous_surgery: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    consent: Optional[bool] = None 
    user_id: Optional[int] = None
    
    vitals: Optional[VitalsCreate] = None
    conditions: Optional[List[ConditionCreate]] = None
    allergies: Optional[List[AllergyCreate]] = None

class PatientResponse(BaseModel):
    patient_id: str
    user_id: Optional[int] = None
    name: str
    gender: Optional[str] = None
    dob: Optional[date] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    
    previous_surgery: Optional[str] = None
    smoking: Optional[bool] = None
    alcohol: Optional[bool] = None
    consent: bool
    
    active_trial_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    vitals: List[VitalsResponse] = []
    conditions: List[ConditionResponse] = []
    allergies: List[AllergyResponse] = []
    
    is_profile_complete: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class BatchUploadResponse(BaseModel):
    total_rows: int
    inserted: int
    duplicates_flagged: int
    errors: List[str]