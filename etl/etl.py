import yaml
import pandas as pd
import json
from pathlib import Path
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

# -------------------------
# Database connection
# -------------------------
engine = create_engine(
    f"postgresql+psycopg2://{os.environ['DB_USER']}:"
    f"{os.environ['DB_PASSWORD']}@"
    f"{os.environ['DB_HOST']}:"
    f"{os.environ['DB_PORT']}/"
    f"{os.environ['DB_NAME']}"
)

# -------------------------
# Load provider config
# -------------------------
def load_config(path):
    with open(path, "r") as f:
        return yaml.safe_load(f)

# -------------------------
# Main ETL
# -------------------------
def run_etl(config_path):
    cfg = load_config(config_path)

    df = pd.read_excel(
        cfg["input"]["file_path"],
        sheet_name=cfg["input"].get("sheet_name", 0)
    )

    df.columns = df.columns.astype(str).str.strip()

    # Rename columns to canonical names
    df = df.rename(columns={
        cfg["columns"]["model"]: "model",
        cfg["columns"]["scenario"]: "scenario",
        cfg["columns"]["region"]: "region",
        cfg["columns"]["variable"]: "variable",
        cfg["columns"]["unit"]: "unit"
    })

    # Identify year columns
    if "explicit" in cfg["year_columns"]:
        year_cols = [str(y) for y in cfg["year_columns"]["explicit"]]
    else:
        start = cfg["year_columns"]["start"]
        end = cfg["year_columns"]["end"]
        step = cfg["year_columns"]["step"]
        year_cols = [str(y) for y in range(start, end + 1, step)]

    # Pivot
    long_df = df.melt(
        id_vars=["model", "scenario", "region", "variable", "unit"],
        value_vars=year_cols,
        var_name="year",
        value_name="value"
    )

    long_df = long_df.dropna(subset=["value"])
    long_df["year"] = long_df["year"].astype(int)

    # Add metadata
    long_df["provider"] = cfg["provider"]
    long_df["dataset"] = cfg["dataset"]
    long_df["ingestion_batch"] = cfg["ingestion_batch"]

    long_df["metadata"] = long_df.apply(
        lambda r: json.dumps({
            "provider_version": cfg["provider_version"],
            "source_file": Path(cfg["input"]["file_path"]).name
        }),
        axis=1
    )

    # Reorder columns
    final_df = long_df[
        [
            "provider",
            "dataset",
            "model",
            "scenario",
            "region",
            "variable",
            "unit",
            "year",
            "value",
            "ingestion_batch",
            "metadata"
        ]
    ]

    # Load to DB
    print(f"Loading {len(final_df)} rows in chunks of 1000...")
    final_df.to_sql(
        "scenario_observations",
        engine,
        if_exists="append",
        index=False,
        method="multi",
        chunksize=1000
    )

    print(f"Loaded {len(final_df)} rows for {cfg['provider']}")

# -------------------------
# CLI entry
# -------------------------
if __name__ == "__main__":
    import sys
    run_etl(sys.argv[1])
