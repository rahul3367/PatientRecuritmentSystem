import pytest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from backend.main import app
from backend.database.session import get_db
from backend.models.user import User
from backend.models.patient import Patient
from backend.models.notification import Notification
from backend.models.trial import Trial
from backend.config import settings
from backend.services.email_service import (
    render_new_trial_template,
    send_new_trial_email,
    send_new_trial_broadcast,
    send_email
)
from backend.services.trial_service import confirm_criteria
from backend.schemas.trial_schema import TrialCreate
from backend.schemas.criterion_schema import CriterionCreate

client = TestClient(app)

def random_email(prefix="pat"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def test_render_new_trial_template_content_and_no_action_buttons():
    """Verify that email template contains expected details and NO status-changing action buttons."""
    trial_name = "GLP-1 Weight Management Study"
    trial_id = "T999"
    patient_name = "Jane Doe"
    description = "A 24-week clinical trial evaluating metabolic outcomes."

    rendered_html = render_new_trial_template(
        patient_name=patient_name,
        trial_name=trial_name,
        trial_id=trial_id,
        trial_description=description
    )

    # 1. Verify required informational content
    assert patient_name in rendered_html
    assert trial_name in rendered_html
    assert trial_id in rendered_html
    assert description in rendered_html
    assert "Please log in to your AegisTrial Patient Portal to review the trial." in rendered_html
    assert "AegisTrial Clinical Research Team" in rendered_html

    # 2. Verify strict absence of action buttons/links
    lowered_html = rendered_html.lower()
    assert "accept" not in lowered_html
    assert "decline" not in lowered_html
    assert "apply" not in lowered_html
    assert "href=\"/trials/" not in lowered_html
    assert "action=" not in lowered_html

def test_email_disabled_skips_smtp():
    """When EMAIL_ENABLED=False, send_email must return False and not attempt SMTP."""
    with patch("backend.services.email_service.settings.EMAIL_ENABLED", False):
        with patch("smtplib.SMTP") as mock_smtp:
            result = send_email("test@example.com", "Test Subject", "<p>Hello</p>")
            assert result is False
            mock_smtp.assert_not_called()

def test_email_enabled_dispatches_smtp_successfully():
    """When EMAIL_ENABLED=True, send_email attempts TLS SMTP connection."""
    with patch("backend.services.email_service.settings.EMAIL_ENABLED", True):
        with patch("backend.services.email_service.settings.SMTP_HOST", "smtp.gmail.com"):
            with patch("backend.services.email_service.settings.SMTP_PORT", 587):
                with patch("backend.services.email_service.settings.SMTP_USERNAME", "testuser@gmail.com"):
                    with patch("backend.services.email_service.settings.SMTP_PASSWORD", "secretpass"):
                        with patch("smtplib.SMTP") as mock_smtp:
                            mock_instance = MagicMock()
                            mock_smtp.return_value.__enter__.return_value = mock_instance

                            result = send_new_trial_email(
                                to_email="patient@example.com",
                                patient_name="John Doe",
                                trial_name="Cardio Study Alpha",
                                trial_id="T888",
                                trial_description="Cardiovascular safety study."
                            )

                            assert result is True
                            mock_instance.starttls.assert_called_once()
                            mock_instance.login.assert_called_once_with("testuser@gmail.com", "secretpass")
                            mock_instance.sendmail.assert_called_once()

def test_email_failure_is_caught_and_does_not_raise():
    """SMTP connection errors are safely caught and return False without throwing exceptions."""
    with patch("backend.services.email_service.settings.EMAIL_ENABLED", True):
        with patch("smtplib.SMTP", side_effect=Exception("SMTP Connection Timeout")):
            result = send_email("patient@example.com", "Test", "<p>Body</p>")
            assert result is False

def test_new_trial_creation_with_email_notification_flow(db_session: Session):
    """End-to-end test of confirm_criteria dispatching in-app notifications and email broadcast."""
    # 1. Create registered patient with User.email
    pat_email = random_email("pat_email_test")
    user = User(email=pat_email, password_hash="hash", role="PATIENT", is_active=True)
    db_session.add(user)
    db_session.flush()

    pid = f"P{uuid.uuid4().hex[:6]}"
    patient_with_user = Patient(
        patient_id=pid,
        user_id=user.id,
        name="Registered Patient",
        consent=True
    )
    db_session.add(patient_with_user)

    # 2. Create offline patient without User.email
    offline_pid = f"P{uuid.uuid4().hex[:6]}"
    offline_patient = Patient(
        patient_id=offline_pid,
        user_id=None,
        name="Offline Registry Patient",
        consent=True
    )
    db_session.add(offline_patient)
    db_session.commit()

    # 3. Create new trial via confirm_criteria with EMAIL_ENABLED=True
    trial_data = TrialCreate(
        trial_name="Neuro Link Phase II",
        description="Investigating neural biomarkers in cognitive health.",
        target_recruitment=25,
        source_type="MANUAL"
    )
    criteria = [
        CriterionCreate(
            field="age",
            data_type="NUMERIC",
            classification="HARD",
            operator="BETWEEN",
            numeric_min=18.0,
            numeric_max=65.0
        )
    ]

    mock_send = MagicMock(return_value=True)
    with patch("backend.services.email_service.send_new_trial_email", mock_send):
        with patch("backend.services.email_service.settings.EMAIL_ENABLED", True):
            new_trial = confirm_criteria(db_session, trial_data, criteria)

            assert new_trial.trial_id.startswith("T")
            assert new_trial.trial_name == "Neuro Link Phase II"

            # 4. Verify IN_APP notifications were created for BOTH patients
            notif_with_user = db_session.query(Notification).filter_by(
                patient_id=patient_with_user.patient_id,
                trial_id=new_trial.trial_id
            ).first()
            assert notif_with_user is not None
            assert notif_with_user.channel == "IN_APP"
            assert "Neuro Link Phase II" in notif_with_user.message

            notif_offline = db_session.query(Notification).filter_by(
                patient_id=offline_patient.patient_id,
                trial_id=new_trial.trial_id
            ).first()
            assert notif_offline is not None

            # 5. Verify email was sent to patient WITH email, but NOT offline patient
            called_emails = [call.kwargs.get("to_email") for call in mock_send.call_args_list]
            assert pat_email in called_emails

            # 6. Verify duplicate prevention: calling confirm_criteria again must NOT re-send email
            mock_send.reset_mock()
            confirm_criteria(db_session, trial_data, criteria, provided_trial_id=new_trial.trial_id)
            assert mock_send.call_count == 0
