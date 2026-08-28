from datetime import date

from backend.matching.engine import flatten_patient_data, run_matching_engine
from backend.matching.hard_criteria import evaluate_hard_criteria
from backend.models.patient import Patient, PatientAllergy, PatientCondition
from backend.models.trial import Trial
from backend.models.trial_criterion import TrialCriterion
from backend.schemas.criterion_schema import Classification, CriterionResponse, DataType


def test_flatten_patient_data_extracts_condition_and_allergy_names():
    patient = Patient(
        patient_id="p1",
        name="Rahul",
        gender="Male",
        dob=date(1990, 1, 1),
        smoking=False,
        alcohol=False,
        consent=True,
    )
    patient.conditions = [
        PatientCondition(condition_name="Hypertension"),
        PatientCondition(condition_name="Diabetes"),
    ]
    patient.allergies = [PatientAllergy(allergen="Penicillin")]

    patient_data, _ = flatten_patient_data(patient)

    assert patient_data["conditions"] == ["Hypertension", "Diabetes"]
    assert patient_data["allergies"] == ["Penicillin"]
    assert "Hypertension" in patient_data["conditions"]
    assert "Penicillin" in patient_data["allergies"]


def test_hard_criteria_accepts_condition_names_from_patient_lists():
    patient_data = {"conditions": ["Hypertension", "Diabetes"]}
    criteria = [
        CriterionResponse(
            criterion_id=1,
            trial_id="trial-1",
            field="conditions",
            data_type=DataType.CATEGORICAL,
            classification=Classification.HARD,
            operator="INCLUDES",
            categorical_ideal="Hypertension",
        )
    ]

    passed, failures = evaluate_hard_criteria(patient_data, criteria)

    assert passed is True
    assert failures == []


def test_acceptance_1_all_hard_pass_some_soft_fail():
    """
    TEST 1:
    All HARD criteria pass + some SOFT criteria fail
    -> Eligible
    -> Normal match percentage (50.0%)
    """
    trial = Trial(trial_id="T_01", trial_name="Test Trial 1", status="OPEN")
    trial.criteria = [
        TrialCriterion(criterion_id=1, trial_id="T_01", field="Age", data_type="NUMERIC", classification="HARD", operator="BETWEEN", numeric_min=40.0, numeric_max=70.0),
        TrialCriterion(criterion_id=2, trial_id="T_01", field="Consent", data_type="BOOLEAN", classification="HARD", operator="EQUALS", boolean_ideal=True),
        TrialCriterion(criterion_id=3, trial_id="T_01", field="Daily Training", data_type="BOOLEAN", classification="SOFT", operator="EQUALS", boolean_ideal=True, weight=1.0),
        TrialCriterion(criterion_id=4, trial_id="T_01", field="MMSE Score", data_type="NUMERIC", classification="SOFT", operator="GAUSSIAN", numeric_ideal=26.0, numeric_tolerance=3.0, weight=1.0)
    ]
    patient = Patient(patient_id="P_01", name="Patient 1", gender="Female", dob="1975-06-15")
    overrides = {
        "Age": "48",
        "Consent": "true",
        "Daily Training": "true",
        "MMSE Score": None
    }
    result = run_matching_engine(patient, trial, overrides=overrides)
    assert result["eligible"] is True
    assert result["verdict"] == "NEEDS_REVIEW"
    assert result["match_percentage"] == 50.0


def test_acceptance_2_hard_inclusion_fails_match_score_calculated():
    """
    TEST 2:
    One HARD inclusion criterion fails + other criteria mostly pass
    -> Rejected
    -> Match score is still calculated and is NOT automatically 0%
    """
    trial = Trial(trial_id="T_02", trial_name="Test Trial 2", status="OPEN")
    trial.criteria = [
        TrialCriterion(criterion_id=1, trial_id="T_02", field="Age", data_type="NUMERIC", classification="HARD", operator="BETWEEN", numeric_min=40.0, numeric_max=70.0),
        TrialCriterion(criterion_id=2, trial_id="T_02", field="Consent", data_type="BOOLEAN", classification="HARD", operator="EQUALS", boolean_ideal=True),
        TrialCriterion(criterion_id=3, trial_id="T_02", field="Daily Training", data_type="BOOLEAN", classification="SOFT", operator="EQUALS", boolean_ideal=True, weight=2.0),
        TrialCriterion(criterion_id=4, trial_id="T_02", field="MMSE Score", data_type="NUMERIC", classification="SOFT", operator="GAUSSIAN", numeric_ideal=26.0, numeric_tolerance=3.0, weight=1.0)
    ]
    patient = Patient(patient_id="P_02", name="Patient 2", gender="Female", dob="1995-06-15")
    # Patient is 30 (fails age 40-70), but satisfies Consent and Daily Training
    overrides = {
        "Age": "30",
        "Consent": "true",
        "Daily Training": "true",
        "MMSE Score": "26.0"
    }
    result = run_matching_engine(patient, trial, overrides=overrides)
    assert result["eligible"] is False
    assert result["verdict"] == "REJECTED"
    assert result["match_percentage"] == 100.0  # Soft score is 100%, not forced to 0%
    # Check explanations include the failed hard criterion
    failed_explanations = [e for e in result["criteria_snapshot"]["explanations"] if not e["passed"]]
    assert len(failed_explanations) == 1
    assert failed_explanations[0]["field"] == "Age"


def test_acceptance_3_hard_exclusion_triggered():
    """
    TEST 3:
    One HARD exclusion criterion is triggered
    -> Rejected
    -> Match score is still calculated
    -> Failed exclusion is clearly shown
    """
    trial = Trial(trial_id="T_03", trial_name="Test Trial 3", status="OPEN")
    trial.criteria = [
        TrialCriterion(criterion_id=1, trial_id="T_03", field="Age", data_type="NUMERIC", classification="HARD", operator="BETWEEN", numeric_min=40.0, numeric_max=70.0),
        TrialCriterion(criterion_id=2, trial_id="T_03", field="Major Neurological Disease", data_type="BOOLEAN", classification="HARD", operator="EQUALS", boolean_ideal=False),
        TrialCriterion(criterion_id=3, trial_id="T_03", field="Daily Training", data_type="BOOLEAN", classification="SOFT", operator="EQUALS", boolean_ideal=True, weight=1.0)
    ]
    patient = Patient(patient_id="P_03", name="Patient 3", gender="Male", dob="1975-06-15")
    # Patient triggers exclusion: Major Neurological Disease = True
    overrides = {
        "Age": "50",
        "Major Neurological Disease": True,
        "Daily Training": "Yes"
    }
    result = run_matching_engine(patient, trial, overrides=overrides)
    assert result["eligible"] is False
    assert result["verdict"] == "REJECTED"
    assert result["match_percentage"] == 100.0  # Soft score calculated normally
    # Check failed exclusion is recorded in explanations
    failed_explanations = [e for e in result["criteria_snapshot"]["explanations"] if not e["passed"]]
    assert len(failed_explanations) == 1
    assert failed_explanations[0]["field"] == "Major Neurological Disease"


def test_acceptance_4_hard_exclusion_not_present():
    """
    TEST 4:
    HARD exclusion criterion is NOT present
    -> PASS
    -> It must not incorrectly reject the patient.
    """
    trial = Trial(trial_id="T_04", trial_name="Test Trial 4", status="OPEN")
    trial.criteria = [
        TrialCriterion(criterion_id=1, trial_id="T_04", field="Age", data_type="NUMERIC", classification="HARD", operator="BETWEEN", numeric_min=40.0, numeric_max=70.0),
        TrialCriterion(criterion_id=2, trial_id="T_04", field="Major Neurological Disease", data_type="BOOLEAN", classification="HARD", operator="EQUALS", boolean_ideal=False),
        TrialCriterion(criterion_id=3, trial_id="T_04", field="Daily Training", data_type="BOOLEAN", classification="SOFT", operator="EQUALS", boolean_ideal=True, weight=1.0)
    ]
    patient = Patient(patient_id="P_04", name="Patient 4", gender="Male", dob="1975-06-15")
    # Patient does NOT have exclusion condition: Major Neurological Disease = False
    overrides = {
        "Age": "50",
        "Major Neurological Disease": False,
        "Daily Training": "Yes"
    }
    result = run_matching_engine(patient, trial, overrides=overrides)
    assert result["eligible"] is True
    assert result["verdict"] == "APPROVED"
    assert result["match_percentage"] == 100.0
    failed_explanations = [e for e in result["criteria_snapshot"]["explanations"] if not e["passed"]]
    assert len(failed_explanations) == 0
