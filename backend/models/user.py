from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="RESEARCHER")  # "RESEARCHER" | "PATIENT"
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # 1:1 relationship with Researcher profile
    researcher_profile = relationship("Researcher", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # 1:1 relationship with Patient clinical profile
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
