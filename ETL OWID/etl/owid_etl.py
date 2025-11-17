"""
etl/owid_etl.py
Enhanced ETL: download OWID CO2 CSV, validate, filter, normalize units,
and write processed CSV + manifest (provenance + checksum).
Supports region, start_year, and end_year as command-line arguments.
"""

import os
import sys
import hashlib
import json
from datetime import datetime
import requests
import pandas as pd

# --- Config ---
OWID_CSV_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"
DATA_DIR = "processed"
RAW_DIR = "raw"
os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# --- Helper functions ---

def download_raw(url: str, target_path: str):
    print(f"Downloading {url} ...")
    r = requests.get(url, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"Failed to download (HTTP {r.status_code})")
    with open(target_path, "wb") as f:
        f.write(r.content)
    print(f"Saved raw file to {target_path}")

def sha256_checksum(path: str):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()

def load_and_validate(path: str):
    print("Loading CSV into DataFrame...")
    df = pd.read_csv(path, low_memory=False)
    required = {"iso_code", "country", "year", "co2"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    print(f"Columns validated ({len(df)} rows)")
    return df

def filter_normalize(df: pd.DataFrame, region_filter: str, start:int, end:int):
    sel = df[
        (df['country'] == region_filter) &
        (df['year'] >= start) &
        (df['year'] <= end)
    ].copy()
    if sel.empty:
        print(f"WARNING: No rows found for region='{region_filter}'. Try another region or country.")
    sel['value_MtCO2_per_year'] = sel['co2'] / 1e6
    out = sel[['year', 'country', 'iso_code', 'value_MtCO2_per_year']].rename(
        columns={'country': 'region', 'iso_code': 'region_iso', 'value_MtCO2_per_year': 'value'}
    )
    out['unit'] = 'MtCO2/yr'
    return out

def write_outputs(processed_df: pd.DataFrame, raw_path: str, out_base: str, region: str, start:int, end:int):
    timestamp = datetime.utcnow().isoformat(timespec='seconds') + "Z"
    csv_path = os.path.join(DATA_DIR, out_base + ".csv")
    manifest_path = os.path.join(DATA_DIR, out_base + "_manifest.json")
    processed_df.to_csv(csv_path, index=False)
    checksum_raw = sha256_checksum(raw_path)
    checksum_processed = sha256_checksum(csv_path)
    manifest = {
        "generated_at": timestamp,
        "source_url": OWID_CSV_URL,
        "region": region,
        "years": [start, end],
        "raw_file": os.path.abspath(raw_path),
        "raw_checksum": checksum_raw,
        "processed_file": os.path.abspath(csv_path),
        "processed_checksum": checksum_processed,
        "notes": "Territory-based CO2 emissions; converted tonnes → MtCO2/yr.",
        "license_hint": "Check OWID repo for license and attribution."
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote processed CSV → {csv_path}")
    print(f"Wrote manifest → {manifest_path}")
    return csv_path, manifest_path

def main():
    # --- Command-line arguments ---
    if len(sys.argv) >= 2:
        region = sys.argv[1]
    else:
        region = "Europe"
    if len(sys.argv) >= 3:
        start = int(sys.argv[2])
    else:
        start = 2000
    if len(sys.argv) >= 4:
        end = int(sys.argv[3])
    else:
        end = 2100

    print(f"Running ETL for region='{region}', years={start}-{end}")

    # --- Download, load, process ---
    raw_path = os.path.join(RAW_DIR, "owid-co2-data.csv")
    download_raw(OWID_CSV_URL, raw_path)
    df = load_and_validate(raw_path)

    processed = filter_normalize(df, region, start, end)
    if processed.empty:
        print("WARNING: Region not found. Trying Germany instead.")
        region = "Germany"
        processed = filter_normalize(df, region, start, end)
        out_base = f"owid_{region.lower()}_co2_{start}_{end}"
    else:
        out_base = f"owid_{region.lower()}_co2_{start}_{end}"

    write_outputs(processed, raw_path, out_base, region, start, end)
    print("ETL complete.")

if __name__ == "__main__":
    main()
