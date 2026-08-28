import sys
import os
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.session import SessionLocal
from backend.database.init_auth_db import upgrade_schema, seed_auth_data
from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.patient import Patient
from backend.models.trial import Trial
from backend.models.screening import ScreeningResult
from backend.models.enrollment import Enrollment
from backend.models.notification import Notification

from backend.database.seed_data import reset_and_seed_database

client = TestClient(app)

def test_full_system_verification():
    print("=== 1. VERIFYING SEED DATA IN DATABASE ===")
    with SessionLocal() as db:
        reset_and_seed_database(db)
        
        users_count = db.query(User).count()
        researchers = db.query(Researcher).all()
        patients = db.query(Patient).all()
        trials = db.query(Trial).all()
        screenings = db.query(ScreeningResult).count()
        enrollments = db.query(Enrollment).count()
        notifications = db.query(Notification).count()
        
        print(f"Total Users: {users_count}")
        print(f"Researchers: {len(researchers)}")
        print(f"Patients: {len(patients)}")
        print(f"Trials: {len(trials)}")
        print(f"Screenings: {screenings}")
        print(f"Enrollments: {enrollments}")
        print(f"Notifications: {notifications}")
        
        assert len(researchers) == 5, f"Expected 5 researchers, got {len(researchers)}"
        assert len(patients) == 5, f"Expected 5 patients, got {len(patients)}"
        assert len(trials) == 25, f"Expected 25 trials, got {len(trials)}"
        
        for r in researchers:
            r_trials = db.query(Trial).filter_by(researcher_id=r.id).all()
            print(f"  Researcher {r.name} (id={r.id}) owns {len(r_trials)} trials: {[t.trial_id for t in r_trials]}")
            assert len(r_trials) == 5, f"Researcher {r.name} should own 5 trials, found {len(r_trials)}"

    print("\n=== 2. VERIFYING RESEARCHER AUTHENTICATION & TRIAL ISOLATION ===")
    researchers_credentials = [
        ("dr.miller@hospital.org", "Researcher@123", "Dr. Rachel Miller"),
        ("dr.chen@cardio.org", "Chen@123", "Dr. Alexander Chen"),
        ("dr.patel@oncology.org", "Patel@123", "Dr. Priya Patel"),
        ("dr.hassan@neuro.org", "Hassan@123", "Dr. Tariq Hassan"),
        ("dr.sullivan@pulm.org", "Sullivan@123", "Dr. Emma Sullivan")
    ]
    
    researcher_tokens = {}
    for email, password, expected_name in researchers_credentials:
        login_res = client.post("/auth/login", json={"email": email, "password": password})
        assert login_res.status_code == 200, f"Login failed for {email}: {login_res.text}"
        data = login_res.json()
        assert "access_token" in data
        assert data["role"] == "RESEARCHER"
        token = data["access_token"]
        researcher_tokens[email] = token
        
        # Test Session Persistence (/auth/me)
        me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200, f"/auth/me failed for {email}"
        me_data = me_res.json()
        assert me_data["email"] == email
        assert me_data["role"] == "RESEARCHER"
        assert me_data["researcher"]["name"].startswith(expected_name.split()[0])
        
        # Test /trials/my isolation
        my_trials_res = client.get("/trials/my", headers={"Authorization": f"Bearer {token}"})
        assert my_trials_res.status_code == 200
        my_trials = my_trials_res.json()
        assert len(my_trials) == 5, f"{email} should see exactly 5 trials in /trials/my, got {len(my_trials)}"
        print(f"  [PASS] {email} logged in, session restored via /auth/me, sees exactly 5 owned trials.")

    print("\n=== 3. VERIFYING PATIENT AUTHENTICATION & DATA ISOLATION ===")
    patients_credentials = [
        ("patient.smith@health.org", "Patient@123", "Johnathan Smith"),
        ("patient.chen@health.org", "Chen@123", "Maria Chen"),
        ("patient.davis@health.org", "Davis@123", "Robert Davis"),
        ("patient.martinez@health.org", "Martinez@123", "Elena Martinez"),
        ("patient.taylor@health.org", "Taylor@123", "Marcus Taylor")
    ]
    
    patient_tokens = {}
    for email, password, expected_name in patients_credentials:
        login_res = client.post("/auth/login", json={"email": email, "password": password})
        assert login_res.status_code == 200, f"Login failed for {email}: {login_res.text}"
        data = login_res.json()
        assert "access_token" in data
        assert data["role"] == "PATIENT"
        token = data["access_token"]
        patient_tokens[email] = token
        
        # Test Session Persistence (/auth/me)
        me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200, f"/auth/me failed for {email}"
        me_data = me_res.json()
        assert me_data["email"] == email
        assert me_data["role"] == "PATIENT"
        assert me_data["patient"]["name"] == expected_name
        
        # Test /patients/me
        pat_me_res = client.get("/patients/me", headers={"Authorization": f"Bearer {token}"})
        assert pat_me_res.status_code == 200
        pat_data = pat_me_res.json()
        assert pat_data["name"] == expected_name
        
        # Test /notifications/my isolation
        notif_res = client.get("/notifications/my", headers={"Authorization": f"Bearer {token}"})
        assert notif_res.status_code == 200
        notifs = notif_res.json()
        for n in notifs:
            assert n["patient_id"] == pat_data["patient_id"]
            
        # Test /trials/enrollments/my isolation
        enr_res = client.get("/trials/enrollments/my", headers={"Authorization": f"Bearer {token}"})
        assert enr_res.status_code == 200
        enrs = enr_res.json()
        for e in enrs:
            assert e["patient_id"] == pat_data["patient_id"]
            
        print(f"  [PASS] {email} logged in, profile '{expected_name}' isolated, {len(notifs)} notifs, {len(enrs)} enrollments verified.")

    print("\n=== 4. VERIFYING INVALID / EXPIRED TOKEN REJECTION ===")
    invalid_token_res = client.get("/auth/me", headers={"Authorization": "Bearer invalid_expired_jwt_token_12345"})
    assert invalid_token_res.status_code == 401, f"Expected 401 for invalid token, got {invalid_token_res.status_code}"
    print("  [PASS] Invalid token properly rejected with 401 Unauthorized.")

    print("\n=== 5. VERIFYING CROSS-ROLE & CROSS-USER PERMISSION GUARDS ===")
    # Patient cannot create a trial
    p_token = patient_tokens["patient.smith@health.org"]
    p_create_res = client.post("/trials/", json={"trial_data": {"trial_name": "Illegal"}, "criteria": []}, headers={"Authorization": f"Bearer {p_token}"})
    assert p_create_res.status_code == 403, f"Expected 403 when patient creates trial, got {p_create_res.status_code}"
    
    # Patient cannot view other patient's notifications
    other_notif_res = client.get("/notifications/P002", headers={"Authorization": f"Bearer {p_token}"})
    assert other_notif_res.status_code in [403, 404], f"Expected 403/404 for cross patient access, got {other_notif_res.status_code}"
    
    print("  [PASS] Cross-role & cross-user security checks enforced.")
    print("\nALL SYSTEM VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_system_verification()
