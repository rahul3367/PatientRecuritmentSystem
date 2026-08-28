from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database.session import get_db
from backend.schemas.notification_schema import NotificationSend, NotificationRespond, NotificationResponse
from backend.services.notification_service import send_notification, respond_to_notification
from backend.models.notification import Notification
from backend.models.trial import Trial
from backend.models.patient import Patient
from backend.models.user import User
from backend.api.auth_deps import get_optional_current_user, require_patient

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/my", response_model=List[NotificationResponse])
def get_my_notifications(
    auth_data: tuple = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Retrieve notifications belonging to the logged-in patient for existing real trials only, sorted latest first."""
    user, patient = auth_data
    if not patient:
        patient = db.query(Patient).filter_by(user_id=user.id).first()
    if not patient:
        return []
    return (
        db.query(Notification)
        .join(Trial, Notification.trial_id == Trial.trial_id)
        .filter(Notification.patient_id == patient.patient_id)
        .order_by(Notification.sent_at.desc().nullslast(), Notification.notification_id.desc())
        .all()
    )

@router.post("/send", response_model=NotificationResponse)
def send_notification_route(
    payload: NotificationSend, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot initiate outbound trial recruitment notifications."
        )
    try:
        return send_notification(db, payload.patient_id, payload.trial_id, payload.message, payload.channel)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{patient_id}", response_model=List[NotificationResponse])
def get_patient_notifications(
    patient_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    # Patient role can only view their own notifications
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Cannot view notifications belonging to another patient."
            )
    return (
        db.query(Notification)
        .join(Trial, Notification.trial_id == Trial.trial_id)
        .filter(Notification.patient_id == patient_id)
        .order_by(Notification.sent_at.desc().nullslast(), Notification.notification_id.desc())
        .all()
    )

@router.post("/{notification_id}/respond", response_model=NotificationResponse)
def respond_notification_route(
    notification_id: int, 
    payload: NotificationRespond, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    notif = db.query(Notification).filter_by(notification_id=notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if current_user and current_user.role == "PATIENT":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        if not patient or patient.patient_id != notif.patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Cannot respond to notifications belonging to another patient."
            )
    try:
        return respond_to_notification(db, notification_id, payload.response)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
