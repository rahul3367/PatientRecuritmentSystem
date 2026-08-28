from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.services.dashboard_service import get_dashboard_stats
from backend.schemas.dashboard_schema import DashboardStatsResponse

from sqlalchemy import func
from backend.models.patient import Patient
from backend.models.trial import Trial
from backend.models.researcher import Researcher
from backend.models.screening import ScreeningResult
from backend.models.enrollment import Enrollment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/public-stats")
def get_public_platform_stats(db: Session = Depends(get_db)):
    """Fetch live aggregate platform statistics without exposing private records."""
    registered_patients = db.query(func.count(Patient.patient_id)).scalar() or 0
    active_trials = db.query(func.count(Trial.trial_id)).scalar() or 0
    researchers = db.query(func.count(Researcher.id)).scalar() or 0
    eligibility_screenings = db.query(func.count(ScreeningResult.screening_id)).scalar() or 0
    successful_matches = db.query(func.count(Enrollment.enrollment_id)).scalar() or 0

    return {
        "registered_patients": registered_patients,
        "active_trials": active_trials,
        "researchers": researchers,
        "eligibility_screenings": eligibility_screenings,
        "successful_matches": successful_matches
    }

from typing import Optional
from backend.models.audit_log import AuditLog
from backend.api.auth_deps import get_optional_current_user
from backend.models.user import User

@router.get("/trials/{trial_id}", response_model=DashboardStatsResponse)
def get_trial_dashboard(trial_id: str, db: Session = Depends(get_db)):
    try:
        return get_dashboard_stats(db, trial_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Patients cannot view institutional audit logs."
        )
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc().nullslast()).limit(200).all()
    return [
        {
            "audit_id": log.audit_id,
            "user_id": log.user_id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "reason": log.reason,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        }
        for log in logs
    ]