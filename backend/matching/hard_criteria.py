import re
from typing import List, Dict, Tuple, Any, Optional
from backend.schemas.criterion_schema import CriterionResponse, DataType

STOP_WORDS = {
    "a", "an", "the", "and", "or", "to", "of", "in", "with", "for",
    "is", "are", "be", "at", "by", "from", "on", "as", "into", "through",
    "about", "against", "between", "during", "without", "before", "after",
    "above", "below", "up", "down", "out", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "any", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "can", "will", "just", "should", "now"
}

STANDARD_ALIASES = {
    "age": ["age", "patient_age", "years_old"],
    "gender": ["gender", "sex"],
    "bp_systolic": ["bp_systolic", "systolic_blood_pressure", "systolic", "bp systolic", "systolic bp"],
    "bp_diastolic": ["bp_diastolic", "diastolic_blood_pressure", "diastolic", "bp diastolic", "diastolic bp"],
    "heart_rate": ["heart_rate", "resting_heart_rate", "pulse", "pulse_rate"],
    "blood_glucose": ["blood_glucose", "fasting_blood_glucose", "glucose", "blood sugar", "fasting blood sugar"],
    "bmi": ["bmi", "body_mass_index", "body mass index"],
    "hba1c": ["hba1c", "glycated_hemoglobin", "hemoglobin a1c", "a1c"],
    "conditions": ["conditions", "condition", "diagnosis", "medical_conditions", "medical_history", "history"],
    "allergies": ["allergies", "allergy", "allergens"],
    "cholesterol": ["cholesterol", "total_cholesterol", "total serum cholesterol", "serum cholesterol"],
    "creatinine": ["creatinine", "serum_creatinine", "serum creatinine"],
    "alt": ["alt", "liver_enzyme_alt", "alanine aminotransferase", "alanine_aminotransferase"],
    "smoking": ["smoking", "smoking_status", "smoker", "non_smoker", "tobacco"],
    "alcohol": ["alcohol", "alcohol_consumption", "drinking"],
    "blood_group": ["blood_group", "blood_type"],
    "previous_surgery": ["previous_surgery", "surgery", "surgical_history"]
}


def _normalize_str(s: Any) -> str:
    if s is None:
        return ""
    clean = str(s).strip().lower()
    clean = clean.replace("≥", ">=").replace("≤", "<=").replace("–", "-").replace("—", "-")
    clean = " ".join(clean.split())
    return clean


def _tokenize(text: str) -> set:
    if not text:
        return set()
    cleaned = "".join(c if c.isalnum() or c.isspace() else " " for c in str(text).lower())
    words = cleaned.split()
    return {w for w in words if w not in STOP_WORDS and len(w) > 1}


def _parse_float(val: Any) -> Optional[float]:
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    # Try direct conversion
    try:
        return float(s)
    except (ValueError, TypeError):
        pass
    # Try extracting leading or isolated numeric sequence (e.g. "48 years" -> 48.0, "6.5%" -> 6.5)
    match = re.search(r"[-+]?\d*\.?\d+", s)
    if match:
        try:
            return float(match.group())
        except (ValueError, TypeError):
            pass
    return None


def _parse_bool(val: Any) -> Optional[bool]:
    if val is None or val == "":
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        s = val.strip().lower()
        if s in ["true", "yes", "1", "y", "t", "pass", "positive", "confirmed", "present", "active", "capable", "able", "eligible"]:
            return True
        if s in ["false", "no", "0", "n", "f", "fail", "negative", "unconfirmed", "absent", "none", "ineligible"]:
            return False
        # If it contains negation words
        if any(neg in s for neg in ["no ", "not ", "none", "denied", "unable", "ineligible", "absent", "negative"]):
            return False
        # If non-empty affirmative statement
        return True
    return bool(val)


def _match_categorical(val: Any, ideal: str, operator: str = "EQUALS") -> Tuple[bool, str]:
    """
    Evaluates categorical matching with robust case-insensitivity, normalization,
    substring tolerance, and word-token semantic overlap.
    """
    if not ideal:
        return True, ""

    ideal_clean = _normalize_str(ideal)
    op = (operator or "EQUALS").upper()
    is_exclusion_op = op in ["EXCLUDES", "NOT_IN", "DOES_NOT_INCLUDE", "NOT_EQUALS", "!="]

    ideal_tokens = _tokenize(ideal_clean)

    def check_single_match(item: Any) -> bool:
        if item is None or item == "":
            return False
        if isinstance(item, bool):
            return item is True

        item_clean = _normalize_str(item)
        if item_clean == ideal_clean:
            return True
        if ideal_clean in item_clean or item_clean in ideal_clean:
            return True

        # Token overlap
        item_tokens = _tokenize(item_clean)
        if ideal_tokens and item_tokens:
            if ideal_tokens.issubset(item_tokens) or item_tokens.issubset(ideal_tokens):
                return True
            overlap = ideal_tokens & item_tokens
            if len(overlap) >= min(len(ideal_tokens), len(item_tokens)) * 0.5:
                return True
        return False

    if isinstance(val, list):
        has_match = any(check_single_match(x) for x in val if x is not None)
    else:
        has_match = check_single_match(val)

    if is_exclusion_op:
        if has_match:
            return False, f"Exclusion criterion met: '{val}' matches excluded '{ideal}'"
        return True, ""
    else:
        if not has_match:
            return False, f"Required condition/value '{ideal}' not matched in '{val}'"
        return True, ""


def get_patient_field_value(patient_data: Dict[str, Any], field: str) -> Any:
    """
    Retrieves the corresponding value from patient_data using exact, case-insensitive,
    underscore/space normalized, or alias-mapped lookups.
    """
    if not patient_data or not field:
        return None

    # 1. Exact match
    if field in patient_data:
        return patient_data[field]

    field_clean = _normalize_str(field)
    field_slug = field_clean.replace(" ", "_")

    # 2. Case and space normalized search across patient_data keys
    for k, v in patient_data.items():
        k_clean = _normalize_str(k)
        k_slug = k_clean.replace(" ", "_")
        if k_clean == field_clean or k_slug == field_slug:
            return v

    # 3. Alias mappings lookup
    for std_key, aliases in STANDARD_ALIASES.items():
        if any(field_clean == a or field_slug == a.replace(" ", "_") for a in aliases):
            # Check if any alias is in patient_data
            for a in aliases:
                for k, v in patient_data.items():
                    if _normalize_str(k) == a or _normalize_str(k).replace(" ", "_") == a.replace(" ", "_"):
                        return v
            if std_key in patient_data:
                return patient_data[std_key]

    # 4. Partial / containment key lookup
    for k, v in patient_data.items():
        k_clean = _normalize_str(k)
        if (len(k_clean) > 3 and k_clean in field_clean) or (len(field_clean) > 3 and field_clean in k_clean):
            return v

    # 5. Medical conditions check
    conditions = patient_data.get("conditions")
    if isinstance(conditions, list) and conditions:
        matched, _ = _match_categorical(conditions, field, "INCLUDES")
        if matched:
            return conditions

    return None


def evaluate_hard_criteria(patient_data: Dict[str, Any], criteria: List[CriterionResponse]) -> Tuple[bool, List[Dict[str, Any]]]:
    """
    Evaluates strictly required (HARD) criteria.
    Returns (True, []) if all pass, or (False, [failures]) if any fail.
    Collects ALL failures for a complete rejection explanation.
    """
    failures = []

    for crit in criteria:
        val = get_patient_field_value(patient_data, crit.field)

        # Missing required data is an immediate hard failure
        if val is None or val == "":
            failures.append({"field": crit.field, "reason": f"Missing required patient data for '{crit.field}'"})
            continue

        if crit.data_type == DataType.NUMERIC:
            num_val = _parse_float(val)
            if num_val is None:
                failures.append({"field": crit.field, "reason": f"Invalid numeric value '{val}' for '{crit.field}'"})
            else:
                min_val = crit.numeric_min if crit.numeric_min is not None else float("-inf")
                max_val = crit.numeric_max if crit.numeric_max is not None else float("inf")
                if not (min_val <= num_val <= max_val):
                    failures.append({"field": crit.field, "reason": f"Value {val} is outside strictly required range {crit.numeric_min}-{crit.numeric_max}"})

        elif crit.data_type == DataType.CATEGORICAL:
            passed, reason = _match_categorical(val, crit.categorical_ideal, crit.operator)
            if not passed:
                failures.append({"field": crit.field, "reason": reason})

        elif crit.data_type == DataType.BOOLEAN:
            bool_val = _parse_bool(val)
            if bool_val is None:
                failures.append({"field": crit.field, "reason": f"Invalid boolean response '{val}' for '{crit.field}'"})
            else:
                op = (crit.operator or "EQUALS").upper()
                if op in ["NOT_EQUALS", "!="]:
                    if bool_val == crit.boolean_ideal:
                        failures.append({"field": crit.field, "reason": f"Exclusion met: patient has {val}"})
                else:
                    if bool_val != crit.boolean_ideal:
                        expected_str = "Yes" if crit.boolean_ideal else "No"
                        actual_str = "Yes" if bool_val else "No"
                        failures.append({"field": crit.field, "reason": f"Required {expected_str}, but patient has {actual_str}"})

    if failures:
        return False, failures

    return True, []