from pydantic import BaseModel
from typing import List

class ExclusionReason(BaseModel):
    reason: str
    count: int

class TopCandidate(BaseModel):
    patient_id: str
    score: float

class DashboardStatsResponse(BaseModel):
    target: int
    screened: int
    approved: int
    needs_review: int
    rejected: int
    enrolled: int
    progress: float
    top_exclusion_reasons: List[ExclusionReason]
    top_candidates: List[TopCandidate]
