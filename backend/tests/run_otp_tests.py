import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from unittest.mock import patch, MagicMock

# Set PYTHONPATH and disable SMTP calls in test runner
os.environ["ENVIRONMENT"] = "production"

# Globally patch smtplib.SMTP so no test ever blocks on network sockets
import smtplib
mock_smtp_inst = MagicMock()
mock_smtp_inst.__enter__.return_value = mock_smtp_inst
smtplib.SMTP = MagicMock(return_value=mock_smtp_inst)

import backend.services.email_service
backend.services.email_service.send_email = MagicMock(return_value=True)
backend.services.email_service.send_otp_email = MagicMock(return_value=True)

from backend.database.session import SessionLocal
from backend.models.otp import EmailVerification
from backend.models.user import User
from backend.tests.test_email_otp import (
    test_send_otp_success_and_does_not_expose_otp,
    test_verify_correct_otp,
    test_verify_wrong_otp_increments_attempts,
    test_verify_max_attempts_exceeded,
    test_verify_expired_otp,
    test_hardcoded_123456_cannot_bypass_verification,
    test_direct_registration_without_otp_is_rejected,
    test_researcher_registration_with_verified_otp,
    test_patient_registration_with_verified_otp,
    test_resend_otp_invalidates_previous_otp
)

def run():
    tests = [
        ("Send OTP & No Secret Exposure", test_send_otp_success_and_does_not_expose_otp),
        ("Verify Correct OTP", test_verify_correct_otp),
        ("Verify Wrong OTP & Increment Attempts", test_verify_wrong_otp_increments_attempts),
        ("Verify Max 5 Attempts Exceeded", test_verify_max_attempts_exceeded),
        ("Verify Expired OTP Rejection", test_verify_expired_otp),
        ("Hardcoded 123456 Cannot Bypass Verification", test_hardcoded_123456_cannot_bypass_verification),
        ("Direct API Registration Without OTP Rejected", test_direct_registration_without_otp_is_rejected),
        ("Researcher Registration With Verified OTP", test_researcher_registration_with_verified_otp),
        ("Patient Registration With Verified OTP", test_patient_registration_with_verified_otp),
        ("Resend OTP Invalidates Old Code", test_resend_otp_invalidates_previous_otp),
    ]

    print(f"\n{'='*60}", flush=True)
    print(f"RUNNING {len(tests)} EMAIL OTP & REGISTRATION SECURITY TESTS", flush=True)
    print(f"{'='*60}\n", flush=True)

    passed = 0
    failed = 0

    import traceback
    with patch("backend.services.email_service.send_email", return_value=True):
        for name, test_fn in tests:
            db = SessionLocal()
            try:
                test_fn(db)
                print(f"  [PASS] {name}", flush=True)
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {name} - Error: {e}", flush=True)
                traceback.print_exc()
                failed += 1
            finally:
                db.close()

    print(f"\n{'='*60}", flush=True)
    print(f"SUMMARY: {passed} PASSED, {failed} FAILED (Total: {len(tests)})", flush=True)
    print(f"{'='*60}\n", flush=True)

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run()
