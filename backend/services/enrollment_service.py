from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.models.enrollment import Enrollment
from backend.models.patient import Patient
from backend.models.waitlist import Waitlist
from backend.utils.audit import create_audit_log

# BUG FIX: "ENROLLED" is now reachable from None and "INVITED" too, not just
# "ACCEPTED". Reason: the DROPPED branch below auto-promotes the next WAITING
# patient straight to ENROLLED via a recursive call. That promoted patient
# may never have gone through a formal INVITED->ACCEPTED flow (e.g. they were
# waitlisted directly after screening because the trial was full at the time),
# so requiring old_status=="ACCEPTED" as the only valid predecessor would make
# the auto-promotion recursive call raise ValueError and abort the ENTIRE
# drop transaction - including the drop itself. DECLINED/DROPPED stay terminal.
VALID_TRANSITIONS = {
    None: ["INVITED", "ENROLLED"],
    "PENDING": ["INVITED"],  # kept for safety if any legacy data exists
    "INVITED": ["ACCEPTED", "DECLINED", "ENROLLED"],
    "ACCEPTED": ["ENROLLED", "DECLINED"],
    "ENROLLED": ["DROPPED"],
    "DECLINED": [],
    "DROPPED": []
}


from backend.models.trial import Trial
from backend.models.notification import Notification
from backend.models.screening import ScreeningResult


def transition_enrollment(
    db: Session, patient_id: str, trial_id: str, new_status: str,
    user_id: str, reason: str = None, commit: bool = True,
    screening_id: int = None
) -> Enrollment:
    """
    Executes a strict lifecycle transition.
    commit=True by default, but allows commit=False for atomic recursive waitlist promotions.
    """
    # 1. Look up existing enrollment
    enr = db.query(Enrollment).filter_by(patient_id=patient_id, trial_id=trial_id).first()
    old_status = enr.status if enr else None

    # 2. State-machine guardrail (allow idempotent calls)
    if new_status not in VALID_TRANSITIONS.get(old_status, []) and old_status != new_status:
        raise ValueError(f"Invalid state transition: Cannot move from {old_status} to {new_status}")

    now = datetime.now(timezone.utc)

    patient = db.query(Patient).filter_by(patient_id=patient_id).first()
    if not patient:
        raise ValueError(f"Patient {patient_id} not found.")

    if new_status == "ENROLLED":
        if patient.active_trial_id is not None and patient.active_trial_id != trial_id:
            raise ValueError(
                f"Patient {patient_id} is already actively enrolled in trial "
                f"{patient.active_trial_id}; cannot enroll in {trial_id} without dropping first."
            )

    # 3. Create or Update (Directly using valid new_status to avoid DB CheckViolations)
    if not enr:
        enr = Enrollment(patient_id=patient_id, trial_id=trial_id, status=new_status)
        db.add(enr)
        db.flush()  # Flushes safely now, and generates enr.enrollment_id for the audit log
    else:
        enr.status = new_status

    # Link qualifying screening result
    if screening_id:
        enr.screening_id = screening_id
    elif not enr.screening_id:
        latest_sc = db.query(ScreeningResult).filter_by(
            patient_id=patient_id, trial_id=trial_id
        ).order_by(ScreeningResult.screened_at.desc().nullslast()).first()
        if latest_sc:
            enr.screening_id = latest_sc.screening_id

    # 4. Handle time-stamps and side effects
    if new_status == "INVITED":
        enr.invited_at = now
        # Synchronize Notification creation for candidate
        existing_notif = db.query(Notification).filter_by(
            patient_id=patient_id, trial_id=trial_id, response="NONE"
        ).first()
        if not existing_notif:
            trial_obj = db.query(Trial).filter_by(trial_id=trial_id).first()
            trial_name = trial_obj.trial_name if trial_obj else trial_id
            new_notif = Notification(
                patient_id=patient_id,
                trial_id=trial_id,
                message=f"You have received an invitation / application confirmation for {trial_name}.",
                channel="IN_APP",
                delivery_status="SENT",
                response="NONE",
                sent_at=now
            )
            db.add(new_notif)

    elif new_status == "ACCEPTED":
        enr.accepted_at = now
        # Sync pending notifications to ACCEPTED
        db.query(Notification).filter_by(patient_id=patient_id, trial_id=trial_id, response="NONE").update(
            {"response": "ACCEPTED"}, synchronize_session=False
        )

    elif new_status == "DECLINED":
        enr.declined_at = now
        # Sync pending notifications to DECLINED
        db.query(Notification).filter_by(patient_id=patient_id, trial_id=trial_id, response="NONE").update(
            {"response": "DECLINED"}, synchronize_session=False
        )

    elif new_status == "ENROLLED":
        enr.enrolled_at = now
        patient.active_trial_id = trial_id

    elif new_status == "DROPPED":
        enr.dropped_at = now
        if patient.active_trial_id == trial_id:
            patient.active_trial_id = None

        # Auto-promote the highest WAITING candidate
        next_waitlist = db.query(Waitlist).filter_by(trial_id=trial_id, status="WAITING").order_by(Waitlist.rank.asc()).first()
        if next_waitlist:
            next_waitlist.status = "PROMOTED"
            # Pass commit=False to prevent mid-flight commits during recursion
            transition_enrollment(
                db, next_waitlist.patient_id, trial_id, "ENROLLED",
                "SYSTEM", "Auto-promoted from waitlist", commit=False
            )

    # 5. Create audit log BEFORE the final commit
    create_audit_log(
        db=db, user_id=user_id, action=f"ENROLLMENT_{new_status}",
        entity_type="Enrollment", entity_id=str(enr.enrollment_id),
        old_value=str(old_status) if old_status else "NONE", new_value=new_status, reason=reason
    )

    # 6. Top-level orchestration of the transaction
    if commit:
        db.commit()
        db.refresh(enr)
    else:
        db.flush()

    return enr