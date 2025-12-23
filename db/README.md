1️⃣ Standardize PostgreSQL version (IMPORTANT)

Pick one version and lock it.

Recommendation: PostgreSQL 18.x
Verify
psql --version


All must see:
psql (PostgreSQL) 18.x

2️⃣ Local database naming convention
One-time setup (each dev)
psql postgres

CREATE DATABASE climate_db;
CREATE USER climate_user WITH PASSWORD 'climate_pass';
GRANT ALL PRIVILEGES ON DATABASE climate_db TO climate_user;

3️⃣ Git-tracked schema & migrations
climate-scenario-platform/
├── db/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── 002_add_ingestion_batch.sql
│   └── README.md
├── etl/

5️⃣ Applying migrations (simple & explicit)


Run this to check if the tables are created: 
```bash
psql -U climate_user -d climate_db -c "\dt"
```


Each dev runs:

psql -U climate_user -d climate_db -f db/migrations/001_init.sql
psql -U climate_user -d climate_db -f db/migrations/002_add_ingestion_batch.sql

6️⃣ Environment variables (per developer)

Each dev creates a local .env (never committed):

DB_HOST=localhost
DB_PORT=5432
DB_NAME=climate_db
DB_USER=climate_user
DB_PASSWORD=climate_pass



Schema:
    - scenario_observations
    - variable_semantics