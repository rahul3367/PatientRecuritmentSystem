from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional
from datetime import datetime

class NotificationSend(BaseModel):
    patient_id: str
    trial_id: str
    message: str
    channel: str

class NotificationRespond(BaseModel):
    # Strict literal enforcement prevents typo-based database pollution
    response: Literal["ACCEPTED", "DECLINED", "NONE"]

class NotificationResponse(BaseModel):
    notification_id: int
    patient_id: str
    trial_id: str
    message: str
    channel: str
    delivery_status: str
    response: str
    sent_at: Optional[datetime] = None
    trial_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
