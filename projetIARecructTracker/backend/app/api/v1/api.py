from fastapi import APIRouter
from app.api.v1.endpoints import applications, emails, ingestion, nlp, companies, job_offers, application_events, emails_ingestion, intelligent_tracker, auth, oauth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(oauth.router, prefix="/oauth", tags=["oauth"])
api_router.include_router(applications.router, prefix="/job-applications", tags=["job-applications"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(job_offers.router, prefix="/job-offers", tags=["job-offers"])
api_router.include_router(emails.router, prefix="/emails", tags=["emails"])
api_router.include_router(emails_ingestion.router, prefix="/email-ingestion", tags=["email-ingestion"])
api_router.include_router(application_events.router, prefix="/application-events", tags=["application-events"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
api_router.include_router(nlp.router, prefix="/nlp", tags=["nlp"])
api_router.include_router(intelligent_tracker.router, prefix="/intelligent-tracker", tags=["intelligent-tracker"])
