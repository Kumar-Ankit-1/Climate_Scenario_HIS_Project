from sqlalchemy import create_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(
    f"postgresql+psycopg2://{os.environ['DB_USER']}:"
    f"{os.environ['DB_PASSWORD']}@"
    f"{os.environ['DB_HOST']}:"
    f"{os.environ['DB_PORT']}/"
    f"{os.environ['DB_NAME']}"
)

with engine.connect() as conn:
    print("Applying migration 002...")
    with open("db/migrations/002_add_ingestion_batch.sql", "r") as f:
        sql = f.read()
        conn.execute(text(sql))
        conn.commit()
    print("Migration applied successfully.")
