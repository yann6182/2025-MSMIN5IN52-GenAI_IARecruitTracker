#!/usr/bin/env python3
"""
Script pour créer des emails de test pour tester l'analyse NLP
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.models.models import Email
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

def create_test_emails():
    """Créer des emails de test pour l'analyse NLP"""
    db = next(get_db())
    
    # Supprimer les anciens emails de test
    db.query(Email).filter(Email.external_id.like('test-%')).delete()
    db.commit()
    print("Anciens emails de test supprimés")
    
    test_emails = [
        {
            "subject": "Accusé de réception de votre candidature - Poste de Développeur Full Stack",
            "body": "Bonjour, Nous avons bien reçu votre candidature pour le poste de Développeur Full Stack. Votre profil sera étudié par notre équipe RH et nous vous contacterons rapidement. Cordialement, L'équipe RH de TechCorp",
            "sender": "rh@techcorp.com",
            "snippet": "Accusé de réception candidature développeur",
            "classification": "ACK"
        },
        {
            "subject": "Refus candidature - Ingénieur Data Science",
            "body": "Bonjour, Nous vous remercions pour l'intérêt que vous portez à notre entreprise. Malheureusement, nous ne pouvons pas donner suite à votre candidature pour le poste d'Ingénieur Data Science. Nous vous souhaitons bonne chance dans vos recherches. Cordialement, DataViz Inc.",
            "sender": "recrutement@dataviz.com",
            "snippet": "Refus candidature data science",
            "classification": "REJECTED"
        },
        {
            "subject": "Invitation entretien - Développeur Python Senior",
            "body": "Bonjour, Votre profil nous intéresse pour le poste de Développeur Python Senior. Nous souhaiterions vous rencontrer en entretien. Seriez-vous disponible mardi prochain à 14h pour un entretien en visioconférence ? Merci de confirmer votre présence. Cordialement, Marie Dubois - RH StartupAI",
            "sender": "marie.dubois@startup-ai.fr",
            "snippet": "Invitation entretien développeur python",
            "classification": "INTERVIEW"
        },
        {
            "subject": "Offre d'emploi - Lead Developer chez InnovTech",
            "body": "Félicitations ! Nous avons le plaisir de vous proposer le poste de Lead Developer au sein de notre équipe. Salaire proposé: 65k€ annuel. Avantages: télétravail partiel, tickets restaurant, mutuelle. Merci de nous faire savoir si vous acceptez cette offre avant vendredi. Cordialement, L'équipe RH InnovTech",
            "sender": "jobs@innovtech.com",
            "snippet": "Offre emploi lead developer",
            "classification": "OFFER"
        },
        {
            "subject": "Demande de documents complémentaires",
            "body": "Bonjour, Pour finaliser votre dossier de candidature, nous aurions besoin des documents suivants: - CV actualisé - Lettre de motivation - Copie de vos diplômes - Références professionnelles. Merci de nous les envoyer dans les plus brefs délais. Cordialement, Service RH CloudSoft",
            "sender": "documents@cloudsoft.net",
            "snippet": "Demande documents candidature",
            "classification": "REQUEST"
        },
        {
            "subject": "Application Received - Full Stack Developer Position",
            "body": "Dear candidate, Thank you for your application for the Full Stack Developer position at GlobalTech. Your application has been received and is under review. We will contact you within the next week with updates. Best regards, HR Team GlobalTech",
            "sender": "hr@globaltech.com",
            "snippet": "Application received full stack",
            "classification": "ACK"
        }
    ]
    
    created_count = 0
    for email_data in test_emails:
        email = Email(
            id=uuid.uuid4(),
            external_id=f"test-{uuid.uuid4()}",
            subject=email_data["subject"],
            raw_body=email_data["body"],
            snippet=email_data["snippet"],
            sender=email_data["sender"],
            recipients=["yannickngaleu6@gmail.com"],
            cc=[],  # Liste vide au lieu de NULL
            bcc=[], # Liste vide au lieu de NULL
            sent_at=datetime.now(timezone.utc),
            classification=email_data["classification"],  # Ajouter la classification
            created_at=datetime.now(timezone.utc)
        )
        db.add(email)
        created_count += 1
    
    db.commit()
    print(f"Créé {created_count} emails de test avec succès!")
    
    # Vérifier la création
    total_emails = db.query(Email).count()
    print(f"Total emails dans la base: {total_emails}")

if __name__ == "__main__":
    create_test_emails()
