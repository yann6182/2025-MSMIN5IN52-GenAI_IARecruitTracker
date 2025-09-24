from fastapi import APIRouter
from app.api.v1.endpoints import applications, emails, ingestion

api_router = APIRouter()

api_router.include_router(applications.router, prefix="/applications", tags=["applications"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
