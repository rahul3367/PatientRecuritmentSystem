from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database.connection import Base

class Researcher(Base):
    __tablename__ = "researchers"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    name = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    contact = Column(String, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="researcher_profile")
    trials = relationship("Trial", back_populates="researcher")
