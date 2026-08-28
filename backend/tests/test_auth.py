from fastapi.testclient import TestClient
from backend.main import app
from backend.database.session import SessionLocal
from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.patient import Patient
from backend.utils.security import hash_password, verify_password, create_access_token

client = TestClient(app)

def test_password_hashing():
    """Verify bcrypt salt and password verification."""
    password = "SecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)

def test_login_demo_researcher():
    """Verify demo researcher login returns valid JWT and researcher profile."""
    res = client.post("/auth/login", json={
        "email": "researcher@example.com",
        "password": "Researcher@123"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "RESEARCHER"
    assert data["researcher"] is not None
    assert "Dr." in data["researcher"]["name"] or "Rachel" in data["researcher"]["name"]

def test_login_demo_patient():
    """Verify demo patient login returns valid JWT and patient profile."""
    res = client.post("/auth/login", json={
        "email": "patient@example.com",
        "password": "Patient@123"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "PATIENT"

def test_invalid_login():
    """Verify invalid credentials return 401."""
    res = client.post("/auth/login", json={
        "email": "researcher@example.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_unauthenticated_protected_route():
    """Verify missing token returns 401."""
    res = client.get("/auth/me")
    assert res.status_code == 401

def test_auth_me_researcher():
    """Verify GET /auth/me with researcher token."""
    login_res = client.post("/auth/login", json={
        "email": "researcher@example.com",
        "password": "Researcher@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["role"] == "RESEARCHER"
    assert data["researcher"] is not None

def test_auth_me_patient():
    """Verify GET /auth/me and GET /patients/me with patient token."""
    login_res = client.post("/auth/login", json={
        "email": "patient@example.com",
        "password": "Patient@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "PATIENT"

    pat_me_res = client.get("/patients/me", headers=headers)
    assert pat_me_res.status_code in [200, 404]

def test_patient_forbidden_on_researcher_actions():
    """Verify patient cannot perform researcher actions like batch upload or candidate export."""
    login_res = client.post("/auth/login", json={
        "email": "patient@example.com",
        "password": "Patient@123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Patient attempting to view candidate pool
    pool_res = client.get("/matching/trial/T001/patients", headers=headers)
    assert pool_res.status_code == 403

    # Patient attempting to view waitlist registry
    waitlist_res = client.get("/trials/T001/waitlist", headers=headers)
    assert waitlist_res.status_code == 403

    # Patient attempting candidate CSV export
    export_res = client.get("/export/trials/T001/candidates.csv", headers=headers)
    assert export_res.status_code == 403

def test_register_new_researcher():
    """Verify registration of a new researcher account."""
    import uuid
    email = f"new_res_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "SecretPassword123!",
        "role": "RESEARCHER",
        "name": "Dr. Alan Turing",
        "organization": "University Hospital",
        "designation": "Chief Scientist"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "RESEARCHER"
    assert data["researcher"]["name"] == "Dr. Alan Turing"

def test_register_new_patient_basic_only():
    """Verify registration of a new patient with only basic credentials."""
    import uuid
    email = f"new_patient_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "PatientPassword123!",
        "role": "PATIENT",
        "name": "Sarah Connor"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["role"] == "PATIENT"
    assert "access_token" in data
    assert data["name"] == "Sarah Connor"
    assert data["patient"] is not None
    assert data["patient"]["name"] == "Sarah Connor"

