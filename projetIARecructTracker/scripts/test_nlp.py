#!/usr/bin/env python3
"""
Script de test des fonctionnalités NLP
Teste les services d'extraction, classification et matching
"""

import asyncio
import json
import os
import sys
from typing import Dict, Any

import httpx

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30.0

# Emails de test pour chaque type
TEST_EMAILS = {
    "ACK": {
        "subject": "Accusé de réception - Candidature Développeur Python",
        "body": """Bonjour,

Nous avons bien reçu votre candidature pour le poste de Développeur Python Senior chez TechCorp.

Notre équipe RH va étudier votre profil et vous recontactera sous 15 jours.

Merci pour votre intérêt pour notre entreprise.

Cordialement,
Marie Dubois
Responsable RH
TechCorp
marie.dubois@techcorp.com
+33 1 23 45 67 89""",
        "sender_email": "rh@techcorp.com"
    },
    
    "REJECTED": {
        "subject": "Suite de votre candidature - TechCorp",
        "body": """Bonjour,

Nous vous remercions pour l'intérêt que vous portez à TechCorp et pour le temps consacré à votre candidature.

Après étude attentive de votre dossier pour le poste de Data Scientist, nous avons le regret de vous informer que nous ne donnerons pas suite à votre candidature. Votre profil ne correspond pas exactement aux exigences actuelles du poste.

Nous conservons néanmoins votre CV dans notre base de données et n'hésiterons pas à vous recontacter si un poste correspondant mieux à votre profil se présentait.

Nous vous souhaitons une excellente continuation dans vos recherches.

Cordialement,
Service Recrutement TechCorp""",
        "sender_email": "recrutement@techcorp.com"
    },
    
    "INTERVIEW": {
        "subject": "Convocation entretien - Poste DevOps Engineer",
        "body": """Bonjour,

Suite à l'étude de votre candidature pour le poste de DevOps Engineer chez CloudFirst, nous souhaitons vous rencontrer pour un entretien.

Seriez-vous disponible la semaine du 15 janvier pour un entretien d'environ 1h ?

L'entretien se déroulera dans nos locaux au 42 rue de la Tech, 75001 Paris, ou en visioconférence selon votre préférence.

Merci de nous confirmer vos disponibilités dans les meilleurs délais.

Dans l'attente de votre retour.

Cordialement,
Jean Martin
Manager Technique
CloudFirst
jean.martin@cloudfirst.io
Tel: +33 1 98 76 54 32""",
        "sender_email": "jean.martin@cloudfirst.io"
    },
    
    "OFFER": {
        "subject": "Offre d'emploi - Full Stack Developer chez WebFactory",
        "body": """Félicitations !

Nous avons le plaisir de vous proposer le poste de Full Stack Developer au sein de notre équipe WebFactory.

Détails de l'offre :
- Poste : Full Stack Developer (CDI)
- Salaire : 52 000€ bruts annuels
- Avantages : Tickets restaurant, mutuelle, télétravail 2j/semaine
- Date de début souhaitée : 1er février 2024
- Lieu : Paris 11ème + télétravail

Cette offre est valable jusqu'au 31 janvier 2024.

Merci de nous faire savoir si cette proposition vous intéresse. Nous restons à votre disposition pour tout complément d'information.

Bien cordialement,
Sophie Laurent
Directrice RH WebFactory
sophie.laurent@webfactory.fr
+33 1 45 67 89 01""",
        "sender_email": "rh@webfactory.fr"
    },
    
    "REQUEST": {
        "subject": "Complément d'informations - Dossier candidature",
        "body": """Bonjour,

Votre candidature pour le poste de Machine Learning Engineer chez AI Innovations retient notre attention.

Afin de poursuivre le processus de recrutement, pourriez-vous nous transmettre les éléments suivants :

1. Vos trois derniers bulletins de salaire
2. Une attestation Pôle Emploi (si applicable)  
3. Deux références professionnelles avec coordonnées
4. Vos prétentions salariales actuelles
5. Votre disponibilité pour commencer

Ces documents nous permettront de finaliser l'étude de votre dossier.

Merci de nous transmettre ces éléments dans les 5 jours ouvrés.

Cordialement,
Thomas Berger
Chargé de recrutement
AI Innovations
thomas.berger@ai-innov.com""",
        "sender_email": "recrutement@ai-innov.com"
    }
}


def print_section(title: str):
    """Afficher un titre de section"""
    print(f"\n{'='*60}")
    print(f"🧪 {title}")
    print('='*60)


def print_result(test_name: str, result: Dict[str, Any], success: bool = True):
    """Afficher le résultat d'un test"""
    status = "✅" if success else "❌"
    print(f"\n{status} {test_name}")
    if success and result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif not success:
        print(f"   Erreur: {result}")


async def test_extraction(client: httpx.AsyncClient, email_data: Dict[str, str]):
    """Tester l'extraction d'entités"""
    try:
        response = await client.post(
            f"{API_BASE_URL}/nlp/extract",
            json=email_data,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        return response.json(), True
    except Exception as e:
        return str(e), False


async def test_classification(client: httpx.AsyncClient, email_data: Dict[str, str]):
    """Tester la classification d'email"""
    try:
        response = await client.post(
            f"{API_BASE_URL}/nlp/classify",
            json=email_data,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        return response.json(), True
    except Exception as e:
        return str(e), False


async def test_matching(client: httpx.AsyncClient, email_data: Dict[str, str]):
    """Tester le matching sémantique"""
    try:
        response = await client.post(
            f"{API_BASE_URL}/nlp/match",
            json=email_data,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        return response.json(), True
    except Exception as e:
        return str(e), False


async def test_full_processing(client: httpx.AsyncClient, email_data: Dict[str, str]):
    """Tester le traitement complet NLP"""
    try:
        response = await client.post(
            f"{API_BASE_URL}/nlp/process",
            json=email_data,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        return response.json(), True
    except Exception as e:
        return str(e), False


async def test_health_check(client: httpx.AsyncClient):
    """Vérifier que l'API est accessible"""
    try:
        response = await client.get(f"{API_BASE_URL}/health")
        response.raise_for_status()
        return response.json(), True
    except Exception as e:
        return str(e), False


async def run_tests():
    """Exécuter tous les tests"""
    print("🚀 Tests des fonctionnalités NLP - AI Recruit Tracker")
    print("📡 URL API:", API_BASE_URL)
    
    async with httpx.AsyncClient() as client:
        # Test de connectivité
        print_section("Test de connectivité")
        health_result, health_success = await test_health_check(client)
        print_result("Health Check API", health_result, health_success)
        
        if not health_success:
            print("\n❌ L'API n'est pas accessible. Vérifiez que le backend est démarré.")
            print("   Commande: docker-compose up -d backend")
            return
        
        # Tests pour chaque type d'email
        for email_type, email_data in TEST_EMAILS.items():
            print_section(f"Tests pour email type: {email_type}")
            
            print(f"\n📧 Email de test:")
            print(f"   Sujet: {email_data['subject']}")
            print(f"   Expéditeur: {email_data['sender_email']}")
            print(f"   Longueur corps: {len(email_data['body'])} caractères")
            
            # Test extraction
            extract_result, extract_success = await test_extraction(client, email_data)
            print_result("Extraction d'entités", extract_result, extract_success)
            
            # Test classification
            classify_result, classify_success = await test_classification(client, email_data)
            print_result("Classification", classify_result, classify_success)
            
            # Test matching
            match_result, match_success = await test_matching(client, email_data)
            print_result("Matching sémantique", match_result, match_success)
            
            # Test traitement complet
            process_result, process_success = await test_full_processing(client, email_data)
            print_result("Traitement complet", process_result, process_success)
            
            # Vérification des résultats attendus
            if classify_success and classify_result:
                predicted_type = classify_result.get('email_type', 'UNKNOWN')
                confidence = classify_result.get('confidence', 0)
                
                if predicted_type == email_type:
                    print(f"   ✅ Classification correcte: {predicted_type} (confiance: {confidence:.2f})")
                else:
                    print(f"   ⚠️  Classification différente: attendu {email_type}, obtenu {predicted_type}")
        
        print_section("Résumé des tests")
        print("✅ Tests terminés avec succès !")
        print("\n📊 Points à vérifier :")
        print("   • Les classifications correspondent-elles aux attentes ?")
        print("   • Les extractions contiennent-elles les bonnes entités ?")
        print("   • Les scores de confiance sont-ils cohérents ?")
        print("   • Le matching trouve-t-il des candidatures similaires ?")
        
        print("\n🔧 Pour déboguer :")
        print("   • Vérifiez les logs: docker-compose logs -f backend")
        print("   • Testez manuellement: http://localhost:8000/docs")
        print("   • Vérifiez la config Mistral dans backend/.env")


async def main():
    """Point d'entrée principal"""
    # Vérification des prérequis
    if not os.getenv("MISTRAL_API_KEY"):
        print("⚠️  Variable MISTRAL_API_KEY non trouvée")
        print("   Assurez-vous que backend/.env contient votre clé API Mistral")
    
    try:
        await run_tests()
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrompus par l'utilisateur")
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
