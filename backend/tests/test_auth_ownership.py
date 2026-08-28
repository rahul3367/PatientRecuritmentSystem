import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
import random
import string

from backend.main import app
from backend.database.session import get_db, SessionLocal
from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.patient import Patient
from backend.models.trial import Trial

client = TestClient(app)

def random_email(prefix="user"):
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{suffix}@testclinical.org"

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200

def test_researcher_registration_and_clean_profile():
    email = random_email("res")
    payload = {
        "email": email,
        "password": "Password@123",
        "role": "RESEARCHER",
        "name": "Dr. Automated Investigator",
        "organization": "BioTech Research Labs",
        "designation": "Chief Scientist"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code in (200, 201), res.text
    data = res.json()
    assert data["role"] == "RESEARCHER"
    assert data["email"] == email
    assert data["name"] == "Dr. Automated Investigator"
    assert data["researcher"]["organization"] == "BioTech Research Labs"
    assert data["researcher"]["designation"] == "Chief Scientist"

    # Verify researcher sees empty trials list initially
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    trials_res = client.get("/trials/my", headers=headers)
    assert trials_res.status_code == 200
    assert trials_res.json() == []

def test_patient_registration_and_clean_profile():
    email = random_email("pat")
    payload = {
        "email": email,
        "password": "Password@123",
        "role": "PATIENT",
        "name": "Bob Test Participant"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code in (200, 201), res.text
    data = res.json()
    assert data["role"] == "PATIENT"
    assert data["email"] == email
    assert data["name"] == "Bob Test Participant"
    assert data["patient"]["patient_id"].startswith("P")

    # Verify patient sees only their own profile
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/patients/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["name"] == "Bob Test Participant"
    assert me_data["patient_id"] == data["patient"]["patient_id"]

    # Verify patient has 0 notifications initially
    notifs_res = client.get("/notifications/my", headers=headers)
    assert notifs_res.status_code == 200
    assert notifs_res.json() == []

    # Verify patient has 0 enrollments initially
    enr_res = client.get("/trials/enrollments/my", headers=headers)
    assert enr_res.status_code == 200
    assert enr_res.json() == []

def test_strict_researcher_data_isolation():
    # 1. Register Researcher A
    email_a = random_email("res_a")
    res_a_raw = client.post("/auth/register", json={
        "email": email_a, "password": "Password@123", "role": "RESEARCHER", "name": "Researcher Alpha"
    })
    assert res_a_raw.status_code in (200, 201)
    res_a = res_a_raw.json()
    token_a = res_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Researcher B
    email_b = random_email("res_b")
    res_b_raw = client.post("/auth/register", json={
        "email": email_b, "password": "Password@123", "role": "RESEARCHER", "name": "Researcher Beta"
    })
    assert res_b_raw.status_code in (200, 201)
    res_b = res_b_raw.json()
    token_b = res_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Researcher A creates Trial A1
    create_payload_a = {
        "trial_data": {
            "trial_name": "Study Alpha 1",
            "description": "Alpha Trial Protocol",
            "target_recruitment": 20
        },
        "criteria": [
            {
                "field": "age",
                "data_type": "NUMERIC",
                "classification": "HARD",
                "operator": "BETWEEN",
                "numeric_min": 18,
                "numeric_max": 65,
                "weight": 1.0
            }
        ]
    }
    trial_a_res = client.post("/trials/", json=create_payload_a, headers=headers_a)
    assert trial_a_res.status_code in (200, 201), trial_a_res.text
    trial_a_id = trial_a_res.json()["trial_id"]

    # 4. Researcher B creates Trial B1
    create_payload_b = {
        "trial_data": {
            "trial_name": "Study Beta 1",
            "description": "Beta Trial Protocol",
            "target_recruitment": 30
        },
        "criteria": [
            {
                "field": "age",
                "data_type": "NUMERIC",
                "classification": "HARD",
                "operator": "BETWEEN",
                "numeric_min": 25,
                "numeric_max": 75,
                "weight": 1.0
            }
        ]
    }
    trial_b_res = client.post("/trials/", json=create_payload_b, headers=headers_b)
    assert trial_b_res.status_code in (200, 201), trial_b_res.text
    trial_b_id = trial_b_res.json()["trial_id"]

    # 5. Researcher A queries /trials/my -> MUST contain only Trial A1
    my_trials_a = client.get("/trials/my", headers=headers_a).json()
    a_ids = [t["trial_id"] for t in my_trials_a]
    assert trial_a_id in a_ids
    assert trial_b_id not in a_ids

    # 6. Researcher B queries /trials/my -> MUST contain only Trial B1
    my_trials_b = client.get("/trials/my", headers=headers_b).json()
    b_ids = [t["trial_id"] for t in my_trials_b]
    assert trial_b_id in b_ids
    assert trial_a_id not in b_ids

    # 7. Researcher B attempts to modify Trial A1 -> MUST BE REJECTED (403 Forbidden)
    update_res = client.put(f"/trials/{trial_a_id}", json={"trial_name": "Hacked Title"}, headers=headers_b)
    assert update_res.status_code == 403

def test_strict_patient_data_isolation():
    # 1. Register Patient A
    pat_a_raw = client.post("/auth/register", json={
        "email": random_email("pat_a"), "password": "Password@123", "role": "PATIENT", "name": "Patient Alpha"
    })
    assert pat_a_raw.status_code in (200, 201)
    pat_a = pat_a_raw.json()
    token_a = pat_a["access_token"]
    pid_a = pat_a["patient"]["patient_id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register Patient B
    pat_b_raw = client.post("/auth/register", json={
        "email": random_email("pat_b"), "password": "Password@123", "role": "PATIENT", "name": "Patient Beta"
    })
    assert pat_b_raw.status_code in (200, 201)
    pat_b = pat_b_raw.json()
    token_b = pat_b["access_token"]
    pid_b = pat_b["patient"]["patient_id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Patient A cannot access Patient B's details via /patients/{pid_b}
    view_res = client.get(f"/patients/{pid_b}", headers=headers_a)
    assert view_res.status_code == 403

    # 4. Patient A cannot update Patient B's details
    update_res = client.put(f"/patients/{pid_b}", json={"name": "Hacked Name"}, headers=headers_a)
    assert update_res.status_code == 403

    # 5. Patient cannot access researcher-only routes (e.g. creating trials)
    trial_create = client.post("/trials/", json={"trial_data": {"trial_name": "Forbidden"}, "criteria": []}, headers=headers_a)
    assert trial_create.status_code == 403

def test_demo_accounts_functional():
    # 1. Demo Researcher Login
    res_login = client.post("/auth/login", json={"email": "researcher@example.com", "password": "Researcher@123"})
    assert res_login.status_code == 200
    res_data = res_login.json()
    assert res_data["role"] == "RESEARCHER"
    
    res_token = res_data["access_token"]
    res_headers = {"Authorization": f"Bearer {res_token}"}
    my_trials = client.get("/trials/my", headers=res_headers).json()
    assert len(my_trials) >= 1  # Demo trial assigned

    # 2. Demo Patient Login
    pat_login = client.post("/auth/login", json={"email": "patient@example.com", "password": "Patient@123"})
    assert pat_login.status_code == 200
    pat_data = pat_login.json()
    assert pat_data["role"] == "PATIENT"

    pat_token = pat_data["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}
    pat_profile = client.get("/patients/me", headers=pat_headers).json()
    assert pat_profile["patient_id"] is not None

if __name__ == "__main__":
    print("Running test_health_check...")
    test_health_check()
    print("[PASS] Health check passed")

    print("Running test_researcher_registration_and_clean_profile...")
    test_researcher_registration_and_clean_profile()
    print("[PASS] Researcher registration and clean profile passed")

    print("Running test_patient_registration_and_clean_profile...")
    test_patient_registration_and_clean_profile()
    print("[PASS] Patient registration and clean profile passed")

    print("Running test_strict_researcher_data_isolation...")
    test_strict_researcher_data_isolation()
    print("[PASS] Strict researcher data isolation passed")

    print("Running test_strict_patient_data_isolation...")
    test_strict_patient_data_isolation()
    print("[PASS] Strict patient data isolation passed")

    print("Running test_demo_accounts_functional...")
    test_demo_accounts_functional()
    print("[PASS] Demo accounts functionality passed")

    print("\nALL AUTHENTICATION, AUTHORIZATION & DATA OWNERSHIP TESTS PASSED SUCCESSFULLY!")
