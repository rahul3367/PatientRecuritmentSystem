from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import text
from backend.models.patient import Patient

def generate_patient_id(db: Session) -> str:
    """
    Generates the next available patient ID (e.g., P000001).
    Safely parses numeric digits across all formats (P001, P000001, etc.) to guarantee uniqueness.
    """
    patient_ids = db.query(Patient.patient_id).all()
    max_num = 0
    for (pid,) in patient_ids:
        if pid:
            digits = "".join(filter(str.isdigit, pid))
            if digits:
                try:
                    num = int(digits)
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
                    
    next_num = max_num + 1
    new_pid = f"P{next_num:06d}"
    while db.query(Patient).filter_by(patient_id=new_pid).first() is not None:
        next_num += 1
        new_pid = f"P{next_num:06d}"
        
    return new_pid