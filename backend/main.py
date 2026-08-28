from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.connection import engine, Base
import backend.models  # Crucial: ensures Base.metadata knows about all your tables before creating them

from backend.database.init_auth_db import upgrade_schema, seed_auth_data
from backend.database.session import SessionLocal

# Import all routers
from backend.api.auth_routes import router as auth_router
from backend.api.researcher_routes import router as researcher_router
from backend.api.patient_routes import router as patient_router
from backend.api.trial_routes import router as trial_router
from backend.api.matching_routes import router as matching_router
from backend.api.enrollment_routes import router as enrollment_router
from backend.api.dashboard_routes import router as dashboard_router
from backend.api.verification_routes import router as verification_router
from backend.api.notification_routes import router as notification_router
from backend.api.export_routes import router as export_router

app = FastAPI(
    title="Clinical Trial Recruitment API",
    description="Hackathon Backend System"
)

# Allow the local dev frontend origins that are commonly used for Vite/React.
# This avoids the CORS block seen when the browser hits the API from localhost:5173.
LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:4173",
    "http://0.0.0.0:3000",
    "http://0.0.0.0:5173",
    "http://0.0.0.0:5174",
    "http://0.0.0.0:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=LOCAL_DEV_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes
app.include_router(auth_router)
app.include_router(researcher_router)
app.include_router(patient_router)
app.include_router(trial_router)
app.include_router(matching_router)
app.include_router(enrollment_router)
app.include_router(dashboard_router)
app.include_router(verification_router)
app.include_router(notification_router)
app.include_router(export_router)

@app.on_event("startup")
def startup_event():
    """Ensure the database schema exists before processing requests."""
    try:
        upgrade_schema()
    except Exception:
        Base.metadata.create_all(bind=engine)

# Ensure the schema exists immediately in local/test environments where startup hooks are not triggered.
try:
    upgrade_schema()
except Exception:
    Base.metadata.create_all(bind=engine)

# Basic Health Check
@app.get("/")
def health_check():
    return {"status": "API is running, routers registered, CORS is secure, and tables are built!"}