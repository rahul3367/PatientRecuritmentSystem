from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class Patient(Base):
    __tablename__ = "patients"
    
    patient_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    gender = Column(String)
    dob = Column(Date)
    location = Column(String)
    phone = Column(String)
    blood_group = Column(String)
    
    # Restored stable attributes
    previous_surgery = Column(String, nullable=True)
    smoking = Column(Boolean, nullable=True)
    alcohol = Column(Boolean, nullable=True)
    consent = Column(Boolean, nullable=False) # Legally mandatory
    
    active_trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=True, index=True) 
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    vitals = relationship("PatientVitals", back_populates="patient", cascade="all, delete-orphan")
    conditions = relationship("PatientCondition", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("PatientAllergy", back_populates="patient", cascade="all, delete-orphan")
    
    active_trial = relationship(
        "Trial", 
        foreign_keys=[active_trial_id], 
        back_populates="active_patients"
    )

class PatientVitals(Base):
    __tablename__ = "patient_vitals"
    
    vitals_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    bp_systolic = Column(Integer)
    bp_diastolic = Column(Integer)
    heart_rate = Column(Integer)
    hba1c = Column(Float)
    bmi = Column(Float)
    cholesterol = Column(Float)
    alt = Column(Float)
    creatinine = Column(Float)
    blood_glucose = Column(Float)

    patient = relationship("Patient", back_populates="vitals")

class PatientCondition(Base):
    __tablename__ = "patient_conditions"
    
    condition_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    condition_name = Column(String, nullable=False, index=True)
    diagnosed_at = Column(Date, nullable=True)

    patient = relationship("Patient", back_populates="conditions")

class PatientAllergy(Base):
    __tablename__ = "patient_allergies"
    
    allergy_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    allergen = Column(String, nullable=False)

    patient = relationship("Patient", back_populates="allergies")