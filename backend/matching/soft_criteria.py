from typing import List, Dict, Any
from backend.schemas.criterion_schema import CriterionResponse, DataType
from backend.matching.scoring import calculate_gaussian_score
from backend.matching.hard_criteria import _match_categorical, _parse_bool, _parse_float, get_patient_field_value

def evaluate_soft_criteria(patient_data: Dict[str, Any], criteria: List[CriterionResponse]) -> List[Dict[str, Any]]:
    """
    Evaluates preferential (SOFT) criteria, returning a score contribution for each.
    """
    contributions = []
    
    for crit in criteria:
        val = get_patient_field_value(patient_data, crit.field)
        
        weight = float(crit.weight) if crit.weight is not None else 1.0
        contribution = 0.0
        
        if val is not None and val != "":
            if crit.data_type == DataType.NUMERIC:
                num_val = _parse_float(val)
                if num_val is not None:
                    contribution = calculate_gaussian_score(
                        value=num_val, 
                        ideal=crit.numeric_ideal, 
                        tolerance=crit.numeric_tolerance, 
                        weight=weight
                    )
            elif crit.data_type == DataType.CATEGORICAL:
                passed, _ = _match_categorical(val, crit.categorical_ideal, crit.operator)
                if passed:
                    contribution = weight
            elif crit.data_type == DataType.BOOLEAN:
                bool_val = _parse_bool(val)
                if bool_val is not None:
                    op = (crit.operator or "EQUALS").upper()
                    if op in ["NOT_EQUALS", "!="]:
                        if bool_val != crit.boolean_ideal:
                            contribution = weight
                    else:
                        if bool_val == crit.boolean_ideal:
                            contribution = weight
                    
        contributions.append({
            "field": crit.field,
            "contribution": round(contribution, 2),
            "max_possible": weight
        })
        
    return contributions