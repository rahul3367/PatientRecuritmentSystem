from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.auth_schema import (
    UserRegister, 
    UserLogin, 
    TokenResponse, 
    AuthMeResponse,
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse
)
from backend.services.auth_service import (
    register_user, 
    login_user, 
    get_auth_me,
    send_registration_otp,
    verify_registration_otp
)
from backend.api.auth_deps import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/send-otp", response_model=SendOTPResponse)
def send_otp(
    payload: SendOTPRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generate and dispatch a cryptographically secure 6-digit email OTP."""
    return send_registration_otp(db, payload.email, background_tasks=background_tasks)

@router.post("/verify-otp", response_model=VerifyOTPResponse)
def verify_otp(
    payload: VerifyOTPRequest, 
    db: Session = Depends(get_db)
):
    """Verify submitted 6-digit OTP code against stored SHA-256 hash."""
    return verify_registration_otp(db, payload.email, payload.otp)

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account (as Researcher or Patient) after email OTP verification."""
    return register_user(db, payload)

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email and password to receive JWT access token."""
    return login_user(db, payload)

@router.get("/me", response_model=AuthMeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch current authenticated user profile and associated role details."""
    return get_auth_me(current_user, db)

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """Stateless logout endpoint (client clears local token)."""
    return {"message": "Successfully logged out.", "user_id": current_user.id}
