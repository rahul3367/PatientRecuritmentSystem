from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class Waitlist(Base):
    __tablename__ = "waitlists"
    
    waitlist_id = Column(Integer, primary_key=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    
    rank = Column(Integer, nullable=False)
    match_percentage = Column(Float, nullable=False)
    status = Column(String, nullable=False) # WAITING, PROMOTED, REMOVED
    
    __table_args__ = (
        CheckConstraint("status IN ('WAITING', 'PROMOTED', 'REMOVED')", name="chk_waitlist_status"),
    )
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    trial = relationship("Trial")