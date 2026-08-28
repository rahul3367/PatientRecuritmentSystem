import pytest
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.database.session import get_db
from backend.models.user import User
from backend.models.otp import EmailVerification
from backend.models.researcher import Researcher
from backend.models.patient import Patient

client = TestClient(app)

def random_email(prefix="user"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture(autouse=True)
def mock_email():
    with patch("backend.services.email_service.send_email", return_value=True) as m:
        yield m

@pytest.fixture
def db_session():
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

def test_send_otp_success_and_does_not_expose_otp(db_session: Session):
    """POST /auth/send-otp must succeed, hash OTP in DB, and never expose raw OTP in response."""
    test_email = random_email("send_test")

    mock_send_email = MagicMock(return_value=True)
    with patch("backend.services.auth_service.send_otp_email", mock_send_email), patch("backend.services.email_service.send_otp_email", mock_send_email):
        res = client.post("/auth/send-otp", json={"email": test_email})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["email"] == test_email
        assert data["expires_in_seconds"] == 600

        # CRITICAL: Raw OTP MUST NOT be in API response
        assert "otp" not in data
        assert "otp_code" not in data
        assert "demo_code" not in data

        # Verify DB record exists and is hashed
        ev = db_session.query(EmailVerification).filter_by(email=test_email).first()
        assert ev is not None
        assert ev.is_verified is False
        assert len(ev.otp_hash) == 64  # SHA-256 hex string
        assert ev.attempts == 0

        # Verify send_otp_email was dispatched with 6-digit string
        mock_send_email.assert_called_once()
        call_kwargs = mock_send_email.call_args.kwargs
        assert call_kwargs["to_email"] == test_email
        assert len(call_kwargs["otp_code"]) == 6
        assert call_kwargs["otp_code"].isdigit()

def test_verify_correct_otp(db_session: Session):
    """POST /auth/verify-otp must succeed when correct code is submitted."""
    test_email = random_email("verify_test")
    raw_otp = "849201"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    res = client.post("/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["email"] == test_email

    # DB record must now be verified
    db_session.refresh(ev)
    assert ev.is_verified is True

def test_verify_wrong_otp_increments_attempts(db_session: Session):
    """Wrong OTP must fail and increment attempt counter."""
    test_email = random_email("wrong_test")
    raw_otp = "999888"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    res = client.post("/auth/verify-otp", json={"email": test_email, "otp": "111222"})
    assert res.status_code == 400
    assert "Invalid verification code" in res.json()["detail"]

    db_session.refresh(ev)
    assert ev.attempts == 1
    assert ev.is_verified is False

def test_verify_max_attempts_exceeded(db_session: Session):
    """Exceeding 5 attempts must lock the OTP verification."""
    test_email = random_email("max_att_test")
    raw_otp = "123456"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=5,  # Already at max attempts
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    res = client.post("/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
    assert res.status_code == 400
    assert "Maximum verification attempts exceeded" in res.json()["detail"]

def test_verify_expired_otp(db_session: Session):
    """Expired OTP must be rejected."""
    test_email = random_email("exp_test")
    raw_otp = "654321"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=10),  # Expired
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    res = client.post("/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

def test_hardcoded_123456_cannot_bypass_verification(db_session: Session):
    """Arbitrary hardcoded demo code '123456' must NOT bypass verification."""
    test_email = random_email("bypass_test")
    real_otp = "777888"
    otp_hash = hashlib.sha256(real_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    # Submitting "123456" instead of "777888"
    res = client.post("/auth/verify-otp", json={"email": test_email, "otp": "123456"})
    assert res.status_code == 400
    assert "Invalid verification code" in res.json()["detail"]

def test_direct_registration_without_otp_is_rejected(db_session: Session):
    """Directly calling POST /auth/register without verified email must be strictly rejected."""
    test_email = random_email("unverified_reg")

    res = client.post("/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "role": "RESEARCHER",
        "name": "Dr. Hacker"
    })
    assert res.status_code == 400
    assert "Email address has not been verified" in res.json()["detail"]

    # Verify no User was created
    user = db_session.query(User).filter_by(email=test_email).first()
    assert user is None

def test_researcher_registration_with_verified_otp(db_session: Session):
    """Researcher registration succeeds after verifying OTP, and consumes verification record."""
    test_email = random_email("res_otp_ok")
    raw_otp = "445566"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    # 1. Verify OTP
    v_res = client.post("/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
    assert v_res.status_code == 200

    # 2. Register Researcher
    reg_res = client.post("/auth/register", json={
        "email": test_email,
        "password": "ResearcherPass123!",
        "role": "RESEARCHER",
        "name": "Dr. Alice Smith",
        "organization": "BioResearch Institute"
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["role"] == "RESEARCHER"
    assert data["name"] == "Dr. Alice Smith"

    # 3. Verification record must be consumed (prevent reuse)
    ev_after = db_session.query(EmailVerification).filter_by(email=test_email).first()
    assert ev_after is None

def test_patient_registration_with_verified_otp(db_session: Session):
    """Patient registration succeeds after verifying OTP."""
    test_email = random_email("pat_otp_ok")
    raw_otp = "332211"
    otp_hash = hashlib.sha256(raw_otp.encode("utf-8")).hexdigest()

    ev = EmailVerification(
        email=test_email,
        otp_hash=otp_hash,
        attempts=0,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        is_verified=False
    )
    db_session.add(ev)
    db_session.commit()

    # 1. Verify OTP
    v_res = client.post("/auth/verify-otp", json={"email": test_email, "otp": raw_otp})
    assert v_res.status_code == 200

    # 2. Register Patient
    reg_res = client.post("/auth/register", json={
        "email": test_email,
        "password": "PatientPass123!",
        "role": "PATIENT",
        "name": "Bob Patient",
        "gender": "Male",
        "dob": "1988-04-12",
        "consent": True
    })
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["role"] == "PATIENT"
    assert data["name"] == "Bob Patient"
    assert data["profile_id"].startswith("P")

def test_resend_otp_invalidates_previous_otp(db_session: Session):
    """Resending OTP replaces previous OTP code and hash."""
    test_email = random_email("resend_test")

    mock_send = MagicMock(return_value=True)
    with patch("backend.services.auth_service.send_otp_email", mock_send), patch("backend.services.email_service.send_otp_email", mock_send):
        # 1. Send first OTP
        res1 = client.post("/auth/send-otp", json={"email": test_email})
        assert res1.status_code == 200
        first_otp = mock_send.call_args_list[0].kwargs["otp_code"]

        # Simulate 31 seconds passing to bypass cooldown
        ev1 = db_session.query(EmailVerification).filter_by(email=test_email).first()
        ev1.created_at = datetime.now(timezone.utc) - timedelta(seconds=35)
        db_session.commit()

        # 2. Resend OTP
        res2 = client.post("/auth/send-otp", json={"email": test_email})
        assert res2.status_code == 200
        second_otp = mock_send.call_args_list[1].kwargs["otp_code"]

        # 3. Old OTP must fail
        old_verify = client.post("/auth/verify-otp", json={"email": test_email, "otp": first_otp})
        if first_otp != second_otp:
            assert old_verify.status_code == 400

        # 4. New OTP must succeed
        new_verify = client.post("/auth/verify-otp", json={"email": test_email, "otp": second_otp})
        assert new_verify.status_code == 200
