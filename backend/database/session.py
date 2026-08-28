from sqlalchemy.orm import sessionmaker
from backend.database.connection import engine

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI dependency to yield a database session per request 
    and ensure it is closed automatically.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()