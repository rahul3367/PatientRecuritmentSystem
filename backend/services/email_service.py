import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Optional, List, Dict
from backend.config import settings

logger = logging.getLogger("aegis_trial.email_service")
TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

def render_new_trial_template(patient_name: str, trial_name: str, trial_id: str, trial_description: Optional[str] = None) -> str:
    """Render the HTML email template with provided trial details."""
    template_path = TEMPLATE_DIR / "new_trial_published.html"
    if template_path.exists():
        html_content = template_path.read_text(encoding="utf-8")
        html_content = html_content.replace("{{ patient_name }}", patient_name or "Patient")
        html_content = html_content.replace("{{ trial_name }}", trial_name or "")
        html_content = html_content.replace("{{ trial_id }}", trial_id or "")
        if trial_description:
            html_content = html_content.replace("{% if trial_description %}", "")
            html_content = html_content.replace("{{ trial_description }}", trial_description)
            html_content = html_content.replace("{% endif %}", "")
        else:
            # Remove conditional block if description is empty
            import re
            html_content = re.sub(r'\{%\s*if trial_description\s*%\}.*?\{%\s*endif\s*%\}', '', html_content, flags=re.DOTALL)
        return html_content

    # Fallback inline HTML if template file is missing
    desc_html = f"<p style='color:#475569;'>{trial_description}</p>" if trial_description else ""
    return f"""
    <html>
      <body style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Dear {patient_name or 'Patient'},</h2>
        <p>A new clinical trial is now available on AegisTrial:</p>
        <div style="background:#f8fafc; border-left:4px solid #0284c7; padding:15px; margin:15px 0;">
          <strong>Trial ID: {trial_id}</strong><br>
          <h3 style="margin:5px 0;">{trial_name}</h3>
          {desc_html}
        </div>
        <p>Please log in to your AegisTrial Patient Portal to review the trial.</p>
        <p>— AegisTrial Clinical Research Team</p>
      </body>
    </html>
    """

def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
    """
    Send an email via standard SMTP (Gmail).
    Returns True if sent successfully, False otherwise.
    Safe error handling prevents SMTP failures from crashing caller routines.
    """
    if not settings.EMAIL_ENABLED:
        logger.info("EMAIL_ENABLED is False; skipping SMTP delivery to %s", to_email)
        return False

    if not to_email or not to_email.strip():
        logger.warning("Cannot send email: recipient address is empty.")
        return False

    try:
        from_email = settings.EMAIL_FROM or settings.SMTP_USERNAME or "noreply@aegistrial.org"
        from_header = f"{settings.EMAIL_FROM_NAME} <{from_email}>" if settings.EMAIL_FROM_NAME else from_email

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = to_email.strip()

        # Plain text fallback
        plain_text = text_body or "A new clinical trial is available on AegisTrial. Please log in to your portal to review."
        msg.attach(MIMEText(plain_text, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_email, [to_email.strip()], msg.as_string())

        logger.info("Successfully dispatched email to %s (Subject: %s)", to_email, subject)
        return True

    except Exception as e:
        # Secure logging: Never print passwords or SMTP credentials
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False

def send_new_trial_email(
    to_email: str,
    patient_name: str,
    trial_name: str,
    trial_id: str,
    trial_description: Optional[str] = None
) -> bool:
    """Dedicated helper to dispatch a new trial notification email to a patient."""
    subject = f"New Clinical Trial Available — {trial_name}"
    html_body = render_new_trial_template(
        patient_name=patient_name,
        trial_name=trial_name,
        trial_id=trial_id,
        trial_description=trial_description
    )
    plain_text = (
        f"Dear {patient_name},\n\n"
        f"A new clinical trial is now available on AegisTrial:\n\n"
        f"{trial_name}\n"
        f"Trial ID: {trial_id}\n\n"
        f"{trial_description or ''}\n\n"
        f"Please log in to your AegisTrial Patient Portal to review the trial.\n\n"
        f"— AegisTrial Clinical Research Team"
    )
    return send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=plain_text)

def render_otp_template(otp_code: str, expires_in_minutes: int = 10) -> str:
    """Render the HTML email template with provided OTP code."""
    template_path = TEMPLATE_DIR / "otp_verification.html"
    if template_path.exists():
        html_content = template_path.read_text(encoding="utf-8")
        html_content = html_content.replace("{{ otp_code }}", otp_code)
        html_content = html_content.replace("{{ expires_in_minutes }}", str(expires_in_minutes))
        return html_content

    # Fallback inline HTML
    return f"""
    <html>
      <body style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Dear AegisTrial User,</h2>
        <p>Your email verification code is:</p>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:20px; text-align:center; margin:15px 0;">
          <span style="font-size:28px; font-weight:bold; letter-spacing:6px; color:#15803d;">{otp_code}</span>
          <p style="color:#64748b; font-size:12px; margin-top:6px;">This code expires in {expires_in_minutes} minutes.</p>
        </div>
        <p>If you did not request this verification code, you can safely ignore this email.</p>
        <p>— AegisTrial Clinical Research Platform</p>
      </body>
    </html>
    """

def send_otp_email(
    to_email: str,
    otp_code: str,
    expires_in_minutes: int = 10
) -> bool:
    """Dedicated helper to dispatch an OTP verification code email."""
    subject = "AegisTrial Email Verification Code"
    html_body = render_otp_template(otp_code=otp_code, expires_in_minutes=expires_in_minutes)
    plain_text = (
        f"Dear AegisTrial User,\n\n"
        f"Your email verification code is:\n\n"
        f"{otp_code}\n\n"
        f"This code expires in {expires_in_minutes} minutes.\n\n"
        f"If you did not request this verification code, you can safely ignore this email.\n\n"
        f"— AegisTrial Clinical Research Platform"
    )
    return send_email(to_email=to_email, subject=subject, html_body=html_body, text_body=plain_text)

def send_new_trial_broadcast(
    recipients: List[Dict[str, str]],
    trial_name: str,
    trial_id: str,
    trial_description: Optional[str] = None
) -> None:
    """
    Background worker task to broadcast new trial notification emails to a list of recipients.
    Each recipient dict must have {"email": "...", "name": "..."}.
    """
    if not settings.EMAIL_ENABLED:
        logger.info("EMAIL_ENABLED is False; skipping broadcast to %d recipients", len(recipients))
        return

    logger.info("Broadcasting new trial emails to %d registered patients", len(recipients))
    for r in recipients:
        email = r.get("email")
        name = r.get("name", "Patient")
        if email:
            send_new_trial_email(
                to_email=email,
                patient_name=name,
                trial_name=trial_name,
                trial_id=trial_id,
                trial_description=trial_description
            )

