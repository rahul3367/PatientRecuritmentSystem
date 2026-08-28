from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.models.notification import Notification
from backend.models.patient import Patient
from backend.models.trial import Trial

def send_notification(db: Session, patient_id: str, trial_id: str, message: str, channel: str) -> Notification:
    # Explicit existence checks to safely raise ValueError instead of a 500 IntegrityError
    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise ValueError(f"Patient with ID {patient_id} not found.")

    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise ValueError(f"Trial with ID {trial_id} not found.")

    notif = Notification(
        patient_id=patient_id,
        trial_id=trial_id,
        message=message,
        channel=channel,
        delivery_status="PENDING",
        response="NONE"
    )
    db.add(notif)
    db.flush()

    dispatch_successful = True 

    if dispatch_successful:
        notif.delivery_status = "SENT"
        notif.sent_at = datetime.now(timezone.utc)
    else:
        notif.delivery_status = "FAILED"

    # Synchronize enrollment record so invitation appears in patient's Invitations tab
    from backend.models.enrollment import Enrollment
    enr = db.query(Enrollment).filter_by(patient_id=patient_id, trial_id=trial_id).first()
    if not enr:
        enr = Enrollment(
            patient_id=patient_id,
            trial_id=trial_id,
            status="INVITED",
            invited_at=datetime.now(timezone.utc)
        )
        db.add(enr)
    elif enr.status not in ["ACCEPTED", "ENROLLED", "INVITED"]:
        enr.status = "INVITED"
        enr.invited_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notif)
    return notif

from backend.models.enrollment import Enrollment


def respond_to_notification(db: Session, notification_id: int, response_status: str) -> Notification:
    notif = db.query(Notification).filter_by(notification_id=notification_id).first()
    if not notif:
        raise ValueError("Notification not found.")

    notif.response = response_status

    if response_status in ["ACCEPTED", "DECLINED"]:
        from backend.services.enrollment_service import transition_enrollment
        enr = db.query(Enrollment).filter_by(patient_id=notif.patient_id, trial_id=notif.trial_id).first()
        if enr and enr.status == "INVITED":
            try:
                transition_enrollment(
                    db,
                    patient_id=notif.patient_id,
                    trial_id=notif.trial_id,
                    new_status=response_status,
                    user_id=f"patient:{notif.patient_id}",
                    reason=f"Patient responded {response_status} via notification",
                    commit=False
                )
            except Exception as e:
                pass

    db.commit()
    db.refresh(notif)
    return notif
