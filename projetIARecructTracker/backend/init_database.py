#!/usr/bin/env python3
"""
Script pour initialiser les tables de la base de données
"""
from sqlalchemy import create_engine, inspect
from app.core.config import settings
from app.models.models import Base
from loguru import logger

def create_tables():
    """Créer toutes les tables définies dans les modèles"""
    try:
        logger.info("🔧 Création des tables de la base de données...")
        
        # Créer l'engine avec l'URL de base de données
        engine = create_engine(settings.DATABASE_URL)
        
        # Créer toutes les tables
        Base.metadata.create_all(bind=engine)
        
        # Vérifier les tables créées
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if tables:
            logger.success(f"✅ Tables créées avec succès: {tables}")
        else:
            logger.warning("⚠️  Aucune table créée")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création des tables: {e}")
        return False

def test_tables():
    """Tester l'accès aux tables"""
    try:
        logger.info("🔍 Test d'accès aux tables...")
        
        engine = create_engine(settings.DATABASE_URL)
        inspector = inspect(engine)
        
        tables = inspector.get_table_names()
        for table in tables:
            columns = inspector.get_columns(table)
            logger.info(f"📋 Table '{table}': {len(columns)} colonnes")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du test des tables: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Initialisation de la base de données")
    logger.info("=" * 50)
    
    success = create_tables()
    if success:
        test_tables()
        logger.success("🎉 Initialisation terminée avec succès")
    else:
        logger.error("💥 Échec de l'initialisation")
        exit(1)
