from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.models.verification import Verification
from backend.models.screening import ScreeningResult
from backend.utils.audit import create_audit_log

VALID_VERDICTS = ["APPROVED", "NEEDS_REVIEW", "REJECTED"]

def verify_screening(db: Session, screening_id: int, verified_by: str, remarks: str = None, override_verdict: str = None) -> Verification:
    screening = db.query(ScreeningResult).filter_by(screening_id=screening_id).first()
    if not screening:
        raise ValueError("Screening result not found.")
        
    # FIX: Validate vocabulary and remarks
    if override_verdict:
        if override_verdict not in VALID_VERDICTS:
            raise ValueError(f"Invalid verdict. Must be one of: {VALID_VERDICTS}")
        if not remarks:
            raise ValueError("Remarks are strictly mandatory when overriding an AI verdict.")
            
    old_verdict = screening.verdict
    
    verification = Verification(
        patient_id=screening.patient_id,
        trial_id=screening.trial_id,
        screening_id=screening.screening_id, # FIX: Linked directly to the specific snapshot
        verified=True,
        verified_by=verified_by,
        verified_at=datetime.now(timezone.utc),
        remarks=remarks
    )
    db.add(verification)
    db.flush() 
    
    if override_verdict and override_verdict != old_verdict:
        screening.verdict = override_verdict
        # FIX: Keep eligibility physically synced with the overridden verdict
        screening.eligible = (override_verdict in ["APPROVED", "NEEDS_REVIEW"])
        
        create_audit_log(
            db=db, user_id=verified_by, action="OVERRIDE_VERDICT", 
            entity_type="ScreeningResult", entity_id=str(screening.screening_id), 
            old_value=old_verdict, new_value=override_verdict, reason=remarks
        )
        
    db.commit()
    db.refresh(verification)
    return verification