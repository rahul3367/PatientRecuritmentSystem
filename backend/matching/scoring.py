import math
from typing import List, Dict, Any

def calculate_gaussian_score(value: float, ideal: float, tolerance: float, weight: float = 1.0) -> float:
    """
    Applies Gaussian scoring: score = weight * e^(-(value-ideal)^2 / (2*sigma^2))
    sigma is half the tolerance.
    """
    if value is None or ideal is None or tolerance is None:
        return 0.0
        
    try:
        val_f = float(value)
        ideal_f = float(ideal)
        tol_f = float(tolerance)
        w_f = float(weight) if weight is not None else 1.0
    except (ValueError, TypeError):
        return 0.0

    if tol_f <= 0:
        return w_f if val_f == ideal_f else 0.0
        
    sigma = tol_f / 2.0
    exponent = -((val_f - ideal_f) ** 2) / (2 * (sigma ** 2))
    score = w_f * math.exp(exponent)
    return max(0.0, min(w_f, score))

def aggregate_scores(soft_contributions: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Sums individual criterion contributions and computes the final match percentage.
    """
    total_score = sum(c.get("contribution", 0.0) for c in soft_contributions)
    max_possible = sum(c.get("max_possible", 0.0) for c in soft_contributions)
    
    if max_possible == 0:
        # If a trial has 0 soft criteria (or 0 weight), passing hard criteria means a 100% match.
        return {
            "total_score": 0.0,
            "max_possible_score": 0.0,
            "match_percentage": 100.0
        }
        
    match_percentage = (total_score / max_possible) * 100.0
    
    return {
        "total_score": round(total_score, 2),
        "max_possible_score": round(max_possible, 2),
        "match_percentage": round(match_percentage, 1)
    }