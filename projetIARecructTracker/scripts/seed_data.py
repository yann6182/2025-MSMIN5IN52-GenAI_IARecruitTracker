#!/usr/bin/env python3
"""
Script de génération de données de test pour AI Recruit Tracker
Crée des entreprises, offres d'emploi, candidatures et emails de test
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import List

import asyncpg
from faker import Faker

# Configuration
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/iat_db"
fake = Faker(['fr_FR', 'en_US'])

# Données de test réalistes
COMPANIES = [
    {"name": "TechCorp", "domain": "techcorp.com", "size": "startup"},
    {"name": "DataViz Solutions", "domain": "dataviz.fr", "size": "medium"},
    {"name": "AI Innovations", "domain": "ai-innov.com", "size": "large"},
    {"name": "CloudFirst", "domain": "cloudfirst.io", "size": "startup"},
    {"name": "WebFactory", "domain": "webfactory.fr", "size": "medium"},
    {"name": "DevOps Masters", "domain": "devops-masters.com", "size": "small"},
    {"name": "Fintech Plus", "domain": "fintech-plus.fr", "size": "large"},
    {"name": "GreenTech Solutions", "domain": "greentech.org", "size": "medium"},
    {"name": "CyberSec Corp", "domain": "cybersec.com", "size": "startup"},
    {"name": "Mobile First", "domain": "mobile-first.app", "size": "small"}
]

JOB_TITLES = [
    "Développeur Python Senior",
    "Data Scientist",
    "DevOps Engineer", 
    "Full Stack Developer",
    "Machine Learning Engineer",
    "Frontend Developer React",
    "Backend Developer Node.js",
    "Cloud Architect",
    "Product Manager Tech",
    "Ingénieur IA"
]

EMAIL_TEMPLATES = {
    "ACK": [
        {
            "subject": "Accusé de réception - Candidature {job_title}",
            "body": "Bonjour,\n\nNous avons bien reçu votre candidature pour le poste de {job_title} chez {company}.\n\nNotre équipe RH va étudier votre profil et vous recontactera sous 15 jours.\n\nCordialement,\nÉquipe RH {company}"
        },
        {
            "subject": "Application received - {job_title} position",
            "body": "Dear candidate,\n\nThank you for applying to the {job_title} position at {company}.\n\nWe will review your application and get back to you within 2 weeks.\n\nBest regards,\nHR Team {company}"
        }
    ],
    "REJECTED": [
        {
            "subject": "Suite de votre candidature - {company}",
            "body": "Bonjour,\n\nNous vous remercions pour l'intérêt que vous portez à {company}.\n\nMalheureusement, nous ne donnerons pas suite à votre candidature pour le poste de {job_title}. Votre profil ne correspond pas exactement aux exigences actuelles.\n\nNous conservons votre CV dans notre base de données pour de futures opportunités.\n\nCordialement,\nService Recrutement"
        },
        {
            "subject": "Update on your application - {company}",
            "body": "Dear candidate,\n\nThank you for your interest in the {job_title} position at {company}.\n\nAfter careful consideration, we have decided not to move forward with your application. We received many qualified candidates and had to make difficult decisions.\n\nWe wish you success in your job search.\n\nBest regards,\nHiring Team"
        }
    ],
    "INTERVIEW": [
        {
            "subject": "Convocation entretien - {job_title} chez {company}",
            "body": "Bonjour,\n\nNous souhaitons vous rencontrer pour un entretien concernant le poste de {job_title}.\n\nSeriez-vous disponible la semaine prochaine ?\n\nMerci de nous confirmer vos disponibilités.\n\nCordialement,\n{sender_name}\nRH {company}"
        },
        {
            "subject": "Interview invitation - {job_title} at {company}",
            "body": "Dear candidate,\n\nWe would like to schedule an interview for the {job_title} position.\n\nAre you available next week for a 1-hour interview?\n\nPlease let us know your availability.\n\nBest regards,\n{sender_name}\nHR {company}"
        }
    ],
    "OFFER": [
        {
            "subject": "Offre d'emploi - {job_title} chez {company}",
            "body": "Bonjour,\n\nNous avons le plaisir de vous proposer le poste de {job_title} chez {company}.\n\nSalaire proposé : 45-55k€\nDate de début : Dès que possible\n\nMerci de nous faire savoir si cette offre vous intéresse.\n\nFélicitations !\nÉquipe RH"
        },
        {
            "subject": "Job Offer - {job_title} at {company}",
            "body": "Congratulations!\n\nWe are pleased to offer you the {job_title} position at {company}.\n\nSalary: €45,000-55,000\nStart date: ASAP\n\nPlease let us know if you accept this offer.\n\nBest regards,\nHiring Team"
        }
    ],
    "REQUEST": [
        {
            "subject": "Complément d'informations - Candidature {company}",
            "body": "Bonjour,\n\nPourriez-vous nous transmettre les documents suivants :\n- Derniers bulletins de salaire\n- Attestation Pôle Emploi\n- Références professionnelles\n\nCela nous permettra de finaliser l'étude de votre dossier.\n\nCordialement,\nService RH"
        },
        {
            "subject": "Additional documents needed - {company}",
            "body": "Dear candidate,\n\nCould you please provide the following documents:\n- References from previous employers\n- Salary expectations\n- Availability date\n\nThis will help us complete your application review.\n\nThank you,\nHR Team"
        }
    ]
}

STATUSES = ["APPLIED", "ACKNOWLEDGED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "ACCEPTED"]


async def create_connection():
    """Créer une connexion à la base de données"""
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Erreur de connexion à la base : {e}")
        return None


async def seed_companies(conn) -> List[str]:
    """Créer les entreprises de test"""
    print("🏢 Création des entreprises...")
    company_ids = []
    
    for company_data in COMPANIES:
        company_id = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO companies (id, name, website, industry, size, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (name) DO NOTHING
        """, company_id, company_data["name"], f"https://{company_data['domain']}", 
            "Technology", company_data["size"], datetime.utcnow())
        company_ids.append(company_id)
    
    print(f"✅ {len(COMPANIES)} entreprises créées")
    return company_ids


async def seed_job_offers(conn, company_ids: List[str]) -> List[str]:
    """Créer les offres d'emploi"""
    print("💼 Création des offres d'emploi...")
    job_offer_ids = []
    
    for i in range(20):
        job_id = str(uuid.uuid4())
        company_id = random.choice(company_ids)
        title = random.choice(JOB_TITLES)
        
        await conn.execute("""
            INSERT INTO job_offers (id, company_id, title, description, location, 
                                  salary_min, salary_max, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, job_id, company_id, title, f"Poste de {title} - Description détaillée...",
            fake.city(), 35000, 60000, "ACTIVE", datetime.utcnow())
        job_offer_ids.append(job_id)
    
    print(f"✅ {len(job_offer_ids)} offres d'emploi créées")
    return job_offer_ids


async def seed_applications(conn, job_offer_ids: List[str]) -> List[str]:
    """Créer les candidatures"""
    print("📝 Création des candidatures...")
    application_ids = []
    
    for i in range(50):
        app_id = str(uuid.uuid4())
        job_offer_id = random.choice(job_offer_ids)
        status = random.choice(STATUSES)
        applied_date = fake.date_between(start_date='-3M', end_date='today')
        
        await conn.execute("""
            INSERT INTO job_applications (id, job_offer_id, status, applied_date, 
                                        notes, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, app_id, job_offer_id, status, applied_date, 
            f"Candidature pour {fake.job()}", datetime.utcnow(), datetime.utcnow())
        application_ids.append(app_id)
    
    print(f"✅ {len(application_ids)} candidatures créées")
    return application_ids


async def seed_emails(conn, application_ids: List[str], company_ids: List[str]):
    """Créer les emails de test"""
    print("📧 Création des emails de test...")
    
    # Récupérer les données des entreprises et candidatures
    companies_data = await conn.fetch("""
        SELECT id, name FROM companies WHERE id = ANY($1::uuid[])
    """, company_ids)
    
    applications_data = await conn.fetch("""
        SELECT ja.id, jo.title, c.name as company_name
        FROM job_applications ja
        JOIN job_offers jo ON ja.job_offer_id = jo.id  
        JOIN companies c ON jo.company_id = c.id
        WHERE ja.id = ANY($1::uuid[])
    """, application_ids)
    
    email_count = 0
    
    for app_data in applications_data:
        # Générer 1-3 emails par candidature
        num_emails = random.randint(1, 3)
        
        for _ in range(num_emails):
            email_id = str(uuid.uuid4())
            email_type = random.choice(list(EMAIL_TEMPLATES.keys()))
            template = random.choice(EMAIL_TEMPLATES[email_type])
            
            # Personnaliser le template
            subject = template["subject"].format(
                job_title=app_data['title'],
                company=app_data['company_name']
            )
            body = template["body"].format(
                job_title=app_data['title'],
                company=app_data['company_name'],
                sender_name=fake.name()
            )
            
            sender_email = f"rh@{app_data['company_name'].lower().replace(' ', '-')}.com"
            received_date = fake.date_time_between(start_date='-2M', end_date='now')
            
            await conn.execute("""
                INSERT INTO emails (id, subject, body, sender_email, sender_name,
                                  received_date, application_id, email_type, is_processed, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, email_id, subject, body, sender_email, fake.name(),
                received_date, app_data['id'], email_type, False, datetime.utcnow())
            
            email_count += 1
    
    print(f"✅ {email_count} emails créés")


async def seed_events(conn, application_ids: List[str]):
    """Créer des événements de suivi"""
    print("📊 Création des événements...")
    
    event_count = 0
    event_types = ["APPLICATION_SUBMITTED", "EMAIL_RECEIVED", "STATUS_CHANGED", "INTERVIEW_SCHEDULED"]
    
    for app_id in application_ids:
        # 2-5 événements par candidature
        num_events = random.randint(2, 5)
        
        for i in range(num_events):
            event_id = str(uuid.uuid4())
            event_type = random.choice(event_types)
            event_date = fake.date_time_between(start_date='-2M', end_date='now')
            
            description = f"Événement {event_type} pour la candidature"
            if event_type == "STATUS_CHANGED":
                old_status = random.choice(STATUSES)
                new_status = random.choice(STATUSES)
                description = f"Statut changé de {old_status} vers {new_status}"
            
            await conn.execute("""
                INSERT INTO application_events (id, application_id, event_type, 
                                              description, event_date, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, event_id, app_id, event_type, description, event_date, datetime.utcnow())
            
            event_count += 1
    
    print(f"✅ {event_count} événements créés")


async def main():
    """Script principal"""
    print("🚀 Démarrage de la création des données de test...")
    print("=" * 50)
    
    conn = await create_connection()
    if not conn:
        print("❌ Impossible de se connecter à la base de données")
        return
    
    try:
        # Créer les données dans l'ordre des dépendances
        company_ids = await seed_companies(conn)
        job_offer_ids = await seed_job_offers(conn, company_ids)
        application_ids = await seed_applications(conn, job_offer_ids)
        await seed_emails(conn, application_ids, company_ids)
        await seed_events(conn, application_ids)
        
        print("=" * 50)
        print("✅ Données de test créées avec succès !")
        print("\n📈 Résumé :")
        print(f"   • {len(COMPANIES)} entreprises")
        print(f"   • {len(job_offer_ids)} offres d'emploi")
        print(f"   • {len(application_ids)} candidatures")
        print(f"   • ~100-150 emails de test")
        print(f"   • ~100-250 événements")
        print("\n🎯 Prêt pour tester les fonctionnalités NLP !")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création des données : {e}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
