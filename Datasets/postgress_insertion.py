#!/usr/bin/env python3
"""
ETL script for Climate Scenario data (LOCAL / NO SSL)

✔ COPY bulk load (fast)
✔ Resume-on-failure
✔ Checksum deduplication
✔ Correct handling of run_id (NO CSV mismatch)
✔ ETL logging
✔ PostgreSQL LOCAL

Expected CSV format (LONG):
model,scenario,region,variable,unit,provider,year,value
"""

import sys
import time
import hashlib
import logging
from pathlib import Path

import psycopg2
from load_config import ETLConfigLoader

# ===================== CONFIG =====================
CONFIG_PATH ="config.ini.enc"
config = ETLConfigLoader(CONFIG_PATH)
DB_CONFIG = config.db_config

INPUT_PATH = "processed/wide_to_long_csv"   # folder or single CSV
LOG_FILE = "etl_local.log"

# =================================================


# ----------------- Logging -----------------
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("ETL")
logger.addHandler(logging.StreamHandler(sys.stdout))


# ----------------- Helpers -----------------
def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()



def connect_db():
    return psycopg2.connect(**DB_CONFIG)


# ----------------- Schema -----------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS climate_metadata (
    id BIGSERIAL PRIMARY KEY,
    model TEXT NOT NULL,
    scenario TEXT NOT NULL,
    region TEXT NOT NULL,
    variable TEXT NOT NULL,
    unit TEXT NOT NULL,
    provider TEXT NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (model, scenario, region, variable, unit, provider)
);

CREATE TABLE IF NOT EXISTS climate_values (
    metadata_id BIGINT REFERENCES climate_metadata(id),
    year INT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (metadata_id, year)
);

CREATE TABLE IF NOT EXISTS etl_run_log (
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT,
    checksum TEXT,
    rows_loaded BIGINT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS etl_file_state (
    source_file TEXT,
    checksum TEXT,
    status TEXT,
    last_run_id BIGINT,
    PRIMARY KEY (source_file, checksum)
);

CREATE UNLOGGED TABLE IF NOT EXISTS climate_stage (
    run_id BIGINT,
    model TEXT,
    scenario TEXT,
    region TEXT,
    variable TEXT,
    unit TEXT,
    provider TEXT,
    year INT,
    value DOUBLE PRECISION
);
"""


# ----------------- ETL -----------------
def run_etl():
    conn = connect_db()
    conn.autocommit = False
    cur = conn.cursor()

    logger.info("Ensuring schema...")
    cur.execute(SCHEMA_SQL)
    conn.commit()

    input_path = Path(INPUT_PATH)
    files = (
        list(input_path.glob("*.csv"))
        if input_path.is_dir()
        else [input_path]
    )

    for csv_file in files:
        checksum = sha256_file(csv_file)
        logger.info(f"Processing {csv_file.name} | checksum={checksum[:10]}")

        # Skip already processed
        cur.execute(
            """
            SELECT 1 FROM etl_file_state
            WHERE source_file=%s AND checksum=%s AND status='success'
            """,
            (csv_file.name, checksum),
        )
        if cur.fetchone():
            logger.info(f"SKIPPED (already loaded): {csv_file.name}")
            continue

        # Start run
        cur.execute(
            """
            INSERT INTO etl_run_log (source_file, checksum, status)
            VALUES (%s, %s, 'running')
            RETURNING id
            """,
            (csv_file.name, checksum),
        )
        run_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO etl_file_state (source_file, checksum, status, last_run_id)
            VALUES (%s, %s, 'running', %s)
            ON CONFLICT (source_file, checksum)
            DO UPDATE SET status='running', last_run_id=%s
            """,
            (csv_file.name, checksum, run_id, run_id),
        )
        conn.commit()

        try:
            logger.info(f"RUN {run_id} START")

            # Clean stage
            cur.execute("DELETE FROM climate_stage WHERE run_id=%s", (run_id,))

            # ---------------------------
            # ✅ FIXED COPY LOGIC
            # ---------------------------

            # 1️⃣ Temp table WITHOUT run_id
            cur.execute("""
                CREATE TEMP TABLE stage_tmp (
                    model TEXT,
                    scenario TEXT,
                    region TEXT,
                    variable TEXT,
                    unit TEXT,
                    provider TEXT,
                    year INT,
                    value DOUBLE PRECISION
                ) ON COMMIT DROP;
            """)

            # 2️⃣ COPY CSV → temp table
            with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
                cur.copy_expert(
                    """
                    COPY stage_tmp
                    (model, scenario, region, variable, unit, provider, year, value)
                    FROM STDIN CSV HEADER
                    """,
                    f,
                )

            # 3️⃣ Insert into stage with run_id
            cur.execute(
                """
                INSERT INTO climate_stage
                (run_id, model, scenario, region, variable, unit, provider, year, value)
                SELECT
                    %s, model, scenario, region, variable, unit, provider, year, value
                FROM stage_tmp
                """,
                (run_id,),
            )

            cur.execute(
                "SELECT COUNT(*) FROM climate_stage WHERE run_id=%s",
                (run_id,),
            )
            rows_loaded = cur.fetchone()[0]

            # Insert metadata
            cur.execute(
                """
                INSERT INTO climate_metadata
                (model, scenario, region, variable, unit, provider)
                SELECT DISTINCT
                    model, scenario, region, variable, unit, provider
                FROM climate_stage
                WHERE run_id=%s
                ON CONFLICT DO NOTHING
                """,
                (run_id,),
            )

            # Insert values
            cur.execute(
                """
                INSERT INTO climate_values (metadata_id, year, value)
                SELECT m.id, s.year, s.value
                FROM climate_stage s
                JOIN climate_metadata m
                ON m.model=s.model
                AND m.scenario=s.scenario
                AND m.region=s.region
                AND m.variable=s.variable
                AND m.unit=s.unit
                AND m.provider=s.provider
                WHERE s.run_id=%s
                ON CONFLICT DO NOTHING
                """,
                (run_id,),
            )

            # Finish run
            cur.execute(
                """
                UPDATE etl_run_log
                SET rows_loaded=%s, finished_at=NOW(), status='success'
                WHERE id=%s
                """,
                (rows_loaded, run_id),
            )

            cur.execute(
                """
                UPDATE etl_file_state
                SET status='success'
                WHERE source_file=%s AND checksum=%s
                """,
                (csv_file.name, checksum),
            )

            conn.commit()
            logger.info(f"RUN {run_id} SUCCESS | rows={rows_loaded:,}")

        except Exception as e:
            conn.rollback()
            logger.error(f"RUN {run_id} FAILED: {e}")

            cur.execute(
                """
                UPDATE etl_run_log
                SET finished_at=NOW(), status='failed', error_message=%s
                WHERE id=%s
                """,
                (str(e), run_id),
            )
            cur.execute(
                """
                UPDATE etl_file_state
                SET status='failed'
                WHERE source_file=%s AND checksum=%s
                """,
                (csv_file.name, checksum),
            )
            conn.commit()

    cur.close()
    conn.close()
    logger.info("ETL completed.")


# ----------------- Main -----------------
if __name__ == "__main__":
    run_etl()
