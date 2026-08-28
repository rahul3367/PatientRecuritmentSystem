from typing import List, Optional
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import text
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.schemas.trial_schema import TrialCreate
from backend.schemas.criterion_schema import CriterionCreate
from backend.services.llm_service import extract_criteria
from backend.services.email_service import send_new_trial_broadcast

def create_draft(text: str) -> List[CriterionCreate]:
    """
    AI Path: Parses text into criteria but DOES NOT save to database.
    """
    return extract_criteria(text)

def confirm_criteria(
    db: Session, 
    trial_data: TrialCreate, 
    criteria: List[CriterionCreate], 
    provided_trial_id: str = None,
    researcher_id: int = None,
    background_tasks: Optional[BackgroundTasks] = None
) -> Trial:
    """
    Manual/Review Path: Commits the Trial and its Criteria to the database.
    Accepts an optional provided_trial_id to support confirming an in-progress draft route,
    and optional researcher_id for ownership.
    Dispatches IN_APP notifications and secondary non-blocking EMAIL notifications.
    """
    # If the route passes an ID, use it. Otherwise mint a new sequential one.
    if provided_trial_id:
        trial_id = provided_trial_id
    else:
        all_t_ids = [t[0] for t in db.query(Trial.trial_id).all() if t[0] and t[0].startswith("T") and t[0][1:].isdigit()]
        if not all_t_ids:
            trial_id = "T001"
        else:
            max_num = max(int(tid[1:]) for tid in all_t_ids)
            trial_id = f"T{max_num + 1:03d}"
                
    effective_researcher_id = researcher_id or trial_data.researcher_id

    existing_trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if existing_trial:
        db_trial = existing_trial
        db_trial.trial_name = trial_data.trial_name
        db_trial.description = trial_data.description
        if trial_data.source_type:
            db_trial.source_type = trial_data.source_type
        if trial_data.original_text:
            db_trial.original_text = trial_data.original_text
        if trial_data.target_recruitment is not None:
            db_trial.target_recruitment = trial_data.target_recruitment
        if effective_researcher_id:
            db_trial.researcher_id = effective_researcher_id
        db_trial.status = "OPEN"
        db.query(TrialCriterion).filter_by(trial_id=trial_id).delete()
    else:
        db_trial = Trial(
            trial_id=trial_id,
            trial_name=trial_data.trial_name,
            description=trial_data.description,
            source_type=trial_data.source_type,
            target_recruitment=trial_data.target_recruitment,
            original_text=trial_data.original_text,
            researcher_id=effective_researcher_id,
            status="OPEN"  # Correct status vocabulary
        )
        db.add(db_trial)
    
    for crit in criteria:
        db.add(TrialCriterion(trial_id=trial_id, **crit.model_dump()))
        
    db.commit()
    db.refresh(db_trial)

    # Automatically notify active registered patients of the newly published trial
    email_recipients = []
    try:
        from backend.models.patient import Patient
        from backend.models.notification import Notification
        from datetime import datetime, timezone

        patients = db.query(Patient).all()
        for p in patients:
            existing_notif = db.query(Notification).filter_by(patient_id=p.patient_id, trial_id=trial_id).first()
            if not existing_notif:
                notif = Notification(
                    patient_id=p.patient_id,
                    trial_id=trial_id,
                    message=f"New Clinical Trial Available: '{db_trial.trial_name}'. Check whether you are eligible.",
                    channel="IN_APP",
                    delivery_status="SENT",
                    response="NONE",
                    sent_at=datetime.now(timezone.utc)
                )
                db.add(notif)
                
                # Check for linked registered user email for secondary email notification
                if p.user and p.user.email and p.user.email.strip():
                    email_recipients.append({"email": p.user.email.strip(), "name": p.name})

        db.commit()
    except Exception as e:
        # Don't fail trial creation if notification dispatch encounters an error
        pass

    # Dispatch non-blocking email notifications to eligible new recipients
    if email_recipients:
        try:
            if background_tasks:
                background_tasks.add_task(
                    send_new_trial_broadcast,
                    recipients=email_recipients,
                    trial_name=db_trial.trial_name,
                    trial_id=db_trial.trial_id,
                    trial_description=db_trial.description
                )
            else:
                send_new_trial_broadcast(
                    recipients=email_recipients,
                    trial_name=db_trial.trial_name,
                    trial_id=db_trial.trial_id,
                    trial_description=db_trial.description
                )
        except Exception as e:
            # Email delivery failure must NEVER rollback or affect trial creation
            pass
    
    return db_trial