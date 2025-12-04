# tabular_ingest.py
"""
Convert tabular dataset CSV (Model,Scenario,Region,Variable,Unit,2020,2030,...,2100)
into a compact JSON file './tabular_data.json' for faster lookups.

Usage:
    python tabular_ingest.py --csv ./data/dataset.csv --out ./tabular_data.json
"""
import argparse
import pandas as pd
import json
import os

def normalize_str(s):
    if s is None:
        return ""
    return str(s).strip()

def main(csv_path, out_path):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    # read with pandas; try auto-detect separator; explicit tab support
    df = None
    for sep in [None, ",", "\t", ";"]:
        try:
            if sep is None:
                df = pd.read_csv(csv_path)
            else:
                df = pd.read_csv(csv_path, sep=sep)
            # if read success and has expected columns, break
            if "Variable" in df.columns and "Scenario" in df.columns and "Region" in df.columns:
                break
        except Exception:
            df = None
    if df is None:
        raise RuntimeError("Failed to read CSV with expected columns (Variable, Scenario, Region).")

    # Detect year columns (columns that are integers or look like years)
    year_cols = [c for c in df.columns if str(c).strip().isdigit()]
    if not year_cols:
        # also check common year formats like ' 2020', '2020.0'
        for c in df.columns:
            try:
                if int(float(str(c))) >= 1900 and int(float(str(c))) <= 2100:
                    year_cols.append(c)
            except Exception:
                pass
    year_cols = sorted(list(set(year_cols)), key=lambda x: int(float(x)))
    if not year_cols:
        raise RuntimeError("No year columns detected in CSV. Ensure columns like 2020,2030,... exist.")

    store = {}
    # Use tuple key (scenario,region,variable) lowercase for lookup
    for _, row in df.iterrows():
        scen = normalize_str(row.get("Scenario") or row.get("scenario") or row.get("SCENARIO"))
        region = normalize_str(row.get("Region") or row.get("region") or row.get("REGION"))
        variable = normalize_str(row.get("Variable") or row.get("variable") or row.get("VARIABLE"))
        unit = normalize_str(row.get("Unit") or row.get("unit") or row.get("UNIT") or "")
        model = normalize_str(row.get("Model") or row.get("model") or "")

        key = (scen.lower(), region.lower(), variable.lower())
        if key not in store:
            store[key] = {
                "scenario": scen,
                "region": region,
                "variable": variable,
                "unit": unit,
                "models": {},
                "years": year_cols
            }
        # record model row values
        vals = {}
        for yc in year_cols:
            raw = row.get(yc)
            try:
                if pd.isna(raw):
                    vals[str(int(float(yc)))] = None
                else:
                    vals[str(int(float(yc)))] = float(raw)
            except Exception:
                # attempt to coerce strings like 'n/a'
                try:
                    vals[str(int(float(yc)))] = float(str(raw).strip())
                except Exception:
                    vals[str(int(float(yc)))] = None
        store[key]["models"][model or ""] = vals

    # Optionally aggregate across models by mean for each year ignoring None
    # Let's precompute 'aggregate' which is mean across models for each year ignoring None
    for k, v in store.items():
        agg = {}
        for year in v["years"]:
            year_s = str(int(float(year)))
            vals = []
            for mvals in v["models"].values():
                val = mvals.get(year_s)
                if val is None:
                    continue
                vals.append(val)
            if vals:
                agg[year_s] = sum(vals) / len(vals)
            else:
                agg[year_s] = None
        v["aggregate"] = agg

    # Save to JSON
    # JSON keys are stringified tuples for simplicity
    out = {}
    for k, v in store.items():
        key_str = "|".join(k)
        out[key_str] = v

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
    print(f"Wrote tabular JSON to {out_path} (keys: {len(out)})")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--out", default="./tabular_data.json")
    args = p.parse_args()
    main(args.csv, args.out)