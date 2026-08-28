from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class ScreeningResult(Base):
    __tablename__ = "screening_results"
    
    screening_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)
    
    vitals_id = Column(Integer, ForeignKey("patient_vitals.vitals_id"), nullable=True)
    
    match_percentage = Column(Float, nullable=False, index=True)
    verdict = Column(String, nullable=False) # APPROVED, NEEDS_REVIEW, REJECTED
    eligible = Column(Boolean, nullable=False)
    
    criteria_snapshot = Column(JSON, nullable=True) 
    
    screened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        CheckConstraint("verdict IN ('APPROVED', 'NEEDS_REVIEW', 'REJECTED')", name="chk_screening_verdict"),
    )

    patient = relationship("Patient")
    trial = relationship("Trial")
    vitals = relationship("PatientVitals")