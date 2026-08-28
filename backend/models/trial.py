from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class Trial(Base):
    __tablename__ = "trials"
    
    trial_id = Column(String, primary_key=True, index=True) 
    trial_name = Column(String, nullable=False)
    description = Column(Text)
    source_type = Column(String) 
    original_text = Column(Text) 
    status = Column(String, index=True) 
    target_recruitment = Column(Integer)
    researcher_id = Column(Integer, ForeignKey("researchers.id"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    researcher = relationship("Researcher", back_populates="trials")
    criteria = relationship("TrialCriterion", back_populates="trial", cascade="all, delete-orphan")
    
    # Allows querying all patients currently active in this trial without DB write conflicts
    active_patients = relationship(
        "Patient", 
        back_populates="active_trial", 
        viewonly=True
    )