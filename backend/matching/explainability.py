from typing import List, Dict, Any

def generate_explanations(
    hard_failures: List[Dict[str, Any]], 
    soft_contributions: List[Dict[str, Any]],
    passed_hard_criteria: List[Any] = None
) -> List[Dict[str, Any]]:
    """
    Translates mathematical contributions and failures into human-readable, 
    frontend-friendly dictionary objects.
    """
    explanations = []
    
    # Format hard failures
    for failure in hard_failures:
        explanations.append({
            "field": failure["field"],
            "type": "HARD",
            "passed": False,
            "message": failure["reason"]
        })
        
    # Format passed hard criteria
    if passed_hard_criteria:
        for crit in passed_hard_criteria:
            field_name = getattr(crit, "field", str(crit))
            explanations.append({
                "field": field_name,
                "type": "HARD",
                "passed": True,
                "message": f"Met required condition for {field_name}."
            })

    # Format soft contributions
    for soft in soft_contributions:
        contrib = soft.get("contribution", 0.0)
        max_p = soft.get("max_possible", 1.0)
        pct = round((contrib / max_p) * 100, 1) if max_p > 0 else 100.0
        explanations.append({
            "field": soft["field"],
            "type": "SOFT",
            "passed": True,  # Soft criteria don't strictly "fail"
            "score": contrib,
            "max_score": max_p,
            "message": f"Contributed {contrib}/{max_p} pts ({pct}%) to match score."
        })
        
    return explanations