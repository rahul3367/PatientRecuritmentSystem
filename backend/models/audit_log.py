from sqlalchemy import Column, String, Integer, DateTime, Text
from datetime import datetime, timezone
from backend.database.connection import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    audit_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True) # Who performed the action
    action = Column(String, nullable=False) # e.g., 'OVERRIDE_VERDICT', 'UPDATE_CRITERIA'
    
    entity_type = Column(String, nullable=False) # e.g., 'Patient', 'ScreeningResult'
    entity_id = Column(String, nullable=False) 
    
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)