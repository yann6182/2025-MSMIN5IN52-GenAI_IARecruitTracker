from pydantic_settings import BaseSettings
from pydantic import validator
from typing import List, Union
import os


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS - will be parsed from comma-separated string
    ALLOWED_ORIGINS: Union[List[str], str]
    
    # Backend URL for OAuth callbacks
    BACKEND_URL: str = "http://localhost:8000"
    
    # Email providers
    GMAIL_CLIENT_ID: str
    GMAIL_CLIENT_SECRET: str
    
    # IMAP settings
    IMAP_HOST: str = "imap.gmail.com"
    IMAP_USER: str
    IMAP_PASSWORD: str
    
    # Scheduler
    INGESTION_INTERVAL_MINUTES: int = 10
    REMINDER_CHECK_INTERVAL_HOURS: int = 24
    
    # Classification
    CLASSIFICATION_MODEL_PATH: str = "models/classification_model.pkl"
    CLASSIFICATION_RULES_PATH: str = "rules/"
    
    # Mistral AI
    MISTRAL_API_KEY: str
    MISTRAL_EXTRACTION_MODEL: str = "mistral-small-latest"
    MISTRAL_LARGE_MODEL: str = "mistral-large-latest"
    MISTRAL_EMBED_MODEL: str = "mistral-embed"
    MISTRAL_TEMPERATURE: float = 0.1
    MISTRAL_MAX_TOKENS: int = 1000
    
    # NLP Settings
    SIMILARITY_THRESHOLD: float = 0.7
    CLASSIFICATION_CONFIDENCE_THRESHOLD: float = 0.8
    
    @validator('ALLOWED_ORIGINS', pre=True)
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins from .env"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
