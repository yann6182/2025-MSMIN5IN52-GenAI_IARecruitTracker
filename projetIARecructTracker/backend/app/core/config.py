from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg://airtrack:airtrackpwd@db:5432/airtrackdb"
    
    # Security
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:3000"]
    
    # Email providers
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    
    # IMAP settings
    IMAP_HOST: str = ""
    IMAP_USER: str = ""
    IMAP_PASSWORD: str = ""
    
    # Scheduler
    INGESTION_INTERVAL_MINUTES: int = 10
    REMINDER_CHECK_INTERVAL_HOURS: int = 24
    
    # Classification
    CLASSIFICATION_MODEL_PATH: str = "models/classification_model.pkl"
    CLASSIFICATION_RULES_PATH: str = "rules/"
    
    class Config:
        env_file = ".env"


settings = Settings()
