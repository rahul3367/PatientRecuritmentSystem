from sqlalchemy.orm import Session
from backend.models.trial import Trial
from backend.models.screening import ScreeningResult
from backend.models.enrollment import Enrollment
from sqlalchemy import func
from typing import List


def get_latest_screenings_per_patient(db: Session, trial_id: str) -> List[ScreeningResult]:
    """
    BUG FIX: ScreeningResult is intentionally append-only (a new row every
    re-screen, never an update - see models/screening.py and the design
    doc's "previous screening results" requirement). That means any
    aggregate built directly on top of it - counts by verdict, top
    candidates, exclusion-reason tallies - was double/triple counting every
    patient who'd been screened more than once. That's not an edge case:
    every "Find Candidates" click, and every new-patient auto-screen against
    all OPEN trials, adds a new row for patients who already had one. The
    fix is to collapse to the most recent screening per patient first, and
    compute every stat from that collapsed set. This is exported (not
    prefixed with _) so export_service.py can reuse it instead of
    duplicating the same dedup logic.
    """
    all_screenings = (
        db.query(ScreeningResult)
        .filter(ScreeningResult.trial_id == trial_id)
        .order_by(ScreeningResult.screened_at.desc())
        .all()
    )
    latest_by_patient = {}
    for s in all_screenings:
        if s.patient_id not in latest_by_patient:
            latest_by_patient[s.patient_id] = s
    return list(latest_by_patient.values())


def get_dashboard_stats(db: Session, trial_id: str) -> dict:
    trial = db.query(Trial).filter_by(trial_id=trial_id).first()
    if not trial:
        raise ValueError("Trial not found.")

    latest_screenings = get_latest_screenings_per_patient(db, trial_id)

    screened_count = len(latest_screenings)
    approved_count = sum(1 for s in latest_screenings if s.verdict == "APPROVED")
    needs_review_count = sum(1 for s in latest_screenings if s.verdict == "NEEDS_REVIEW")
    rejected_count = sum(1 for s in latest_screenings if s.verdict == "REJECTED")

    enrolled_count = db.query(func.count(Enrollment.enrollment_id)).filter_by(trial_id=trial_id, status="ENROLLED").scalar()

    # Exposes a genuine 0 instead of masking it to 1
    target = trial.target_recruitment
    if target and target > 0:
        progress = round((enrolled_count / target) * 100, 2)
    else:
        target = 0
        progress = 0.0

    top_candidates = sorted(
        [s for s in latest_screenings if s.eligible],
        key=lambda s: s.match_percentage,
        reverse=True,
    )[:10]
    top_candidates = [{"patient_id": s.patient_id, "score": s.match_percentage} for s in top_candidates]

    reasons_tally = {}
    for s in latest_screenings:
        if s.verdict != "REJECTED" or not s.criteria_snapshot:
            continue
        for exp in s.criteria_snapshot.get("explanations", []):
            if not exp.get("passed"):
                field = exp.get("field", "Unknown")
                reasons_tally[field] = reasons_tally.get(field, 0) + 1

    top_reasons = [{"reason": k, "count": v} for k, v in sorted(reasons_tally.items(), key=lambda item: item[1], reverse=True)[:5]]

    return {
        "target": target,
        "screened": screened_count,
        "approved": approved_count,
        "needs_review": needs_review_count,
        "rejected": rejected_count,
        "enrolled": enrolled_count,
        "progress": progress,
        "top_exclusion_reasons": top_reasons,
        "top_candidates": top_candidates
    }