from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.session import get_db
from backend.services.export_service import export_candidates_csv, export_dashboard_pdf
from backend.models.user import User
from backend.api.auth_deps import get_optional_current_user

router = APIRouter(prefix="/export", tags=["Exports"])

@router.get("/trials/{trial_id}/candidates.csv")
def export_candidates_csv_route(
    trial_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot export recruitment candidate spreadsheets."
        )
    try:
        csv_str = export_candidates_csv(db, trial_id)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="candidates_{trial_id}.csv"'}
        )
    except Exception as e:
        # Hiding internal stack traces from the client
        raise HTTPException(status_code=500, detail="Failed to generate CSV export.")

@router.get("/trials/{trial_id}/report.pdf")
def export_dashboard_pdf_route(
    trial_id: str, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    if current_user and current_user.role == "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Patients cannot export study audit reports."
        )
    try:
        pdf_bytes = export_dashboard_pdf(db, trial_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_{trial_id}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to generate PDF export.")