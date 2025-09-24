#!/bin/bash
set -e

# Create additional databases or setup initial configuration if needed
echo "PostgreSQL initialization complete for AI Recruit Tracker"

# Enable UUID extension
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL
