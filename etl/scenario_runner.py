import argparse
import json
import os
import pandas as pd
from datetime import datetime

##############################################################
# 1. Load Provider Config
##############################################################

def load_config(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


##############################################################
# 2. Read Raw File (csv, xlsx)
##############################################################

def read_raw_file(path, declared_format=None):
    # Excel first — avoids false CSV interpretation
    if path.endswith(".xlsx") or declared_format == "xlsx":
        return pd.read_excel(path)

    # CSV with fallback encoding
    if path.endswith(".csv") or declared_format == "csv":
        return load_csv_with_fallback(path)

    raise ValueError(f"Unsupported file format: {declared_format or path}")



##############################################################
# 3. Robust Wide → Long Conversion for IAMC format
##############################################################

def reshape_wide_to_long(df):
    """
    Detects IAMC wide-format (year columns like 1950, 1960...),
    even if the year headers are numeric, strings, float, or have spaces.
    Converts into long format with 'year' and 'value' columns.
    """

    year_cols = []

    for col in df.columns:
        col_str = str(col).strip()
        # detect columns that LOOK like years
        if col_str.isdigit():
            year = int(col_str)
            if 1800 <= year <= 2200:
                year_cols.append(col)

    if not year_cols:
        print(" No wide-format year columns detected → dataset already long.")
        return df

    print(f" Detected wide-format dataset. Year columns = {len(year_cols)}")

    id_vars = [c for c in df.columns if c not in year_cols]

    df_long = df.melt(
        id_vars=id_vars,
        value_vars=year_cols,
        var_name="year",
        value_name="value"
    )

    df_long["year"] = df_long["year"].astype(str).str.strip().astype(int)
    return df_long


##############################################################
# 4. Apply Mapping from the config
##############################################################

def apply_mapping(df, mapping):
    out = pd.DataFrame()

    for target, source in mapping.items():
        if source is None:
            out[target] = pd.NA
        else:
            if source not in df.columns:
                raise ValueError(f"Column '{source}' missing in dataset.")
            out[target] = df[source]

    # Fill missing values with safe strings
    out["model"] = out["model"].fillna("unknown_model")
    out["scenario"] = out["scenario"].fillna("unknown_scenario")
    out["region"] = out["region"].fillna("unknown_region")
    out["sector"] = out["sector"].fillna("unspecified")
    out["variable"] = out["variable"].fillna("unknown_variable")
    out["unit"] = out["unit"].fillna("unknown")

    return out


##############################################################
# 5. Apply Filters (scenarios, variables, region, year range)
##############################################################

def apply_filters(df, args):
    initial = len(df)

    if args.model:
        df = df[df["model"].isin(args.model)]

    if args.scenario:
        df = df[df["scenario"].isin(args.scenario)]

    if args.variable:
        df = df[df["variable"].isin(args.variable)]

    if args.region:
        df = df[df["region"].isin(args.region)]

    if args.start_year:
        df = df[df["year"] >= args.start_year]

    if args.end_year:
        df = df[df["year"] <= args.end_year]

    print(f" Filtering reduced rows: {initial} → {len(df)}")
    return df


##############################################################
# 6. Save Output + Manifest
##############################################################

def save_output(df, cfg, args):
    os.makedirs("output", exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    provider_id = cfg["id"]

    out_path = f"output/{provider_id}_canonical_{ts}.csv"
    df.to_csv(out_path, index=False)

    manifest = {
        "provider_id": provider_id,
        "source_file": cfg["access"]["url"],
        "processed_at": ts,
        "filters": {
            "model": args.model,
            "scenario": args.scenario,
            "variable": args.variable,
            "region": args.region,
            "start_year": args.start_year,
            "end_year": args.end_year
        },
        "row_count": len(df)
    }

    with open(f"output/{provider_id}_manifest_{ts}.json", "w") as f:
        json.dump(manifest, f, indent=4)

    print(f"\n ✓ Saved canonical dataset → {out_path}")
    print(f" ✓ Saved manifest → output/{provider_id}_manifest_{ts}.json")

##############################################################
# 7. Load CSV with Encoding Fallback
##############################################################

def load_csv_with_fallback(path):
    """
    Safely load CSVs that are not UTF-8.
    IPCC AR6 datasets often use latin1 / cp1252 / utf-16.
    """
    encodings = ["utf-8", "latin1", "iso-8859-1", "cp1252", "utf-16"]

    for enc in encodings:
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
        except Exception as e:
            # utf-16 often needs explicit delimiter detection
            if "utf-16" in enc:
                try:
                    return pd.read_csv(path, encoding=enc, sep=",")
                except:
                    pass

    raise ValueError(f"Could not decode file {path} using encodings: {encodings}")



##############################################################
# 7. Main ETL Runner
##############################################################

def scenario_runner():
    parser = argparse.ArgumentParser(description="Scenario ETL Runner")

    parser.add_argument("--provider", required=True)
    parser.add_argument("--model", nargs="*", default=None)
    parser.add_argument("--scenario", nargs="*", default=None)
    parser.add_argument("--variable", nargs="*", default=None)
    parser.add_argument("--region", nargs="*", default=None)
    parser.add_argument("--start_year", type=int, default=None)
    parser.add_argument("--end_year", type=int, default=None)

    args = parser.parse_args()

    # Load config
    cfg = load_config(args.provider)
    print(f"\n=== PROVIDER: {cfg['name']} ===")

    # Load raw file
    raw_path = cfg["access"]["url"]
    print(f" Reading raw file: {raw_path}")
    raw_df = read_raw_file(raw_path, declared_format=cfg.get("format"))

    print(" RAW COLUMNS:", list(raw_df.columns))

    # Reshape if wide format
    df_long = reshape_wide_to_long(raw_df)
    print(" AFTER RESHAPE:", list(df_long.columns))

    # Apply mapping
    mapped = apply_mapping(df_long, cfg["mapping"])
    print(" MAPPED COLUMNS:", list(mapped.columns))

    print(" SAMPLE ROWS:")
    print(mapped.head())

    # Apply filters
    filtered = apply_filters(mapped, args)

    if filtered.empty:
        print("\n⚠ WARNING: No output produced! Filters too restrictive or mapping mismatch.")
        print(" Verify available values:")
        print(" MODELS:", mapped["model"].unique()[:10])
        print(" SCENARIOS:", mapped["scenario"].unique()[:10])
        print(" VARIABLES:", mapped["variable"].unique()[:10])
        print(" REGIONS:", mapped["region"].unique()[:10])
        return

    # Save files
    save_output(filtered, cfg, args)


##############################################################
# Run
##############################################################

if __name__ == "__main__":
    scenario_runner()
