from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    DATABASE_URL: str
    LLM_API_KEY: str
    LLM_MODEL: str = "openai/gpt-oss-20b"
    UPLOAD_DIRECTORY: str = "./uploads"
    ENVIRONMENT: str = "development"
    JWT_SECRET_KEY: str = "aegis_trial_jwt_super_secret_key_2026_clinical_research"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Email & SMTP Settings
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "AegisTrial Clinical Platform"

    # Read directly from backend/.env
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()