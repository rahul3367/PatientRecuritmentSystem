from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from backend.database.connection import Base

class TrialCriterion(Base):
    __tablename__ = "trial_criteria"
    
    criterion_id = Column(Integer, primary_key=True, autoincrement=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)
    
    field = Column(String, nullable=False) 
    data_type = Column(String, nullable=False) 
    classification = Column(String, nullable=False) 
    operator = Column(String, nullable=False) 
    
    # DB-level constraints to reject malformed LLM outputs instantly
    __table_args__ = (
        CheckConstraint("classification IN ('HARD', 'SOFT')", name="chk_valid_classification"),
        CheckConstraint("data_type IN ('NUMERIC', 'CATEGORICAL', 'BOOLEAN')", name="chk_valid_data_type"),
    )
    
    # Boundaries for HARD criteria (exact pass/fail constraints like BETWEEN)
    numeric_min = Column(Float, nullable=True)
    numeric_max = Column(Float, nullable=True)
    
    # Gaussian parameters for SOFT criteria (scoring based on distance from ideal)
    numeric_ideal = Column(Float, nullable=True)
    numeric_tolerance = Column(Float, nullable=True)
    
    # Categorical and Boolean states
    categorical_ideal = Column(String, nullable=True)
    boolean_ideal = Column(Boolean, nullable=True)
    
    weight = Column(Float, nullable=True)
    importance = Column(Integer, nullable=True)

    trial = relationship("Trial", back_populates="criteria")