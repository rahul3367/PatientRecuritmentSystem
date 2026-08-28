import sys
import os
import io
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
import random
import string

from backend.main import app

client = TestClient(app)

def random_email(prefix="res_flow"):
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{suffix}@testclinical.org"

def create_sample_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 750, text)
    c.save()
    return buffer.getvalue()

def test_trial_creation_flow_text_and_pdf():
    # 1. Register a researcher
    email = random_email()
    reg_payload = {
        "email": email,
        "password": "Password@123",
        "role": "RESEARCHER",
        "name": "Dr. Protocol Specialist",
        "organization": "CardioCare Institute",
        "designation": "Lead Investigator"
    }
    reg_res = client.post("/auth/register", json=reg_payload)
    assert reg_res.status_code in (200, 201), reg_res.text
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test PDF extraction endpoint (/trials/extract-pdf)
    sample_pdf_text = "Inclusion: Age between 18 and 65. Exclusion: Severe Hypertension."
    pdf_bytes = create_sample_pdf(sample_pdf_text)
    
    extract_res = client.post(
        "/trials/extract-pdf",
        files={"file": ("protocol.pdf", pdf_bytes, "application/pdf")},
        headers=headers
    )
    assert extract_res.status_code == 200, extract_res.text
    extracted = extract_res.json()
    assert "text" in extracted
    assert "Inclusion" in extracted["text"]

    # 3. Test Trial Creation with edited criteria
    trial_create_payload = {
        "trial_data": {
            "trial_name": "Cardiovascular Outcomes Study (CARDIO-2026)",
            "description": "PDF Protocol: Cardiovascular Outcomes Study (CARDIO-2026)",
            "source_type": "PDF",
            "target_recruitment": 150,
            "original_text": extracted["text"]
        },
        "criteria": [
            {
                "field": "age",
                "data_type": "NUMERIC",
                "classification": "HARD",
                "operator": "BETWEEN",
                "numeric_min": 18.0,
                "numeric_max": 65.0,
                "weight": None,
                "importance": 1
            },
            {
                "field": "bp_systolic",
                "data_type": "NUMERIC",
                "classification": "SOFT",
                "operator": "GAUSSIAN",
                "numeric_ideal": 120.0,
                "numeric_tolerance": 15.0,
                "weight": 1.5,
                "importance": 2
            },
            {
                "field": "conditions",
                "data_type": "CATEGORICAL",
                "classification": "HARD",
                "operator": "INCLUDES",
                "categorical_ideal": "Hypertension",
                "weight": None,
                "importance": 1
            }
        ]
    }

    create_res = client.post("/trials/", json=trial_create_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    created_trial = create_res.json()
    assert created_trial["trial_name"] == "Cardiovascular Outcomes Study (CARDIO-2026)"
    assert created_trial["target_recruitment"] == 150
    assert created_trial["source_type"] == "PDF"
    assert len(created_trial["criteria"]) == 3

    # 4. Verify trial is retrieved via /trials/my
    my_trials_res = client.get("/trials/my", headers=headers)
    assert my_trials_res.status_code == 200
    my_trials = my_trials_res.json()
    assert any(t["trial_id"] == created_trial["trial_id"] for t in my_trials)

    # 5. Verify trial criteria via /trials/{trial_id}/criteria
    criteria_res = client.get(f"/trials/{created_trial['trial_id']}/criteria", headers=headers)
    assert criteria_res.status_code == 200
    criteria_list = criteria_res.json()
    assert len(criteria_list) == 3
    fields = [c["field"] for c in criteria_list]
    assert "age" in fields
    assert "bp_systolic" in fields
    assert "conditions" in fields


def test_ai_protocol_extraction_neuro_link():
    """Verify that AI protocol extraction extracts all eligibility and exclusion criteria."""
    neuro_link_protocol = """
PROTOCOL TITLE: NEURO-LINK: Digital Cognitive Training for Mild Cognitive Impairment

ELIGIBILITY CRITERIA:

Inclusion Criteria:
1. Age 40–70
2. Subjective memory difficulties
3. Cognitive assessment consistent with mild cognitive impairment
4. Access to smartphone/tablet/computer
5. Adequate vision and hearing
6. Willingness to complete training
7. Ability to provide informed consent

Exclusion Criteria:
1. Major neurocognitive disorder exclusion
2. Major neurological disease exclusion
3. Current participation in another clinical trial exclusion
4. Recent major neurological event exclusion
5. Intensive cognitive rehabilitation exclusion
6. Uncontrolled psychiatric condition exclusion
"""

    draft_res = client.post("/trials/draft", data={"text": neuro_link_protocol})
    assert draft_res.status_code == 200, draft_res.text
    criteria = draft_res.json()
    
    # Verify that all criteria are extracted (instead of being reduced to only 2)
    assert len(criteria) >= 12, f"Expected at least 12 criteria, got {len(criteria)}"
    
    # Check that both inclusion and exclusion criteria are represented
    fields_lower = [c["field"].lower() for c in criteria]
    assert any("age" in f for f in fields_lower), "Age criterion missing"
    assert any("memory" in f for f in fields_lower), "Memory criterion missing"
    assert any("exclusion" in f or c.get("boolean_ideal") is False or c.get("operator") in ["EXCLUDES", "NOT_EQUALS", "!="] for c, f in zip(criteria, fields_lower)), "Exclusion criteria missing"

