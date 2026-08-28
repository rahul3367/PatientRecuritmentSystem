from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from backend.database.connection import Base

class Verification(Base):
    __tablename__ = "verifications"

    verification_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)

    # BUG FIX: verification_service.py constructs Verification(..., screening_id=...)
    # but this column didn't exist - every single call to verify_screening() would
    # raise TypeError: 'screening_id' is an invalid keyword argument for Verification.
    # Added here so a verification links directly to the specific ScreeningResult
    # snapshot it reviewed, not just to the patient/trial pair in general (a patient
    # can have multiple historical screenings for the same trial).
    screening_id = Column(Integer, ForeignKey("screening_results.screening_id"), nullable=True, index=True)

    verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(String, nullable=True)

    # Nullable, explicitly set when verified=True (not at row-creation time)
    verified_at = Column(DateTime, nullable=True)

    remarks = Column(Text, nullable=True)

    patient = relationship("Patient")
    trial = relationship("Trial")
    screening = relationship("ScreeningResult")