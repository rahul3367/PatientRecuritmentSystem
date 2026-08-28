from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
from backend.database.connection import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    notification_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False, index=True)
    trial_id = Column(String, ForeignKey("trials.trial_id"), nullable=False, index=True)
    
    message = Column(Text, nullable=False)
    channel = Column(String, nullable=False) # EMAIL, SMS, IN_APP
    
    delivery_status = Column(String, nullable=False, default="PENDING") # SENT, FAILED, PENDING
    response = Column(String, nullable=False, default="NONE") # ACCEPTED, DECLINED, NONE
    
    __table_args__ = (
        CheckConstraint("delivery_status IN ('SENT', 'FAILED', 'PENDING')", name="chk_notification_delivery"),
        CheckConstraint("response IN ('ACCEPTED', 'DECLINED', 'NONE')", name="chk_notification_response"),
    )
    
    sent_at = Column(DateTime, nullable=True)

    patient = relationship("Patient")
    trial = relationship("Trial")

    @property
    def trial_name(self) -> str:
        return self.trial.trial_name if self.trial else self.trial_id