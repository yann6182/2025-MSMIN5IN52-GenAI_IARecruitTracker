from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title="AI Recruit Tracker",
    version="1.0.0",
    description="Gestion intelligente des candidatures à partir des emails et d'actions manuelles"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "AI Recruit Tracker API is running"}

@app.get("/")
def root():
    return {"message": "Welcome to AI Recruit Tracker API"}
