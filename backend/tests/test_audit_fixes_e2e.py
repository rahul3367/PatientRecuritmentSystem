import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.session import SessionLocal
from backend.models.user import User
from backend.models.patient import Patient, PatientVitals
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.models.screening import ScreeningResult
from backend.models.verification import Verification
from backend.models.enrollment import Enrollment
from backend.models.waitlist import Waitlist
from backend.models.notification import Notification
from backend.utils.security import create_access_token

client = TestClient(app)


def test_most_important_scenario_dynamic_eligibility_persistence_and_consistency():
    """
    Scenario:
    1. Create a trial with a HARD criterion (HbA1c between 4.0 and 7.5).
    2. Create a patient who initially does not have HbA1c recorded.
    3. Patient checks dynamic eligibility supplying HbA1c = 6.2.
    4. Expected: APPROVED.
    5. Verify HbA1c is persisted in PostgreSQL patient record.
    6. Researcher screens the same patient from backend/database.
    7. Expected: APPROVED (Consistent results between patient and researcher!).
    """
    uid_str = uuid.uuid4().hex[:6].upper()
    trial_id = f"T_AUDIT_{uid_str}"
    patient_id = f"P_AUDIT_{uid_str}"

    with SessionLocal() as db:
        # Create user
        user = User(email=f"pat_{uid_str.lower()}@health.org", password_hash="hash", role="PATIENT", is_active=True)
        db.add(user)
        db.flush()

        # Create test trial
        trial = Trial(
            trial_id=trial_id,
            trial_name=f"Glycemic Study {uid_str}",
            status="OPEN",
            target_recruitment=10
        )
        db.add(trial)
        db.flush()

        # Hard criterion: HbA1c between 4.0 and 7.5
        crit = TrialCriterion(
            trial_id=trial.trial_id,
            field="hba1c",
            data_type="NUMERIC",
            classification="HARD",
            operator="BETWEEN",
            numeric_min=4.0,
            numeric_max=7.5
        )
        db.add(crit)

        # Create patient without vitals
        patient = Patient(
            patient_id=patient_id,
            user_id=user.id,
            name=f"John Audit {uid_str}",
            gender="Male",
            consent=True
        )
        db.add(patient)
        db.commit()
        user_id = user.id

    # Patient auth token
    patient_token = create_access_token({"sub": str(user_id), "role": "PATIENT"})

    # Patient dynamic eligibility check with HbA1c = 6.2
    headers = {"Authorization": f"Bearer {patient_token}"}
    res = client.post(
        f"/matching/trial/{trial_id}/check-eligibility",
        json={"form_inputs": {"hba1c": 6.2}},
        headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["eligible"] is True
    assert data["verdict"] == "APPROVED"
    assert data["match_percentage"] == 100.0

    # Verify patient profile in database now contains HbA1c = 6.2
    with SessionLocal() as db:
        pat_db = db.query(Patient).filter_by(patient_id=patient_id).first()
        assert len(pat_db.vitals) > 0
        assert pat_db.vitals[0].hba1c == 6.2

    # Researcher screens the patient using standard backend screening endpoint
    researcher_token = create_access_token({"sub": "1", "role": "RESEARCHER"})
    r_headers = {"Authorization": f"Bearer {researcher_token}"}
    r_res = client.post(
        "/matching/screen/",
        json={"patient_id": patient_id, "trial_id": trial_id},
        headers=r_headers
    )
    assert r_res.status_code == 200, r_res.text
    r_data = r_res.json()["data"]
    assert r_data["eligible"] is True
    assert r_data["verdict"] == "APPROVED"
    assert r_data["match_percentage"] == 100.0


def test_verification_and_override_persistence():
    """Verify verify and override routes persist state to PostgreSQL and audit trail."""
    uid_str = uuid.uuid4().hex[:6].upper()
    trial_id = f"T_VERIF_{uid_str}"
    patient_id = f"P_VERIF_{uid_str}"

    with SessionLocal() as db:
        trial = Trial(trial_id=trial_id, trial_name="Verif Trial", status="OPEN")
        db.add(trial)
        patient = Patient(patient_id=patient_id, name="Verif Patient", consent=True)
        db.add(patient)
        db.commit()

    researcher_token = create_access_token({"sub": "1", "role": "RESEARCHER"})
    r_headers = {"Authorization": f"Bearer {researcher_token}"}

    # Screen patient to get screening_id
    r_res = client.post(
        "/matching/screen/",
        json={"patient_id": patient_id, "trial_id": trial_id},
        headers=r_headers
    )
    screening_id = r_res.json()["data"]["screening_id"]

    # Clinician verifies screening
    v_res = client.post(
        f"/verification/{screening_id}/verify",
        json={"remarks": "Clinically reviewed and confirmed"},
        headers=r_headers
    )
    assert v_res.status_code == 200

    # Clinician overrides verdict to NEEDS_REVIEW
    o_res = client.post(
        f"/verification/{screening_id}/override",
        json={"override_verdict": "NEEDS_REVIEW", "remarks": "Requires second lab sample verification"},
        headers=r_headers
    )
    assert o_res.status_code == 200

    # Verify GET /verification/ returns the record
    get_v_res = client.get("/verification/", headers=r_headers)
    assert get_v_res.status_code == 200
    verifs = get_v_res.json()
    assert any(v["screening_id"] == screening_id for v in verifs)

    # Verify DB screening verdict updated
    with SessionLocal() as db:
        sc = db.query(ScreeningResult).filter_by(screening_id=screening_id).first()
        assert sc.verdict == "NEEDS_REVIEW"


def test_application_eligibility_guard_and_screening_linkage():
    """Verify patient cannot apply if ineligible and application is linked to screening."""
    uid_str = uuid.uuid4().hex[:6].upper()
    trial_id = f"T_APP_{uid_str}"

    with SessionLocal() as db:
        trial = Trial(trial_id=trial_id, trial_name="App Trial", status="OPEN")
        db.add(trial)

        # 1. Ineligible patient
        user_ineligible = User(email=f"ineligible_{uid_str.lower()}@health.org", password_hash="hash", role="PATIENT", is_active=True)
        db.add(user_ineligible)
        db.flush()

        pat_ineligible = Patient(patient_id=f"P_INELIG_{uid_str}", user_id=user_ineligible.id, name="Ineligible Pat", consent=True)
        db.add(pat_ineligible)
        failed_sc = ScreeningResult(
            patient_id=pat_ineligible.patient_id,
            trial_id=trial_id,
            match_percentage=0.0,
            verdict="REJECTED",
            eligible=False
        )
        db.add(failed_sc)

        # 2. Eligible patient
        user_eligible = User(email=f"eligible_{uid_str.lower()}@health.org", password_hash="hash", role="PATIENT", is_active=True)
        db.add(user_eligible)
        db.flush()

        pat_eligible = Patient(patient_id=f"P_ELIG_{uid_str}", user_id=user_eligible.id, name="Eligible Pat", consent=True)
        db.add(pat_eligible)
        passed_sc = ScreeningResult(
            patient_id=pat_eligible.patient_id,
            trial_id=trial_id,
            match_percentage=95.0,
            verdict="APPROVED",
            eligible=True
        )
        db.add(passed_sc)
        db.commit()

        ineligible_uid = user_ineligible.id
        eligible_uid = user_eligible.id
        passed_sc_id = passed_sc.screening_id

    # Ineligible application fails with 400
    ineligible_token = create_access_token({"sub": str(ineligible_uid), "role": "PATIENT"})
    res = client.post(
        f"/trials/{trial_id}/apply",
        headers={"Authorization": f"Bearer {ineligible_token}"}
    )
    assert res.status_code == 400

    # Eligible patient applies
    patient_token = create_access_token({"sub": str(eligible_uid), "role": "PATIENT"})
    app_res = client.post(
        f"/trials/{trial_id}/apply",
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["status"] == "INVITED"
    assert app_data["screening_id"] == passed_sc_id

    # Duplicate apply returns existing enrollment as INVITED without flipping to ACCEPTED
    dup_res = client.post(
        f"/trials/{trial_id}/apply",
        headers={"Authorization": f"Bearer {patient_token}"}
    )
    assert dup_res.status_code == 200
    assert dup_res.json()["status"] == "INVITED"


def test_waitlist_and_auto_promotion_lifecycle():
    """Verify waitlist persistence and auto-promotion on participant drop."""
    uid_str = uuid.uuid4().hex[:6].upper()
    trial_id = f"T_WAIT_{uid_str}"
    patient_active_id = f"P_ACT_{uid_str}"
    patient_wait_id = f"P_WAIT_{uid_str}"

    with SessionLocal() as db:
        trial = Trial(trial_id=trial_id, trial_name="Waitlist Study", status="OPEN")
        db.add(trial)
        pat_active = Patient(patient_id=patient_active_id, name="Active Participant", consent=True)
        db.add(pat_active)
        pat_wait = Patient(patient_id=patient_wait_id, name="Waiting Participant", consent=True)
        db.add(pat_wait)
        db.commit()

    researcher_token = create_access_token({"sub": "1", "role": "RESEARCHER"})
    r_headers = {"Authorization": f"Bearer {researcher_token}"}

    # Add waitlist candidate
    w_res = client.post(
        f"/trials/{trial_id}/waitlist",
        json={"patient_id": patient_wait_id, "match_percentage": 92.0},
        headers=r_headers
    )
    assert w_res.status_code == 200
    assert w_res.json()["status"] == "WAITING"

    # Enroll active patient
    client.post(f"/trials/{trial_id}/enroll/{patient_active_id}", headers=r_headers)

    # Drop active patient
    drop_res = client.post(f"/trials/{trial_id}/drop/{patient_active_id}", headers=r_headers)
    assert drop_res.status_code == 200

    # Verify waitlist candidate was automatically promoted to ENROLLED
    with SessionLocal() as db:
        promoted_enr = db.query(Enrollment).filter_by(patient_id=patient_wait_id, trial_id=trial_id).first()
        assert promoted_enr is not None
        assert promoted_enr.status == "ENROLLED"


def test_audit_logs_retrieval():
    """Verify GET /dashboard/audit-logs retrieves institutional audit logs."""
    researcher_token = create_access_token({"sub": "1", "role": "RESEARCHER"})
    res = client.get("/dashboard/audit-logs", headers={"Authorization": f"Bearer {researcher_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    assert "action" in logs[0]
    assert "timestamp" in logs[0]
