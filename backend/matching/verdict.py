# Tunable thresholds for the hackathon
THRESHOLD_APPROVED = 90.0


def determine_verdict(match_percentage: float, hard_passed: bool) -> str:
    """
    Maps a match percentage to a discrete triage bucket.

    IMPORTANT: REJECTED is reserved exclusively for patients who failed a
    HARD criterion (or hit the active-trial conflict) - that's the only
    thing that should conclusively exclude someone. SOFT criteria are
    preferences, not requirements: a patient who passes every HARD gate but
    scores 0% on soft preferences should still be reviewable by a clinician,
    not auto-rejected. A weak soft score just means they rank lower and land
    in NEEDS_REVIEW instead of APPROVED - it never flips eligible to False.
    """
    if not hard_passed:
        return "REJECTED"

    if match_percentage >= THRESHOLD_APPROVED:
        return "APPROVED"

    return "NEEDS_REVIEW"