import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
import random
import string
from backend.main import app

client = TestClient(app)

def test_regression_suite():
    print("1. Testing AI Criteria Rules Confirmation & Validation...")
    # Login as demo researcher
    res_login = client.post("/auth/login", json={"email": "researcher@example.com", "password": "Researcher@123"}).json()
    token = res_login["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch demo trials
    trials = client.get("/trials/my", headers=headers).json()
    assert len(trials) > 0
    trial_id = trials[0]["trial_id"]
    print(f"   Using trial {trial_id}")

    # Confirm criteria rules endpoint
    confirm_res = client.post(
        f"/trials/{trial_id}/confirm-criteria",
        json={
            "trial_data": {
                "trial_name": trials[0]["trial_name"],
                "description": trials[0].get("description", "Phase 2 Trial"),
                "target_recruitment": trials[0].get("target_recruitment", 50)
            },
            "criteria": [
                {
                    "field": "age",
                    "data_type": "NUMERIC",
                    "classification": "HARD",
                    "operator": "BETWEEN",
                    "numeric_min": 18,
                    "numeric_max": 75,
                    "weight": 1.0,
                    "rationale": "Safety criteria"
                },
                {
                    "field": "blood_pressure_systolic",
                    "data_type": "NUMERIC",
                    "classification": "SOFT",
                    "operator": "NEAR",
                    "numeric_ideal": 120,
                    "numeric_tolerance": 20,
                    "weight": 0.8,
                    "rationale": "Controlled hypertension"
                }
            ]
        },
        headers=headers
    )
    if confirm_res.status_code != 200:
        print("Confirm failed:", confirm_res.status_code, confirm_res.text)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "OPEN"
    print("   [PASS] Criteria confirmation passed")

    print("2. Testing Matching Engine & Candidate Evaluation...")
    match_res = client.get(f"/matching/trial/{trial_id}/patients", headers=headers)
    assert match_res.status_code == 200, match_res.text
    candidates = match_res.json()
    assert isinstance(candidates, list)
    print(f"   [PASS] Matching engine returned {len(candidates)} candidates evaluated")

    print("3. Testing Screening & Override Logs...")
    if len(candidates) > 0:
        cand = candidates[0]
        # Perform official screening via /matching/screen/
        screen_res = client.post(
            "/matching/screen/",
            json={"patient_id": cand["patient_id"], "trial_id": trial_id},
            headers=headers
        )
        assert screen_res.status_code in (200, 201), screen_res.text
        screen_data = screen_res.json()["data"]
        screening_id = screen_data["screening_id"]
        print(f"   [PASS] Screening recorded: #{screening_id}")

        # Clinician verification
        verif_res = client.post(
            f"/verification/{screening_id}/verify",
            json={"remarks": "Clinician manual verification complete."},
            headers=headers
        )
        assert verif_res.status_code in (200, 201), verif_res.text
        print("   [PASS] Screening verification passed")

        # Clinician override
        override_res = client.post(
            f"/verification/{screening_id}/override",
            json={"override_verdict": "APPROVED", "remarks": "Protocol boundary check confirmed"},
            headers=headers
        )
        assert override_res.status_code in (200, 201), override_res.text
        print("   [PASS] Screening override audit log passed")

    print("4. Testing Patient Study Matching & Invitations...")
    pat_login = client.post("/auth/login", json={"email": "patient@example.com", "password": "Patient@123"}).json()
    pat_token = pat_login["access_token"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # Patient personalized match view
    my_matches = client.get("/matching/my/trials", headers=pat_headers)
    assert my_matches.status_code == 200
    print(f"   [PASS] Patient personalized study matches returned: {len(my_matches.json())} studies")

    # Patient enrollments
    my_enr = client.get("/trials/enrollments/my", headers=pat_headers)
    assert my_enr.status_code == 200
    print(f"   [PASS] Patient enrollments returned: {len(my_enr.json())} records")

    print("\nALL SYSTEM & REGRESSION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_regression_suite()
