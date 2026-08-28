from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

from backend.database.connection import engine, Base
import backend.models
from backend.models.user import User
from backend.models.researcher import Researcher
from backend.models.patient import Patient
from backend.models.trial import Trial
from backend.utils.security import hash_password

logger = logging.getLogger(__name__)

def upgrade_schema():
    """Safely build missing tables and extend existing tables with auth columns."""
    # 1. Create any missing tables (users, researchers, etc.)
    Base.metadata.create_all(bind=engine)

    # 2. Safely add foreign key columns to existing tables if not present
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_user_id ON patients(user_id) WHERE user_id IS NOT NULL;"))
        except Exception as e:
            logger.warning(f"Note on patients table column check: {e}")

        try:
            conn.execute(text("ALTER TABLE trials ADD COLUMN IF NOT EXISTS researcher_id INTEGER REFERENCES researchers(id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_trials_researcher_id ON trials(researcher_id);"))
        except Exception as e:
            logger.warning(f"Note on trials table column check: {e}")

        try:
            conn.execute(text("ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS screening_id INTEGER REFERENCES screening_results(screening_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_enrollments_screening_id ON enrollments(screening_id);"))
        except Exception as e:
            logger.warning(f"Note on enrollments table screening_id check: {e}")
        
        conn.commit()

from backend.database.seed_data import seed_complete_database

def seed_auth_data(db: Session):
    """
    Seed initial authentications, 5 researchers, 25 trials, 5 patients, and operational records.
    Running multiple times will NOT duplicate or corrupt data.
    """
    seed_complete_database(db)

if __name__ == "__main__":
    upgrade_schema()
    from backend.database.session import SessionLocal
    with SessionLocal() as db:
        seed_auth_data(db)
    print("Database upgrade and authentication seeding complete!")
