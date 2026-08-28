from backend.database.connection import Base

# Authentication and Identity entities
from backend.models.user import User
from backend.models.researcher import Researcher

# Core entities
from backend.models.patient import Patient, PatientVitals, PatientCondition, PatientAllergy
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion

# Operational models
from backend.models.screening import ScreeningResult
from backend.models.enrollment import Enrollment
from backend.models.waitlist import Waitlist
from backend.models.verification import Verification
from backend.models.notification import Notification
from backend.models.audit_log import AuditLog
from backend.models.otp import EmailVerification

__all__ = [
    "Base",
    "User",
    "Researcher",
    "Patient",
    "PatientVitals",
    "PatientCondition",
    "PatientAllergy",
    "Trial",
    "TrialCriterion",
    "ScreeningResult",
    "Enrollment",
    "Waitlist",
    "Verification",
    "Notification",
    "AuditLog",
    "EmailVerification"
]