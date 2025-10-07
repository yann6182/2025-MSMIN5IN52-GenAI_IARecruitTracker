#!/usr/bin/env python3
"""
Script pour tester la connexion à la base de données et son initialisation
"""
import sys
import asyncio
from sqlalchemy import text, inspect
from app.core.database import engine, SessionLocal
from app.core.config import settings
from loguru import logger

async def test_database_connection():
    """Test de la connexion à la base de données"""
    try:
        # Test de connexion
        logger.info(f"Test de connexion à la base de données: {settings.DATABASE_URL}")
        
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.success("✅ Connexion à la base de données réussie")
            
            # Test des tables
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            if tables:
                logger.success(f"✅ Tables trouvées: {tables}")
                
                # Vérification des tables principales
                expected_tables = ['job_applications', 'companies', 'job_offers', 'emails']
                missing_tables = [table for table in expected_tables if table not in tables]
                
                if missing_tables:
                    logger.warning(f"⚠️  Tables manquantes: {missing_tables}")
                else:
                    logger.success("✅ Toutes les tables principales sont présentes")
                    
                # Test d'une requête sur chaque table
                for table in tables:
                    try:
                        count_result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = count_result.scalar()
                        logger.info(f"📊 Table '{table}': {count} enregistrements")
                    except Exception as e:
                        logger.error(f"❌ Erreur lors de la lecture de la table '{table}': {e}")
            else:
                logger.warning("⚠️  Aucune table trouvée - la base de données n'est pas initialisée")
                
    except Exception as e:
        logger.error(f"❌ Erreur de connexion à la base de données: {e}")
        return False
        
    return True

async def test_database_operations():
    """Test des opérations CRUD de base"""
    try:
        logger.info("Test des opérations de base de données...")
        
        with SessionLocal() as db:
            # Test d'insertion simple dans une table de test
            try:
                db.execute(text("CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name VARCHAR(50))"))
                db.execute(text("INSERT INTO test_table (name) VALUES (:name)"), {"name": "test"})
                db.commit()
                
                # Test de lecture
                result = db.execute(text("SELECT * FROM test_table WHERE name = :name"), {"name": "test"})
                rows = result.fetchall()
                
                if rows:
                    logger.success("✅ Opérations CRUD fonctionnelles")
                else:
                    logger.warning("⚠️  Problème avec les opérations CRUD")
                
                # Nettoyage
                db.execute(text("DROP TABLE IF EXISTS test_table"))
                db.commit()
                
            except Exception as e:
                logger.error(f"❌ Erreur lors des opérations CRUD: {e}")
                
    except Exception as e:
        logger.error(f"❌ Erreur lors du test des opérations: {e}")

def main():
    """Fonction principale"""
    logger.info("🔍 Test de l'initialisation de la base de données")
    logger.info("=" * 50)
    
    # Test de connexion
    success = asyncio.run(test_database_connection())
    
    if success:
        # Test des opérations
        asyncio.run(test_database_operations())
        logger.success("🎉 Tests de base de données terminés")
    else:
        logger.error("💥 Échec des tests de base de données")
        sys.exit(1)

if __name__ == "__main__":
    main()
