from sqlalchemy.orm import Session
from datetime import date
from rapidfuzz import fuzz
from backend.models.patient import Patient

def check_duplicate(db: Session, name: str, dob: date, phone: str) -> dict:
    """
    Checks for duplicates using: RapidFuzz name > 85% AND exact DOB AND exact last-4 phone.
    All three conditions must be met to flag as duplicate.
    """
    candidates = db.query(Patient).filter(Patient.dob == dob).all()
    
    for candidate in candidates:
        if not phone or not candidate.phone:
            continue
            
        if phone[-4:] == candidate.phone[-4:]:
            similarity = fuzz.ratio(name.lower(), candidate.name.lower())
            
            if similarity > 85.0:
                return {
                    "duplicate": True, 
                    "patient_id": candidate.patient_id, 
                    "similarity": round(similarity, 2)
                }
                
    return {"duplicate": False, "patient_id": None, "similarity": None}