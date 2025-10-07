#!/usr/bin/env python3
"""
Script pour créer la base de données PostgreSQL
"""
import psycopg
from app.core.config import settings
from loguru import logger

def create_database():
    """Créer la base de données si elle n'existe pas"""
    try:
        # Extraire les paramètres de connexion de l'URL
        url_parts = settings.DATABASE_URL.replace("postgresql+psycopg://", "").split("@")
        user_password = url_parts[0]
        host_db = url_parts[1]
        
        user, password = user_password.split(":")
        host_port, db_name = host_db.split("/")
        host, port = host_port.split(":")
        
        # Se connecter à la base postgres par défaut pour créer la nouvelle base
        default_url = f"postgresql://{user}:{password}@{host}:{port}/postgres"
        
        logger.info(f"Tentative de connexion à PostgreSQL sur {host}:{port}")
        
        with psycopg.connect(default_url) as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                # Vérifier si la base de données existe
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                exists = cur.fetchone()
                
                if not exists:
                    logger.info(f"Création de la base de données '{db_name}'...")
                    cur.execute(f'CREATE DATABASE "{db_name}"')
                    logger.success(f"✅ Base de données '{db_name}' créée avec succès")
                else:
                    logger.info(f"✅ La base de données '{db_name}' existe déjà")
                    
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création de la base de données: {e}")
        raise

def test_connection():
    """Tester la connexion à la base de données"""
    try:
        logger.info("Test de connexion à la base de données...")
        
        with psycopg.connect(settings.DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version()")
                version = cur.fetchone()
                logger.success(f"✅ Connexion réussie - PostgreSQL version: {version[0]}")
                
    except Exception as e:
        logger.error(f"❌ Erreur de connexion: {e}")
        raise

if __name__ == "__main__":
    logger.info("🔧 Configuration de la base de données PostgreSQL")
    logger.info("=" * 50)
    
    try:
        create_database()
        test_connection()
        logger.success("🎉 Configuration de la base de données terminée avec succès")
    except Exception as e:
        logger.error(f"💥 Échec de la configuration: {e}")
        exit(1)
