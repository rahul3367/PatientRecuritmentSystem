from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Any
from backend.utils.excel_parser import parse_patient_excel
from backend.utils.patient_id import generate_patient_id
from backend.services.duplicate_service import check_duplicate
from backend.models.patient import Patient, PatientVitals

def process_batch_upload(db: Session, file_obj: Any) -> dict:
    parsed = parse_patient_excel(file_obj)
    
    if parsed["errors"]:
        return {"total_rows": 0, "inserted": 0, "duplicates_flagged": 0, "errors": parsed["errors"]}
        
    inserted = 0
    duplicates = 0
    errors = []
    
    for index, row in enumerate(parsed["rows"]):
        # FIX: Create a SAVEPOINT for row-level isolation
        try:
            with db.begin_nested():
                raw_consent = str(row.get("consent", "")).strip().lower()
                consent_bool = raw_consent in ["yes", "true", "1", "y"]
                
                if not consent_bool:
                    errors.append(f"Row {index + 1} ({row.get('name')}): Missing/False consent. Skipped.")
                    continue
                    
                dup_check = check_duplicate(db, row.get("name"), row.get("dob"), row.get("phone"))
                if dup_check["duplicate"]:
                    duplicates += 1
                    errors.append(f"Row {index + 1} ({row.get('name')}): Duplicate flagged (Matches {dup_check['patient_id']}).")
                    continue
                    
                patient_id = generate_patient_id(db)
                consent_timestamp = datetime.now(timezone.utc) if consent_bool else None
                
                db_patient = Patient(
                    patient_id=patient_id,
                    name=row.get("name"),
                    gender=row.get("gender"),
                    dob=row.get("dob"),
                    location=row.get("location"),
                    phone=row.get("phone"),
                    blood_group=row.get("blood_group"),
                    previous_surgery=row.get("previous_surgery"), # FIX: Restored lifestyle fields
                    smoking=row.get("smoking") in ["yes", "true", 1, "y"] if row.get("smoking") is not None else None,
                    alcohol=row.get("alcohol") in ["yes", "true", 1, "y"] if row.get("alcohol") is not None else None,
                    consent=consent_bool,
                    consent_given_at=consent_timestamp # FIX: Added timestamp
                )
                db.add(db_patient)
                
                # FIX: Restored vitals mapping for batch uploads
                if any(row.get(k) is not None for k in ["bp_systolic", "bp_diastolic", "heart_rate", "blood_glucose"]):
                    db_vitals = PatientVitals(
                        patient_id=patient_id,
                        bp_systolic=row.get("bp_systolic"),
                        bp_diastolic=row.get("bp_diastolic"),
                        heart_rate=row.get("heart_rate"),
                        blood_glucose=row.get("blood_glucose")
                    )
                    db.add(db_vitals)
                
                # FIX: Flush immediately so the next row's generate_patient_id() sees this ID
                db.flush()
                inserted += 1
                
        except Exception as e:
            errors.append(f"Row {index + 1} ({row.get('name')}): Unexpected error - {str(e)}")
            
    db.commit()
    
    return {
        "total_rows": len(parsed["rows"]),
        "inserted": inserted,
        "duplicates_flagged": duplicates,
        "errors": errors
    }