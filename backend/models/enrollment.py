from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import relationship
from backend.database.connection import Base

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    enrollment_id = Column(Integer, primary_key=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    
    status = Column(String, nullable=False, index=True) # INVITED, ACCEPTED, DECLINED, ENROLLED, DROPPED
    
    __table_args__ = (
        CheckConstraint("status IN ('INVITED', 'ACCEPTED', 'DECLINED', 'ENROLLED', 'DROPPED')", name="chk_enrollment_status"),
    )
    
    # Full lifecycle timestamps
    invited_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    declined_at = Column(DateTime, nullable=True)
    enrolled_at = Column(DateTime, nullable=True)
    dropped_at = Column(DateTime, nullable=True)

    # Link to qualifying screening snapshot
    screening_id = Column(Integer, ForeignKey("screening_results.screening_id"), nullable=True)

    patient = relationship("Patient")
    trial = relationship("Trial")
    screening = relationship("ScreeningResult")