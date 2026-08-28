import pandas as pd
from io import StringIO, BytesIO
from sqlalchemy.orm import Session
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from backend.services.dashboard_service import get_dashboard_stats, get_latest_screenings_per_patient

def export_candidates_csv(db: Session, trial_id: str) -> str:
    # Get deduplicated screenings per patient
    screenings = get_latest_screenings_per_patient(db, trial_id)

    data = []
    for s in screenings:
        # Safely extract patient info if the SQLAlchemy relationship is loaded
        # Fallback to "Unknown" if the patient record was somehow deleted
        patient_name = s.patient.name if getattr(s, "patient", None) else "Unknown"
        patient_phone = s.patient.phone if getattr(s, "patient", None) else "N/A"
        
        data.append({
            "Patient ID": s.patient_id,
            "Patient Name": patient_name,
            "Contact Phone": patient_phone,
            "Match Percentage": f"{s.match_percentage}%" if s.match_percentage is not None else "0%",
            "Verdict": s.verdict,
            "Eligible": "Yes" if s.eligible else "No",
            "Screened At": s.screened_at.strftime("%Y-%m-%d %H:%M") if s.screened_at else "N/A"
        })

    # Explicitly define columns so that even if `data` is empty, 
    # the exported CSV still has the correct header row instead of being a blank file!
    columns = [
        "Patient ID", "Patient Name", "Contact Phone", 
        "Match Percentage", "Verdict", "Eligible", "Screened At"
    ]
    df = pd.DataFrame(data, columns=columns)
    
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    return csv_buffer.getvalue()


def export_dashboard_pdf(db: Session, trial_id: str) -> bytes:
    stats = get_dashboard_stats(db, trial_id)

    pdf_buffer = BytesIO()
    # BUG FIX: ReportLab's default Canvas() page size is Letter (612x792pt),
    # origin at bottom-left. The title was drawn at y=800 - 8 points ABOVE
    # the top edge of a 792pt-tall page - so it was silently clipped and
    # never actually visible in the exported PDF. Explicit pagesize=letter
    # here for clarity, and every y-coordinate shifted to fit within it.
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    page_width, page_height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, page_height - 50, f"Trial Recruitment Report: {trial_id}")  # y = 742

    c.setFont("Helvetica", 12)
    c.drawString(50, page_height - 80, f"Target Recruitment: {stats.get('target', 0)}")
    c.drawString(50, page_height - 100, f"Currently Enrolled: {stats.get('enrolled', 0)} ({stats.get('progress', 0.0)}%)")
    c.drawString(50, page_height - 120, f"Total Screened: {stats.get('screened', 0)}")

    c.drawString(50, page_height - 150, f"Approved: {stats.get('approved', 0)}")
    c.drawString(50, page_height - 170, f"Needs Review: {stats.get('needs_review', 0)}")
    c.drawString(50, page_height - 190, f"Rejected: {stats.get('rejected', 0)}")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, page_height - 220, "Top Exclusion Reasons:")
    c.setFont("Helvetica", 12)

    y = page_height - 240
    for reason in stats.get('top_exclusion_reasons', []):
        c.drawString(70, y, f"- {reason['reason']}: {reason['count']} occurrences")
        y -= 20

    c.save()
    return pdf_buffer.getvalue()