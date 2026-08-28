import pytest
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.database.session import SessionLocal

client = TestClient(app)

def test_patient_onboarding_and_put_me():
    test_email = f"patient_{uuid.uuid4().hex[:8]}@example.com"
    # 1. Register a fresh patient
    reg_resp = client.post("/auth/register", json={
        "email": test_email,
        "password": "Password@123",
        "name": "Sarah Connor",
        "role": "PATIENT"
    })
    assert reg_resp.status_code in [200, 201], reg_resp.text
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check profile initially incomplete
    me_resp = client.get("/patients/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["is_profile_complete"] is False

    # 3. Update profile via PUT /patients/me
    update_payload = {
        "gender": "Female",
        "dob": "1990-05-15",
        "location": "Boston, MA",
        "phone": "+1 555-0199",
        "blood_group": "O+",
        "smoking": False,
        "alcohol": False,
        "previous_surgery": "None",
        "vitals": {
            "bp_systolic": 118,
            "bp_diastolic": 76,
            "heart_rate": 70,
            "bmi": 22.4,
            "hba1c": 5.4
        },
        "conditions": [
            {"condition_name": "Mild Asthma"}
        ],
        "allergies": [
            {"allergen": "Penicillin"}
        ]
    }
    put_resp = client.put("/patients/me", json=update_payload, headers=headers)
    assert put_resp.status_code == 200, put_resp.text
    put_data = put_resp.json()
    assert put_data["gender"] == "Female"
    assert put_data["dob"] == "1990-05-15"
    assert put_data["is_profile_complete"] is True
    assert len(put_data["vitals"]) > 0
    assert len(put_data["conditions"]) == 1
    assert put_data["conditions"][0]["condition_name"] == "Mild Asthma"

def test_patient_registration_full_flow_with_consent_and_edit():
    # 1. Registration fails if consent is False
    test_email = f"patient_{uuid.uuid4().hex[:8]}@example.com"
    fail_reg = client.post("/auth/register", json={
        "email": test_email,
        "password": "Password@123",
        "name": "Jane Doe",
        "role": "PATIENT",
        "dob": "1992-04-12",
        "gender": "Female",
        "consent": False
    })
    assert fail_reg.status_code == 400
    assert "consent is required" in fail_reg.text.lower()

    # 2. Registration succeeds with full health profile and consent=True
    succ_reg = client.post("/auth/register", json={
        "email": test_email,
        "password": "Password@123",
        "name": "Jane Doe",
        "role": "PATIENT",
        "dob": "1992-04-12",
        "gender": "Female",
        "location": "New York, NY",
        "phone": "+1 (555) 123-4567",
        "blood_group": "A+",
        "smoking": False,
        "alcohol": True,
        "previous_surgery": "Appendectomy (2018)",
        "consent": True,
        "vitals": {
            "bp_systolic": 115,
            "bp_diastolic": 75,
            "heart_rate": 68,
            "bmi": 21.8,
            "hba1c": 5.2,
            "blood_glucose": 92
        },
        "conditions": [{"condition_name": "Seasonal Allergies"}],
        "allergies": [{"allergen": "Pollen"}, {"allergen": "Dust"}]
    })
    assert succ_reg.status_code == 201
    reg_data = succ_reg.json()
    token = reg_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    patient_id = reg_data["patient"]["patient_id"]
    assert reg_data["patient"]["consent"] is True

    # 3. Fetch from GET /patients/me (My Health Profile)
    me_resp = client.get("/patients/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["patient_id"] == patient_id
    assert me_data["name"] == "Jane Doe"
    assert me_data["dob"] == "1992-04-12"
    assert me_data["location"] == "New York, NY"
    assert me_data["phone"] == "+1 (555) 123-4567"
    assert me_data["blood_group"] == "A+"
    assert me_data["smoking"] is False
    assert me_data["alcohol"] is True
    assert me_data["previous_surgery"] == "Appendectomy (2018)"
    assert me_data["consent"] is True
    assert len(me_data["vitals"]) == 1
    assert me_data["vitals"][0]["heart_rate"] == 68
    assert me_data["vitals"][0]["blood_glucose"] == 92.0
    assert len(me_data["conditions"]) == 1
    assert len(me_data["allergies"]) == 2

    # 4. Edit My Health Profile via PUT /patients/me
    update_resp = client.put("/patients/me", headers=headers, json={
        "name": "Jane Doe Updated",
        "dob": "1992-04-12",
        "gender": "Female",
        "location": "Brooklyn, NY",
        "phone": "+1 (555) 999-8888",
        "blood_group": "A+",
        "smoking": False,
        "alcohol": False,
        "previous_surgery": "Appendectomy (2018), Tonsillectomy (2020)",
        "consent": True,
        "vitals": {
            "bp_systolic": 118,
            "bp_diastolic": 78,
            "heart_rate": 72,
            "bmi": 22.1,
            "hba1c": 5.3,
            "blood_glucose": 94
        },
        "conditions": [{"condition_name": "Seasonal Allergies"}, {"condition_name": "Mild Asthma"}],
        "allergies": [{"allergen": "Pollen"}, {"allergen": "Dust"}, {"allergen": "Latex"}]
    })
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["location"] == "Brooklyn, NY"
    assert updated_data["phone"] == "+1 (555) 999-8888"
    assert updated_data["alcohol"] is False
    assert len(updated_data["conditions"]) == 2
    assert len(updated_data["allergies"]) == 3

    # 5. Re-fetch from GET /patients/me to verify persistence
    refetch_resp = client.get("/patients/me", headers=headers)
    assert refetch_resp.status_code == 200
    persisted = refetch_resp.json()
    assert persisted["location"] == "Brooklyn, NY"
    assert persisted["phone"] == "+1 (555) 999-8888"
    assert persisted["alcohol"] is False
    assert persisted["previous_surgery"] == "Appendectomy (2018), Tonsillectomy (2020)"
    assert len(persisted["conditions"]) == 2
    assert len(persisted["allergies"]) == 3
    assert persisted["vitals"][-1]["bmi"] == 22.1

def test_dynamic_eligibility_and_apply_flow():
    # 1. Register fresh patient with Asthma
    test_email = f"patient_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = client.post("/auth/register", json={
        "email": test_email,
        "password": "Password@123",
        "name": "David Miller",
        "role": "PATIENT"
    })
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    client.put("/patients/me", json={
        "gender": "Male",
        "dob": "1995-02-10",
        "smoking": False,
        "alcohol": False,
        "vitals": {"bp_systolic": 120, "bmi": 23.0},
        "conditions": [{"condition_name": "Mild Asthma"}]
    }, headers=headers)

    # 2. Setup a distinct trial with unique criteria
    tid = f"T_{uuid.uuid4().hex[:6].upper()}"
    db = SessionLocal()
    trial = Trial(
        trial_id=tid,
        trial_name="Targeted Asthma Study",
        description="Clinical evaluation for mild asthma patients aged 20-50",
        status="OPEN",
        target_recruitment=20
    )
    db.add(trial)
    db.flush()

    # Hard criteria: Age 20-50, Conditions includes Mild Asthma, Smoking = false
    c1 = TrialCriterion(
        trial_id=tid,
        field="age",
        data_type="NUMERIC",
        classification="HARD",
        operator="BETWEEN",
        numeric_min=20.0,
        numeric_max=50.0
    )
    c2 = TrialCriterion(
        trial_id=tid,
        field="conditions",
        data_type="CATEGORICAL",
        classification="HARD",
        operator="INCLUDES",
        categorical_ideal="Mild Asthma"
    )
    c3 = TrialCriterion(
        trial_id=tid,
        field="smoking",
        data_type="BOOLEAN",
        classification="HARD",
        operator="EQUALS",
        boolean_ideal=False
    )
    db.add_all([c1, c2, c3])
    db.commit()
    db.close()

    # 3. Check trial criteria endpoint
    crit_resp = client.get(f"/trials/{tid}/criteria")
    assert crit_resp.status_code == 200
    criteria_list = crit_resp.json()
    assert len(criteria_list) == 3

    # 4. Check dynamic eligibility (Patient has age ~31, conditions=["Mild Asthma"], smoking=False)
    check_resp = client.post(f"/matching/trial/{tid}/check-eligibility", json={"form_inputs": {}}, headers=headers)
    assert check_resp.status_code == 200, check_resp.text
    result = check_resp.json()["data"]
    assert result["eligible"] is True
    assert result["can_apply"] is True

    # 5. Apply to the trial
    apply_resp = client.post(f"/trials/{tid}/apply", json={}, headers=headers)
    assert apply_resp.status_code == 200, apply_resp.text
    app_data = apply_resp.json()
    assert app_data["trial_id"] == tid
    assert app_data["status"] in ["INVITED", "ACCEPTED"]

    # 6. Verify in patient's enrollments
    my_enroll_resp = client.get("/trials/enrollments/my", headers=headers)
    assert my_enroll_resp.status_code == 200
    my_enrollments = my_enroll_resp.json()
    assert any(e["trial_id"] == tid for e in my_enrollments)

def test_trial_filtering_and_criteria_independence():
    # Verify filtering
    resp = client.get("/trials/?status=OPEN")
    assert resp.status_code == 200
    trials = resp.json()
    assert isinstance(trials, list)
    assert all(t["status"] == "OPEN" for t in trials)
