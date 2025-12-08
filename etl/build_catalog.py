import json
from pathlib import Path
import pandas as pd
import re

BASE = Path(__file__).resolve().parents[1]

OUTPUT_DIR = BASE / "output"        # <- your output folder
CANONICAL_DIR = BASE / "canonical" / "latest"
CATALOG_DIR = BASE / "etl" / "catalog"

CATALOG_DIR.mkdir(parents=True, exist_ok=True)
CANONICAL_DIR.mkdir(parents=True, exist_ok=True)


def detect_granularity(years):
    years = sorted(set(years))
    if len(years) < 2:
        return "unknown"
    diffs = sorted(set(y2 - y1 for y1, y2 in zip(years[:-1], years[1:])))
    if diffs == [1]:
        return "annual"
    if diffs == [5]:
        return "5-year"
    if diffs == [10]:
        return "10-year"
    return f"irregular_{'/'.join(str(d) for d in diffs[:3])}"


def parse_provider_id(filename):
    """
    Takes: iiasa_ssp_v2023_manifest_20251129_134056.json
    Returns: iiasa_ssp_v2023
    """
    match = re.match(r"(.*)_manifest_.*\.json", filename)
    return match.group(1) if match else None


def canonical_from_manifest(manifest_path):
    """
    Convert:
      provider_manifest_timestamp.json
    → provider_canonical_timestamp.csv
    """
    fname = manifest_path.name
    canonical_name = (
        fname
        .replace("_manifest_", "_canonical_")
        .replace(".json", ".csv")
    )
    return OUTPUT_DIR / canonical_name


def consolidate_latest_provider(provider_id):
    # find all canonical files for this provider
    pattern = f"{provider_id}_canonical_*.csv"
    csv_files = sorted(OUTPUT_DIR.glob(pattern))
    if not csv_files:
        return None

    latest = csv_files[-1]
    target = CANONICAL_DIR / f"{provider_id}_latest.csv"

    # copy file
    with open(latest, "rb") as src, open(target, "wb") as dst:
        dst.write(src.read())

    return target


def build_catalog():
    providers_meta = []
    all_variables = set()
    all_scenarios = set()

    # find ALL manifest files in output directory
    manifest_files = sorted(OUTPUT_DIR.glob("*_manifest_*.json"))

    print("Found manifest files:")
    for m in manifest_files:
        print(" -", m.name)

    for manifest_path in manifest_files:
        provider_id = parse_provider_id(manifest_path.name)
        if not provider_id:
            continue

        manifest = json.load(open(manifest_path))

        # Build canonical CSV path from filename pattern
        processed_file = canonical_from_manifest(manifest_path)

        if not processed_file.exists():
            raise FileNotFoundError(f"Canonical file not found for manifest: {processed_file}")

        df = pd.read_csv(processed_file)

        variables = sorted(set(df["variable"].dropna().unique().tolist()))
        scenarios = sorted(set(df["scenario"].dropna().unique().tolist()))
        regions = sorted(set(df["region"].dropna().unique().tolist()))
        years = df["year"].dropna().astype(int).tolist()

        granularity = detect_granularity(years)
        years_min = min(years)
        years_max = max(years)

        all_variables.update(variables)
        all_scenarios.update(scenarios)

        # consolidate latest file
        latest_canonical = consolidate_latest_provider(provider_id)
        rel_latest = (
            str(latest_canonical.relative_to(BASE))
            if latest_canonical else None
        )

        providers_meta.append({
            "id": provider_id,
            "name": provider_id,
            "latest_file": rel_latest,
            "variables": variables,
            "scenarios": scenarios,
            "regions": regions,
            "years": {"min": years_min, "max": years_max},
            "granularity": granularity,
            "available": True
        })

    # write catalog files
    with open(CATALOG_DIR / "providers_overview.json", "w") as f:
        json.dump({"providers": providers_meta}, f, indent=2)

    with open(CATALOG_DIR / "variables_index.json", "w") as f:
        json.dump({"variables": sorted(all_variables)}, f, indent=2)

    with open(CATALOG_DIR / "datasets_index.json", "w") as f:
        json.dump({"scenarios": sorted(all_scenarios)}, f, indent=2)

    print("Catalog built successfully!")
    print(" Providers:", len(providers_meta))
    print(" Total Variables:", len(all_variables))
    print(" Total Scenarios:", len(all_scenarios))


if __name__ == "__main__":
    build_catalog()
