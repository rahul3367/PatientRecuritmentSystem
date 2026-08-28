from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.patient import Patient, PatientVitals, PatientCondition, PatientAllergy
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.models.screening import ScreeningResult
from backend.models.enrollment import Enrollment
from backend.models.notification import Notification
from backend.models.audit_log import AuditLog
from backend.utils.security import hash_password

logger = logging.getLogger(__name__)

def reset_and_seed_database(db: Session):
    """Cleanly resets the database and seeds the exact 5 researchers, 25 trials, 5 patients, and records."""
    from backend.models.trial_criterion import TrialCriterion
    from backend.models.verification import Verification
    from backend.models.waitlist import Waitlist
    
    db.query(Verification).delete()
    db.query(Notification).delete()
    db.query(Enrollment).delete()
    db.query(Waitlist).delete()
    db.query(ScreeningResult).delete()
    db.query(TrialCriterion).delete()
    db.query(Patient).update({"active_trial_id": None})
    db.flush()
    db.query(Trial).delete()
    db.query(PatientAllergy).delete()
    db.query(PatientCondition).delete()
    db.query(PatientVitals).delete()
    db.query(Patient).delete()
    db.query(Researcher).delete()
    db.query(AuditLog).delete()
    db.query(User).delete()
    db.commit()
    seed_complete_database(db)

def seed_complete_database(db: Session):
    """
    Populate realistic clinical trial recruitment seed data:
    - 5 Distinct Researchers with clinical specializations
    - 25 Clinical Trials (5 trials per researcher)
    - Complete Hard and Soft Trial Criteria rules
    - 5 Registered Patients with complete health profiles (vitals, conditions, allergies)
    - Realistic Screenings, Enrollments, and In-App Notifications
    Idempotent: Running multiple times will safely update or skip existing records.
    """
    now = datetime.now(timezone.utc)

    # =========================================================================
    # 1. SEED 5 RESEARCHERS
    # =========================================================================
    researchers_data = [
        {
            "email": "researcher@example.com",
            "alt_email": "dr.miller@hospital.org",
            "password": "Researcher@123",
            "name": "Dr. Rachel Miller, MD",
            "organization": "Johns Hopkins Clinical Research Center",
            "designation": "Director of Endocrinology Trials",
            "specialization": "Endocrinology & Metabolic Disorders",
            "contact": "+1 (555) 234-5678"
        },
        {
            "email": "dr.chen@cardio.org",
            "password": "Chen@123",
            "name": "Dr. Alexander Chen, MD, FACC",
            "organization": "Massachusetts General Heart Center",
            "designation": "Principal Investigator of Cardiology",
            "specialization": "Cardiovascular Medicine & Hypertension",
            "contact": "+1 (555) 345-6789"
        },
        {
            "email": "dr.patel@oncology.org",
            "password": "Patel@123",
            "name": "Dr. Priya Patel, MD, PhD",
            "organization": "Memorial Sloan Kettering Cancer Institute",
            "designation": "Senior Clinical Oncologist",
            "specialization": "Thoracic & Medical Oncology",
            "contact": "+1 (555) 456-7890"
        },
        {
            "email": "dr.hassan@neuro.org",
            "password": "Hassan@123",
            "name": "Dr. Tariq Hassan, MD",
            "organization": "Mayo Clinic Neuroscience Center",
            "designation": "Chief of Neurotherapeutics",
            "specialization": "Neurology & Neurodegenerative Diseases",
            "contact": "+1 (555) 567-8901"
        },
        {
            "email": "dr.sullivan@pulm.org",
            "password": "Sullivan@123",
            "name": "Dr. Emma Sullivan, MD, FCCP",
            "organization": "Cleveland Clinic Respiratory Institute",
            "designation": "Director of Pulmonary Clinical Trials",
            "specialization": "Pulmonology & Critical Care",
            "contact": "+1 (555) 678-9012"
        }
    ]

    researcher_records = []
    for r_info in researchers_data:
        user = db.query(User).filter_by(email=r_info["email"]).first()
        if not user:
            user = User(
                email=r_info["email"],
                password_hash=hash_password(r_info["password"]),
                role="RESEARCHER",
                is_active=True
            )
            db.add(user)
            db.flush()

        if "alt_email" in r_info and r_info["alt_email"]:
            alt_user = db.query(User).filter_by(email=r_info["alt_email"]).first()
            if not alt_user:
                alt_user = User(
                    email=r_info["alt_email"],
                    password_hash=hash_password(r_info["password"]),
                    role="RESEARCHER",
                    is_active=True
                )
                db.add(alt_user)
                db.flush()

        res_profile = db.query(Researcher).filter_by(user_id=user.id).first()
        if not res_profile:
            res_profile = Researcher(
                user_id=user.id,
                name=r_info["name"],
                organization=r_info["organization"],
                designation=r_info["designation"],
                specialization=r_info["specialization"],
                contact=r_info["contact"]
            )
            db.add(res_profile)
            db.flush()
        else:
            res_profile.name = r_info["name"]
            res_profile.organization = r_info["organization"]
            res_profile.designation = r_info["designation"]
            res_profile.specialization = r_info["specialization"]
            res_profile.contact = r_info["contact"]

        researcher_records.append(res_profile)

    # =========================================================================
    # 2. SEED 25 TRIALS (5 PER RESEARCHER) WITH CRITERIA RULES
    # =========================================================================
    trials_data = [
        # Researcher 1: Dr. Rachel Miller (Endocrinology)
        {
            "res_idx": 0,
            "trial_id": "T001",
            "trial_name": "Glycemic Control & SGLT2 Inhibitor Efficacy in Type 2 Diabetes",
            "description": "A multicenter phase III study evaluating glycemic stability, beta-cell preservation, and HbA1c reduction with novel SGLT2 co-administration in adult T2D patients.",
            "target_recruitment": 60,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Type 2 Diabetes", "weight": 1.0},
                {"field": "hba1c", "data_type": "NUMERIC", "classification": "SOFT", "operator": "GAUSSIAN", "numeric_ideal": 7.0, "numeric_tolerance": 1.5, "weight": 1.5},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 90.0, "numeric_max": 155.0, "weight": 1.0},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.8}
            ]
        },
        {
            "res_idx": 0,
            "trial_id": "T002",
            "trial_name": "Long-term GLP-1 Receptor Agonist Cardiovascular & Renal Safety",
            "description": "Prospective randomized trial evaluating long-term renal outcomes and cardiovascular event reduction with weekly GLP-1 therapy.",
            "target_recruitment": 80,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 40.0, "numeric_max": 78.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Type 2 Diabetes", "weight": 1.0},
                {"field": "bmi", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 25.0, "numeric_max": 42.0, "weight": 1.0},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.8}
            ]
        },
        {
            "res_idx": 0,
            "trial_id": "T003",
            "trial_name": "Continuous Glucose Monitoring in Early Pre-Diabetes Intervention",
            "description": "Investigating real-time telemetry glucose bio-feedback and dietary modulation in individuals with borderline fasting dysglycemia.",
            "target_recruitment": 40,
            "status": "RECRUITING",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 25.0, "numeric_max": 65.0, "weight": 1.0},
                {"field": "hba1c", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 5.6, "numeric_max": 6.5, "weight": 1.2},
                {"field": "bmi", "data_type": "NUMERIC", "classification": "SOFT", "operator": "GAUSSIAN", "numeric_ideal": 27.0, "numeric_tolerance": 4.0, "weight": 1.0}
            ]
        },
        {
            "res_idx": 0,
            "trial_id": "T004",
            "trial_name": "Metabolic Syndrome Lifestyle & Metformin Dual Therapy Protocol",
            "description": "Comparative evaluation of intensive structured physical activity combined with low-dose metformin for visceral adiposity reduction.",
            "target_recruitment": 50,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 30.0, "numeric_max": 65.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 120.0, "numeric_max": 160.0, "weight": 1.0},
                {"field": "bmi", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 27.0, "numeric_max": 38.0, "weight": 1.0}
            ]
        },
        {
            "res_idx": 0,
            "trial_id": "T005",
            "trial_name": "Insulin Resistance & Pancreatic Beta-Cell Function Preservation",
            "description": "Evaluating cellular longevity markers and insulin sensitivity restoration in patients with early metabolic decompensation.",
            "target_recruitment": 35,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 60.0, "weight": 1.0},
                {"field": "hba1c", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 6.5, "numeric_max": 9.5, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Type 2 Diabetes", "weight": 1.0}
            ]
        },

        # Researcher 2: Dr. Alexander Chen (Cardiology)
        {
            "res_idx": 1,
            "trial_id": "T006",
            "trial_name": "Dual ARB-CCB Fixed-Dose Combination in Stage 2 Essential Hypertension",
            "description": "Double-blind superiority trial comparing fixed-dose dual vasodilator therapy against standard stepped-care monotherapy.",
            "target_recruitment": 75,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 30.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 135.0, "numeric_max": 180.0, "weight": 1.5},
                {"field": "bp_diastolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 85.0, "numeric_max": 115.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Hypertension", "weight": 1.0}
            ]
        },
        {
            "res_idx": 1,
            "trial_id": "T007",
            "trial_name": "SGLT2 Inhibitors in Heart Failure with Preserved Ejection Fraction (HFpEF)",
            "description": "Assessment of exercise capacity and quality of life enhancement following 24 weeks of empagliflozin in stable HFpEF cohort.",
            "target_recruitment": 90,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 45.0, "numeric_max": 82.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 100.0, "numeric_max": 160.0, "weight": 1.0},
                {"field": "bmi", "data_type": "NUMERIC", "classification": "SOFT", "operator": "GAUSSIAN", "numeric_ideal": 26.0, "numeric_tolerance": 4.0, "weight": 1.0}
            ]
        },
        {
            "res_idx": 1,
            "trial_id": "T008",
            "trial_name": "Catheter-Based Renal Denervation in Refractory Hypertension",
            "description": "Pivotal randomized sham-controlled trial of sympathetic radiofrequency ablation in uncontrolled hypertensive adults.",
            "target_recruitment": 30,
            "status": "RECRUITING",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 35.0, "numeric_max": 70.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 145.0, "numeric_max": 195.0, "weight": 1.5},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "HARD", "operator": "EQUALS", "boolean_ideal": False, "weight": 1.0}
            ]
        },
        {
            "res_idx": 1,
            "trial_id": "T009",
            "trial_name": "Atherosclerotic Plaque Regression with High-Intensity Statin & PCSK9i",
            "description": "Coronary intravascular ultrasound trial tracking atheroma volume change during aggressive lipid lowering in high-risk patients.",
            "target_recruitment": 60,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 40.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Hyperlipidemia", "weight": 1.0},
                {"field": "bmi", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 19.0, "numeric_max": 36.0, "weight": 1.0}
            ]
        },
        {
            "res_idx": 1,
            "trial_id": "T010",
            "trial_name": "Direct Oral Anticoagulation in Non-Valvular Atrial Fibrillation",
            "description": "Evaluating thromboembolic prevention and bleeding safety profile with factor Xa inhibitor in ambulatory patients.",
            "target_recruitment": 85,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 50.0, "numeric_max": 85.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 100.0, "numeric_max": 155.0, "weight": 1.0},
                {"field": "alcohol", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.8}
            ]
        },

        # Researcher 3: Dr. Priya Patel (Oncology)
        {
            "res_idx": 2,
            "trial_id": "T011",
            "trial_name": "Targeted Tyrosine Kinase Inhibitor in EGFR-Mutant Non-Small Cell Lung Cancer",
            "description": "Phase II open-label study investigating third-generation EGFR-TKI progression-free survival in advanced NSCLC.",
            "target_recruitment": 45,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 80.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Lung Cancer", "weight": 1.5},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.9}
            ]
        },
        {
            "res_idx": 2,
            "trial_id": "T012",
            "trial_name": "Dual Checkpoint Immunotherapy (PD-1 + CTLA-4) in Refractory Solid Tumors",
            "description": "Assessing objective response rates and immune-related adverse events of combination checkpoint blockade in refractory oncology.",
            "target_recruitment": 50,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 90.0, "numeric_max": 150.0, "weight": 1.0}
            ]
        },
        {
            "res_idx": 2,
            "trial_id": "T013",
            "trial_name": "PARP Inhibitor Maintenance in BRCA-Mutated Carcinoma",
            "description": "Evaluating maintenance olaparib efficacy following platinum-based chemotherapy response.",
            "target_recruitment": 30,
            "status": "RECRUITING",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 21.0, "numeric_max": 72.0, "weight": 1.0},
                {"field": "gender", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "EQUALS", "categorical_ideal": "Female", "weight": 1.0}
            ]
        },
        {
            "res_idx": 2,
            "trial_id": "T014",
            "trial_name": "Neoadjuvant Chemo-Immunotherapy in Resectable Stage II-III Melanoma",
            "description": "Preoperative pembrolizumab with targeted chemotherapy to induce pathological complete response prior to surgical excision.",
            "target_recruitment": 40,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Melanoma", "weight": 1.0}
            ]
        },
        {
            "res_idx": 2,
            "trial_id": "T015",
            "trial_name": "Cell-Free Circulating DNA Monitoring for Early Minimal Residual Disease",
            "description": "Validation of next-generation liquid biopsy ctDNA surveillance in postsurgical surveillance protocols.",
            "target_recruitment": 100,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 85.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 90.0, "numeric_max": 160.0, "weight": 1.0}
            ]
        },

        # Researcher 4: Dr. Tariq Hassan (Neurology)
        {
            "res_idx": 3,
            "trial_id": "T016",
            "trial_name": "Monoclonal Anti-Amyloid Antibody in Early Alzheimer's & Mild Cognitive Impairment",
            "description": "Phase III study evaluating reduction of amyloid plaque burden and slowing of cognitive decline over 76 weeks.",
            "target_recruitment": 50,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 55.0, "numeric_max": 85.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Cognitive Impairment", "weight": 1.5},
                {"field": "alcohol", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.8}
            ]
        },
        {
            "res_idx": 3,
            "trial_id": "T017",
            "trial_name": "Neuroprotective Dopamine Agonist in Early Parkinson's Disease",
            "description": "Assessing motor symptom stabilization and nigrostriatal dopaminergic preservation in newly diagnosed de novo PD.",
            "target_recruitment": 40,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 40.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Parkinson", "weight": 1.0}
            ]
        },
        {
            "res_idx": 3,
            "trial_id": "T018",
            "trial_name": "Calcitonin Gene-Related Peptide (CGRP) Antagonist in Chronic Migraine",
            "description": "Monthly subcutaneous monoclonal antibody for monthly migraine day reduction in treatment-refractory patients.",
            "target_recruitment": 65,
            "status": "RECRUITING",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 65.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Migraine", "weight": 1.0},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "SOFT", "operator": "EQUALS", "boolean_ideal": False, "weight": 0.8}
            ]
        },
        {
            "res_idx": 3,
            "trial_id": "T019",
            "trial_name": "S1P Receptor Modulator in Relapsing-Remitting Multiple Sclerosis",
            "description": "Evaluating annualized relapse rates and brain atrophy reduction on serial MRI neuroimaging.",
            "target_recruitment": 55,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 55.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Multiple Sclerosis", "weight": 1.0}
            ]
        },
        {
            "res_idx": 3,
            "trial_id": "T020",
            "trial_name": "Non-Invasive Vagus Nerve Stimulation in Refractory Focal Epilepsy",
            "description": "Transcutaneous cervical neuro-modulation as adjunctive non-pharmacologic seizure frequency reduction therapy.",
            "target_recruitment": 35,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 65.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Epilepsy", "weight": 1.0}
            ]
        },

        # Researcher 5: Dr. Emma Sullivan (Pulmonology)
        {
            "res_idx": 4,
            "trial_id": "T021",
            "trial_name": "Biologic Anti-IL-5 Therapy in Severe Eosinophilic Asthma",
            "description": "Targeted anti-interleukin-5 monoclonal antibody reducing exacerbations and oral corticosteroid dependence in severe asthma.",
            "target_recruitment": 45,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 70.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Asthma", "weight": 1.5},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "HARD", "operator": "EQUALS", "boolean_ideal": False, "weight": 1.0}
            ]
        },
        {
            "res_idx": 4,
            "trial_id": "T022",
            "trial_name": "Triple Inhaler Inhaled Corticosteroid / Dual Bronchodilator in Advanced COPD",
            "description": "Comparing single-inhaler triple therapy against dual LABA/LAMA on lung function trajectory and symptom scores.",
            "target_recruitment": 70,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 40.0, "numeric_max": 80.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "COPD", "weight": 1.0}
            ]
        },
        {
            "res_idx": 4,
            "trial_id": "T023",
            "trial_name": "Antifibrotic Monotherapy in Idiopathic Pulmonary Fibrosis (IPF)",
            "description": "Evaluating preservation of forced vital capacity (FVC) with novel tyrosine kinase antifibrotic inhibitor in progressive IPF.",
            "target_recruitment": 30,
            "status": "RECRUITING",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 45.0, "numeric_max": 80.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Pulmonary Fibrosis", "weight": 1.0},
                {"field": "smoking", "data_type": "BOOLEAN", "classification": "HARD", "operator": "EQUALS", "boolean_ideal": False, "weight": 1.0}
            ]
        },
        {
            "res_idx": 4,
            "trial_id": "T024",
            "trial_name": "Targeted Biologic for Chronic Rhinosinusitis with Nasal Polyps",
            "description": "Efficacy of interleukin-4/13 receptor antagonist in reducing polyp size and restoring olfactory sensation.",
            "target_recruitment": 40,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 18.0, "numeric_max": 65.0, "weight": 1.0},
                {"field": "conditions", "data_type": "CATEGORICAL", "classification": "HARD", "operator": "INCLUDES", "categorical_ideal": "Rhinitis", "weight": 1.0}
            ]
        },
        {
            "res_idx": 4,
            "trial_id": "T025",
            "trial_name": "Home High-Flow Nasal Cannula in Post-Acute Respiratory Syndrome",
            "description": "Ambulatory physiological study assessing exercise tolerance and oxygenation stability with domiciliary high-flow therapy.",
            "target_recruitment": 50,
            "status": "OPEN",
            "criteria": [
                {"field": "age", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 25.0, "numeric_max": 75.0, "weight": 1.0},
                {"field": "bp_systolic", "data_type": "NUMERIC", "classification": "HARD", "operator": "BETWEEN", "numeric_min": 95.0, "numeric_max": 155.0, "weight": 1.0}
            ]
        }
    ]

    from datetime import timedelta

    for idx, t_data in enumerate(trials_data):
        trial_created_at = now - timedelta(days=(len(trials_data) - idx), hours=idx)
        res = researcher_records[t_data["res_idx"]]
        trial = db.query(Trial).filter_by(trial_id=t_data["trial_id"]).first()
        if not trial:
            trial = Trial(
                trial_id=t_data["trial_id"],
                trial_name=t_data["trial_name"],
                description=t_data["description"],
                source_type="MANUAL",
                status=t_data["status"],
                target_recruitment=t_data["target_recruitment"],
                researcher_id=res.id,
                created_at=trial_created_at,
                updated_at=trial_created_at
            )
            db.add(trial)
            db.flush()
        else:
            trial.trial_name = t_data["trial_name"]
            trial.description = t_data["description"]
            trial.status = t_data["status"]
            trial.target_recruitment = t_data["target_recruitment"]
            trial.researcher_id = res.id
            if trial.created_at is None:
                trial.created_at = trial_created_at

        # Insert or update trial criteria
        for c in t_data["criteria"]:
            crit = db.query(TrialCriterion).filter_by(trial_id=trial.trial_id, field=c["field"]).first()
            if not crit:
                crit = TrialCriterion(
                    trial_id=trial.trial_id,
                    field=c["field"],
                    data_type=c["data_type"],
                    classification=c["classification"],
                    operator=c["operator"],
                    numeric_min=c.get("numeric_min"),
                    numeric_max=c.get("numeric_max"),
                    numeric_ideal=c.get("numeric_ideal"),
                    numeric_tolerance=c.get("numeric_tolerance"),
                    categorical_ideal=c.get("categorical_ideal"),
                    boolean_ideal=c.get("boolean_ideal"),
                    weight=c.get("weight", 1.0),
                    importance=1
                )
                db.add(crit)

    # =========================================================================
    # 3. SEED 5 PATIENTS WITH COMPLETE HEALTH PROFILES
    # =========================================================================
    patients_data = [
        {
            "email": "patient@example.com",
            "alt_email": "patient.smith@health.org",
            "password": "Patient@123",
            "patient_id": "P001",
            "name": "Johnathan Smith",
            "gender": "Male",
            "dob": "1978-05-14",  # Age 48
            "location": "Boston, MA",
            "phone": "+1 (555) 123-4567",
            "blood_group": "O+",
            "smoking": False,
            "alcohol": False,
            "previous_surgery": "None",
            "consent": True,
            "vitals": {"bp_systolic": 138, "bp_diastolic": 86, "heart_rate": 74, "bmi": 28.4, "hba1c": 7.2},
            "conditions": ["Type 2 Diabetes", "Mild Hypertension"],
            "allergies": ["Penicillin"]
        },
        {
            "email": "patient.chen@health.org",
            "password": "Chen@123",
            "patient_id": "P002",
            "name": "Maria Chen",
            "gender": "Female",
            "dob": "1984-11-22",  # Age 41
            "location": "Cambridge, MA",
            "phone": "+1 (555) 234-5678",
            "blood_group": "A+",
            "smoking": False,
            "alcohol": False,
            "previous_surgery": "None",
            "consent": True,
            "vitals": {"bp_systolic": 155, "bp_diastolic": 95, "heart_rate": 80, "bmi": 24.1, "hba1c": 5.4},
            "conditions": ["Essential Hypertension", "Hyperlipidemia"],
            "allergies": ["Sulfa Drugs"]
        },
        {
            "email": "patient.davis@health.org",
            "password": "Davis@123",
            "patient_id": "P003",
            "name": "Robert Davis",
            "gender": "Male",
            "dob": "1968-03-09",  # Age 58
            "location": "Worcester, MA",
            "phone": "+1 (555) 345-6789",
            "blood_group": "B+",
            "smoking": False,
            "alcohol": False,
            "previous_surgery": "Appendectomy (1995)",
            "consent": True,
            "vitals": {"bp_systolic": 124, "bp_diastolic": 78, "heart_rate": 68, "bmi": 26.5, "hba1c": 5.6},
            "conditions": ["Non-Small Cell Lung Cancer", "Asthma"],
            "allergies": ["Aspirin"]
        },
        {
            "email": "patient.martinez@health.org",
            "password": "Martinez@123",
            "patient_id": "P004",
            "name": "Elena Martinez",
            "gender": "Female",
            "dob": "1955-08-19",  # Age 71
            "location": "Newton, MA",
            "phone": "+1 (555) 456-7890",
            "blood_group": "AB+",
            "smoking": False,
            "alcohol": False,
            "previous_surgery": "Knee Arthroscopy (2018)",
            "consent": True,
            "vitals": {"bp_systolic": 122, "bp_diastolic": 76, "heart_rate": 70, "bmi": 22.8, "hba1c": 5.3},
            "conditions": ["Mild Cognitive Impairment", "Osteoporosis"],
            "allergies": ["Latex"]
        },
        {
            "email": "patient.taylor@health.org",
            "password": "Taylor@123",
            "patient_id": "P005",
            "name": "Marcus Taylor",
            "gender": "Male",
            "dob": "1991-01-30",  # Age 35
            "location": "Brookline, MA",
            "phone": "+1 (555) 567-8901",
            "blood_group": "O-",
            "smoking": False,
            "alcohol": False,
            "previous_surgery": "Tonsillectomy (2002)",
            "consent": True,
            "vitals": {"bp_systolic": 118, "bp_diastolic": 74, "heart_rate": 66, "bmi": 25.2, "hba1c": 5.1},
            "conditions": ["Severe Eosinophilic Asthma", "Allergic Rhinitis"],
            "allergies": ["Peanuts", "Tree Nuts"]
        }
    ]

    patient_records = []
    for p_info in patients_data:
        user = db.query(User).filter_by(email=p_info["email"]).first()
        if not user:
            user = User(
                email=p_info["email"],
                password_hash=hash_password(p_info["password"]),
                role="PATIENT",
                is_active=True
            )
            db.add(user)
            db.flush()

        if "alt_email" in p_info and p_info["alt_email"]:
            alt_user = db.query(User).filter_by(email=p_info["alt_email"]).first()
            if not alt_user:
                alt_user = User(
                    email=p_info["alt_email"],
                    password_hash=hash_password(p_info["password"]),
                    role="PATIENT",
                    is_active=True
                )
                db.add(alt_user)
                db.flush()

        pat = db.query(Patient).filter_by(patient_id=p_info["patient_id"]).first()
        if not pat:
            pat = db.query(Patient).filter_by(user_id=user.id).first()

        if not pat:
            pat = Patient(
                patient_id=p_info["patient_id"],
                user_id=user.id,
                name=p_info["name"],
                gender=p_info["gender"],
                dob=p_info["dob"],
                location=p_info["location"],
                phone=p_info["phone"],
                blood_group=p_info["blood_group"],
                smoking=p_info["smoking"],
                alcohol=p_info["alcohol"],
                previous_surgery=p_info["previous_surgery"],
                consent=p_info["consent"],
                created_at=now,
                updated_at=now
            )
            db.add(pat)
            db.flush()
        else:
            pat.user_id = user.id
            pat.name = p_info["name"]
            pat.gender = p_info["gender"]
            pat.dob = p_info["dob"]
            pat.location = p_info["location"]
            pat.phone = p_info["phone"]
            pat.blood_group = p_info["blood_group"]
            pat.smoking = p_info["smoking"]
            pat.alcohol = p_info["alcohol"]
            pat.consent = p_info["consent"]
            db.flush()

        # Insert baseline vitals if missing
        if not pat.vitals:
            v_info = p_info["vitals"]
            vitals = PatientVitals(
                patient_id=pat.patient_id,
                bp_systolic=v_info["bp_systolic"],
                bp_diastolic=v_info["bp_diastolic"],
                heart_rate=v_info["heart_rate"],
                bmi=v_info["bmi"],
                hba1c=v_info["hba1c"],
                recorded_at=now
            )
            db.add(vitals)

        # Insert conditions if missing
        if not pat.conditions:
            for c_name in p_info["conditions"]:
                cond = PatientCondition(
                    patient_id=pat.patient_id,
                    condition_name=c_name,
                    diagnosed_at="2022-01-15"
                )
                db.add(cond)

        # Insert allergies if missing
        if not pat.allergies:
            for a_name in p_info["allergies"]:
                allg = PatientAllergy(
                    patient_id=pat.patient_id,
                    allergen=a_name
                )
                db.add(allg)

        patient_records.append(pat)

    # =========================================================================
    # 4. SEED OPERATIONAL RECORDS (SCREENINGS, ENROLLMENTS, NOTIFICATIONS)
    # =========================================================================
    # P001 -> T001 (Enrolled), T002 (Screened)
    # P002 -> T006 (Accepted), T007 (Screened)
    # P003 -> T011 (Enrolled), T021 (Screened)
    # P004 -> T016 (Invited)
    # P005 -> T021 (Enrolled), T024 (Screened)

    operational_links = [
        {"p_idx": 0, "trial_id": "T001", "status": "ENROLLED", "match": 94.5, "verdict": "APPROVED", "notif": "Congratulations Johnathan, your enrollment in Trial T001 (SGLT2 Diabetes Study) is confirmed."},
        {"p_idx": 0, "trial_id": "T002", "status": None, "match": 88.0, "verdict": "APPROVED", "notif": "New clinical protocol alert: GLP-1 Cardiovascular Safety Trial is open for review."},
        {"p_idx": 1, "trial_id": "T006", "status": "ACCEPTED", "match": 96.0, "verdict": "APPROVED", "notif": "Study invitation accepted for T006 (Dual Vasodilator Hypertension Study)."},
        {"p_idx": 1, "trial_id": "T007", "status": None, "match": 76.5, "verdict": "NEEDS_REVIEW", "notif": None},
        {"p_idx": 2, "trial_id": "T011", "status": "ENROLLED", "match": 95.0, "verdict": "APPROVED", "notif": "Enrollment verified for T011 (Targeted EGFR Lung Cancer Protocol)."},
        {"p_idx": 3, "trial_id": "T016", "status": "INVITED", "match": 92.0, "verdict": "APPROVED", "notif": "Dr. Tariq Hassan has invited you to participate in Study T016 (Early Alzheimer's Trial)."},
        {"p_idx": 4, "trial_id": "T021", "status": "ENROLLED", "match": 97.0, "verdict": "APPROVED", "notif": "Study confirmation: You have been enrolled in T021 (Eosinophilic Asthma Biologic Study)."},
        {"p_idx": 4, "trial_id": "T024", "status": None, "match": 89.5, "verdict": "APPROVED", "notif": None},
    ]

    for link in operational_links:
        pid = patient_records[link["p_idx"]].patient_id
        # Screening Result
        existing_scr = db.query(ScreeningResult).filter_by(patient_id=pid, trial_id=link["trial_id"]).first()
        if not existing_scr:
            scr = ScreeningResult(
                patient_id=pid,
                trial_id=link["trial_id"],
                match_percentage=link["match"],
                verdict=link["verdict"],
                eligible=(link["verdict"] == "APPROVED"),
                criteria_snapshot={"simulated": True, "evaluated_at": now.isoformat()},
                screened_at=now
            )
            db.add(scr)

        # Enrollment
        if link["status"]:
            existing_enr = db.query(Enrollment).filter_by(patient_id=pid, trial_id=link["trial_id"]).first()
            if not existing_enr:
                enr = Enrollment(
                    patient_id=pid,
                    trial_id=link["trial_id"],
                    status=link["status"],
                    invited_at=now,
                    accepted_at=now if link["status"] in ["ACCEPTED", "ENROLLED"] else None,
                    enrolled_at=now if link["status"] == "ENROLLED" else None
                )
                db.add(enr)

        # Notification
        if link["notif"]:
            existing_notif = db.query(Notification).filter_by(patient_id=pid, trial_id=link["trial_id"]).first()
            if not existing_notif:
                notif = Notification(
                    patient_id=pid,
                    trial_id=link["trial_id"],
                    message=link["notif"],
                    channel="IN_APP",
                    delivery_status="SENT",
                    response="NONE",
                    sent_at=now
                )
                db.add(notif)

    db.commit()
    logger.info("Complete clinical seed data committed successfully (5 researchers, 25 trials, 5 patients, screenings, enrollments, notifications).")

if __name__ == "__main__":
    from backend.database.session import SessionLocal
    from backend.database.init_auth_db import upgrade_schema
    upgrade_schema()
    with SessionLocal() as db_session:
        seed_complete_database(db_session)
    print("Database seeding completed successfully!")
