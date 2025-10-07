#!/usr/bin/env python3
"""
Script de vérification de l'installation et configuration
Vérifie que tous les services sont correctement configurés
"""

import asyncio
import json
import os
import subprocess
import sys
from typing import Dict, List, Tuple

import httpx


def print_header(title: str):
    """Afficher un en-tête de section"""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print('='*60)


def print_check(name: str, status: bool, details: str = ""):
    """Afficher le résultat d'une vérification"""
    icon = "✅" if status else "❌"
    print(f"{icon} {name}")
    if details:
        print(f"   {details}")


def run_command(command: str) -> Tuple[bool, str]:
    """Exécuter une commande shell"""
    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=10
        )
        return result.returncode == 0, result.stdout.strip()
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def check_docker():
    """Vérifier Docker et Docker Compose"""
    print_header("Vérification Docker")
    
    # Docker
    docker_ok, docker_version = run_command("docker --version")
    print_check("Docker installé", docker_ok, docker_version if docker_ok else "Docker non trouvé")
    
    # Docker Compose
    compose_ok, compose_version = run_command("docker-compose --version")
    print_check("Docker Compose installé", compose_ok, compose_version if compose_ok else "Docker Compose non trouvé")
    
    # Docker daemon
    daemon_ok, _ = run_command("docker ps")
    print_check("Docker daemon actif", daemon_ok, "Docker fonctionne" if daemon_ok else "Démarrez Docker")
    
    return docker_ok and compose_ok and daemon_ok


def check_services():
    """Vérifier les services Docker"""
    print_header("Vérification des services")
    
    # Status des conteneurs
    status_ok, status_output = run_command("docker-compose ps --format json")
    
    if not status_ok:
        print_check("Services Docker", False, "docker-compose ps a échoué")
        return False
    
    try:
        if status_output.strip():
            services = [json.loads(line) for line in status_output.strip().split('\n')]
        else:
            services = []
    except:
        services = []
    
    expected_services = ["db", "backend", "frontend", "nginx"]
    running_services = []
    
    for service in services:
        service_name = service.get("Service", "")
        state = service.get("State", "")
        is_running = state.lower() == "running"
        
        print_check(f"Service {service_name}", is_running, 
                   f"État: {state}" if is_running else f"État: {state} - Redémarrez avec docker-compose up -d")
        
        if is_running:
            running_services.append(service_name)
    
    missing_services = [s for s in expected_services if s not in running_services]
    if missing_services:
        print(f"\n⚠️  Services manquants: {', '.join(missing_services)}")
        print("   Commande: docker-compose up -d")
    
    return len(missing_services) == 0


async def check_api_health():
    """Vérifier la santé des APIs"""
    print_header("Vérification APIs")
    
    endpoints = [
        ("Backend API", "http://localhost:8000/health"),
        ("Frontend", "http://localhost:4200"),
        ("Swagger UI", "http://localhost:8000/docs"),
    ]
    
    all_ok = True
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in endpoints:
            try:
                response = await client.get(url)
                is_ok = response.status_code in [200, 201]
                print_check(name, is_ok, 
                           f"Status: {response.status_code}" if is_ok 
                           else f"Erreur HTTP: {response.status_code}")
                all_ok = all_ok and is_ok
            except Exception as e:
                print_check(name, False, f"Connexion impossible: {str(e)}")
                all_ok = False
    
    return all_ok


def check_env_files():
    """Vérifier les fichiers de configuration"""
    print_header("Vérification configuration")
    
    env_files = [
        ("backend/.env", ["DATABASE_URL", "MISTRAL_API_KEY"]),
        ("frontend/.env", []),
        ("docker-compose.yml", []),
    ]
    
    all_ok = True
    for file_path, required_vars in env_files:
        file_exists = os.path.exists(file_path)
        print_check(f"Fichier {file_path}", file_exists, 
                   "Trouvé" if file_exists else "Créez le fichier depuis .env.example")
        
        if not file_exists:
            all_ok = False
            continue
        
        # Vérifier les variables requises pour les .env
        if file_path.endswith('.env') and required_vars:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                for var in required_vars:
                    var_present = f"{var}=" in content and not f"{var}=" in content.split(f"{var}=")[1].split('\n')[0].strip() == ""
                    print_check(f"  Variable {var}", var_present,
                               "Configurée" if var_present else "Manquante ou vide")
                    all_ok = all_ok and var_present
            except Exception as e:
                print_check(f"  Lecture {file_path}", False, str(e))
                all_ok = False
    
    return all_ok


def check_database():
    """Vérifier la base de données"""
    print_header("Vérification base de données")
    
    # Test de connexion via Docker
    db_ok, db_output = run_command(
        "docker-compose exec -T db psql -U postgres -d iat_db -c '\\dt' 2>/dev/null || echo 'DB_ERROR'"
    )
    
    if "DB_ERROR" in db_output or not db_ok:
        print_check("Connexion PostgreSQL", False, "Base inaccessible")
        print("   Vérifiez: docker-compose logs db")
        return False
    
    print_check("Connexion PostgreSQL", True, "Base accessible")
    
    # Vérifier quelques tables principales
    expected_tables = ["companies", "job_offers", "job_applications", "emails"]
    tables_found = []
    
    for line in db_output.split('\n'):
        if '|' in line and 'public' in line:
            table_name = line.split('|')[1].strip()
            if table_name in expected_tables:
                tables_found.append(table_name)
    
    for table in expected_tables:
        table_exists = table in tables_found
        print_check(f"  Table {table}", table_exists,
                   "Présente" if table_exists else "Manquante - Lancez les migrations")
    
    missing_tables = [t for t in expected_tables if t not in tables_found]
    if missing_tables:
        print("\n📝 Pour créer les tables manquantes:")
        print("   docker-compose exec backend alembic upgrade head")
    
    return len(missing_tables) == 0


def check_mistral_config():
    """Vérifier la configuration Mistral AI"""
    print_header("Vérification Mistral AI")
    
    # Vérifier les variables d'environnement
    env_vars = {
        "MISTRAL_API_KEY": os.getenv("MISTRAL_API_KEY"),
        "MISTRAL_EXTRACTION_MODEL": os.getenv("MISTRAL_EXTRACTION_MODEL", "mistral-small-latest"),
        "MISTRAL_EMBED_MODEL": os.getenv("MISTRAL_EMBED_MODEL", "mistral-embed"),
    }
    
    config_ok = True
    for var, value in env_vars.items():
        has_value = value is not None and value.strip() != ""
        print_check(f"Variable {var}", has_value,
                   f"Valeur: {value[:20]}..." if has_value and len(value) > 20
                   else value if has_value else "Non définie")
        if var == "MISTRAL_API_KEY":
            config_ok = config_ok and has_value
    
    if not config_ok:
        print("\n🔑 Pour configurer Mistral AI:")
        print("   1. Créez un compte sur console.mistral.ai")
        print("   2. Générez une clé API")
        print("   3. Ajoutez MISTRAL_API_KEY=votre-clé dans backend/.env")
        print("   4. Redémarrez: docker-compose restart backend")
    
    return config_ok


def print_summary(checks: Dict[str, bool]):
    """Afficher le résumé des vérifications"""
    print_header("Résumé de la vérification")
    
    total_checks = len(checks)
    passed_checks = sum(checks.values())
    
    print(f"📊 Résultats: {passed_checks}/{total_checks} vérifications passées")
    
    if passed_checks == total_checks:
        print("\n🎉 Parfait ! Votre installation est complète et fonctionnelle.")
        print("\n🚀 Prochaines étapes :")
        print("   • Testez les APIs: python scripts/test_nlp.py")
        print("   • Créez des données: python scripts/seed_data.py")
        print("   • Ouvrez l'app: http://localhost:4200")
    else:
        print(f"\n⚠️  {total_checks - passed_checks} problème(s) détecté(s)")
        print("\n🔧 Actions recommandées :")
        
        failed_checks = [name for name, status in checks.items() if not status]
        for check in failed_checks:
            print(f"   • Corriger: {check}")
        
        print("\n📖 Consultez la documentation:")
        print("   • Guide de démarrage: docs/quick-start.md")
        print("   • Architecture: docs/architecture.md")


async def main():
    """Point d'entrée principal"""
    print("🔍 Vérification de l'installation - AI Recruit Tracker")
    print("📍 Répertoire:", os.getcwd())
    
    # Changer vers le répertoire du projet si nécessaire
    if not os.path.exists("docker-compose.yml"):
        project_dir = "projetIARecructTracker"
        if os.path.exists(project_dir):
            os.chdir(project_dir)
            print(f"📂 Changement vers: {os.getcwd()}")
        else:
            print("❌ Fichier docker-compose.yml non trouvé")
            print("   Exécutez ce script depuis le dossier racine du projet")
            sys.exit(1)
    
    # Exécuter toutes les vérifications
    checks = {}
    
    checks["Docker"] = check_docker()
    checks["Services"] = check_services()
    checks["Configuration"] = check_env_files()
    checks["Base de données"] = check_database()
    checks["Mistral AI"] = check_mistral_config()
    checks["APIs"] = await check_api_health()
    
    print_summary(checks)
    
    return all(checks.values())


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Vérification interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        sys.exit(1)
