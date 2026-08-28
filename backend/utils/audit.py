from sqlalchemy.orm import Session
from typing import Optional
from backend.models.audit_log import AuditLog

def create_audit_log(
    db: Session, 
    user_id: str, 
    action: str, 
    entity_type: str, 
    entity_id: str, 
    old_value: Optional[str] = None, 
    new_value: Optional[str] = None, 
    reason: Optional[str] = None
) -> AuditLog:
    """
    Creates an AuditLog row for state mutations.
    Uses flush() instead of commit() so the caller maintains transaction control.
    """
    audit_record = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        reason=reason
    )
    
    db.add(audit_record)
    db.flush()  # FIXED: Sends to DB to get the ID, but leaves transaction open
    db.refresh(audit_record)
    
    return audit_record