import uuid
from datetime import date
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.session import SessionLocal
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.models.patient import Patient

client = TestClient(app)

def test_single_source_matching_consistency_e2e():
    """
    Test End-to-End single source of truth:
    1. Patient registers with full health info, vitals, conditions, allergies.
    2. Patient profile is fetched from PostgreSQL.
    3. Researcher creates a trial with specific HARD and SOFT criteria.
    4. Patient checks eligibility -> gets score and verdict.
    5. Patient applies (persisted screening) -> gets SAME score and verdict.
    6. Researcher fetches candidate pool -> gets SAME score and verdict.
    """
    # 1. Register a new researcher
    res_email = f"res_{uuid.uuid4().hex[:8]}@example.com"
    res_reg = client.post("/auth/register", json={
        "email": res_email,
        "password": "Password123!",
        "role": "RESEARCHER",
        "name": "Dr. Sarah Connor",
        "organization": "BioTech Research",
        "designation": "Principal Investigator"
    })
    assert res_reg.status_code == 201
    res_token = res_reg.json()["access_token"]
    res_headers = {"Authorization": f"Bearer {res_token}"}

    # 2. Researcher creates a trial with criteria
    trial_id = f"TRIAL_{uuid.uuid4().hex[:6].upper()}"
    db = SessionLocal()
    try:
        new_trial = Trial(
            trial_id=trial_id,
            trial_name="Phase II Diabetes & Hypertension Study",
            description="Testing novel GLP-1 and ACE inhibitor combination.",
            status="OPEN",
            target_recruitment=50
        )
        db.add(new_trial)
        db.flush()

        # Hard criteria: age 18-65, conditions includes Diabetes, smoking == False
        c1 = TrialCriterion(
            trial_id=trial_id,
            field="age",
            data_type="NUMERIC",
            classification="HARD",
            operator="BETWEEN",
            numeric_min=18.0,
            numeric_max=65.0
        )
        c2 = TrialCriterion(
            trial_id=trial_id,
            field="conditions",
            data_type="CATEGORICAL",
            classification="HARD",
            operator="INCLUDES",
            categorical_ideal="Diabetes"
        )
        c3 = TrialCriterion(
            trial_id=trial_id,
            field="smoking",
            data_type="BOOLEAN",
            classification="HARD",
            operator="EQUALS",
            boolean_ideal=False
        )
        # Soft criteria: bmi ideal 24 tolerance 4 weight 1.0; hba1c ideal 6.5 tolerance 1.5 weight 1.0
        c4 = TrialCriterion(
            trial_id=trial_id,
            field="bmi",
            data_type="NUMERIC",
            classification="SOFT",
            operator="EQUALS",
            numeric_ideal=24.0,
            numeric_tolerance=4.0,
            weight=1.0
        )
        c5 = TrialCriterion(
            trial_id=trial_id,
            field="hba1c",
            data_type="NUMERIC",
            classification="SOFT",
            operator="EQUALS",
            numeric_ideal=6.5,
            numeric_tolerance=1.5,
            weight=1.0
        )
        db.add_all([c1, c2, c3, c4, c5])
        db.commit()
    finally:
        db.close()

    # 3. Patient registers with full health info matching the trial perfectly
    pat_email = f"pat_{uuid.uuid4().hex[:8]}@example.com"
    pat_reg = client.post("/auth/register", json={
        "email": pat_email,
        "password": "Password123!",
        "role": "PATIENT",
        "name": "Alex Mercer",
        "gender": "Male",
        "dob": "1990-05-15",
        "location": "Boston, MA",
        "phone": "+1-555-0199",
        "blood_group": "O+",
        "smoking": False,
        "alcohol": False,
        "previous_surgery": "None",
        "consent": True,
        "vitals": {
            "bp_systolic": 120,
            "bp_diastolic": 80,
            "heart_rate": 72,
            "bmi": 24.0,
            "hba1c": 6.5,
            "blood_glucose": 100
        },
        "conditions": [{"condition_name": "Diabetes"}, {"condition_name": "Mild Hypertension"}],
        "allergies": [{"allergen": "Pollen"}]
    })
    assert pat_reg.status_code == 201
    pat_data = pat_reg.json()
    pat_token = pat_data["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    patient_id = pat_data["patient"]["patient_id"]

    # 4. Verify patient profile stored in PostgreSQL via GET /patients/me
    me_res = client.get("/patients/me", headers=pat_headers)
    assert me_res.status_code == 200
    saved_profile = me_res.json()
    assert saved_profile["patient_id"] == patient_id
    assert saved_profile["smoking"] is False
    assert len(saved_profile["conditions"]) == 2
    assert len(saved_profile["vitals"]) == 1
    assert saved_profile["vitals"][0]["bmi"] == 24.0

    # 5. Patient checks eligibility via POST /matching/trial/{trial_id}/check-eligibility
    check_res = client.post(f"/matching/trial/{trial_id}/check-eligibility", headers=pat_headers, json={"form_inputs": {}})
    assert check_res.status_code == 200
    check_data = check_res.json()["data"]
    assert check_data["eligible"] is True
    assert check_data["verdict"] == "APPROVED"
    assert check_data["match_percentage"] == 100.0
    expected_score = check_data["match_percentage"]
    expected_verdict = check_data["verdict"]

    # 6. Patient applies to trial via POST /trials/{trial_id}/apply
    apply_res = client.post(f"/trials/{trial_id}/apply", headers=pat_headers)
    assert apply_res.status_code == 200

    # 7. Researcher performs official clinician screening verification via POST /matching/screen/
    screen_res = client.post("/matching/screen/", headers=res_headers, json={
        "patient_id": patient_id,
        "trial_id": trial_id
    })
    assert screen_res.status_code == 200
    screen_data = screen_res.json()["data"]
    assert screen_data["eligible"] is True
    assert screen_data["match_percentage"] == expected_score
    assert screen_data["verdict"] == expected_verdict

    # 8. Researcher opens candidate list via GET /matching/trial/{trial_id}/patients
    cand_res = client.get(f"/matching/trial/{trial_id}/patients", headers=res_headers)
    assert cand_res.status_code == 200
    candidates = cand_res.json()
    
    # Find our patient
    our_cand = next((c for c in candidates if c["patient_id"] == patient_id), None)
    assert our_cand is not None, f"Patient {patient_id} not found in candidate pool: {candidates}"
    assert our_cand["match_percentage"] == expected_score
    assert our_cand["verdict"] == expected_verdict
    assert our_cand["eligible"] is True
