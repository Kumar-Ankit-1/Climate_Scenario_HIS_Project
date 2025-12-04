# fetch_and_plot_from_tabular.py
"""
Load confirmed_selection.json and fetch actual data from tabular dataset (CSV or tabular_data.json).
Fuzzy matching (rapidfuzz) is used when exact match fails.

Usage:
  python fetch_and_plot_from_tabular.py --csv ./data/dataset.csv
or
  python fetch_and_plot_from_tabular.py --json ./tabular_data.json

Key args:
  --fuzzy-threshold  Score threshold [0-100] for accepting fuzzy matches (default 80)
"""
import argparse
import json
import os
from typing import Dict, Any, List, Optional, Tuple

import pandas as pd
from rag_model import RAG
import plotly.graph_objects as go

# Try to import rapidfuzz; fallback to simple contains matching if unavailable
try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except Exception:
    HAS_RAPIDFUZZ = False

def normalize(s):
    if s is None:
        return ""
    return str(s).strip()

def load_tabular_json(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)

def fuzzy_best_match(query: str, choices: List[str], score_cutoff: int = 80) -> Optional[Tuple[str,int]]:
    """
    Return (best_choice, score) if score >= cutoff.
    Uses rapidfuzz if available; otherwise returns substring match or None.
    """
    q = normalize(query)
    if not q or not choices:
        return None
    if HAS_RAPIDFUZZ:
        best = process.extractOne(q, choices, scorer=fuzz.token_sort_ratio)
        if best and best[1] >= score_cutoff:
            return (best[0], int(best[1]))
        return None
    # fallback: simple case-insensitive substring
    ql = q.lower()
    for c in choices:
        if ql in c.lower():
            return (c, 100)
    return None

def find_matches_in_json(store: Dict[str, Any], scenario: str, region: str, variable: str, fuzzy_threshold: int = 80):
    # Try exact key first
    key = f"{scenario.lower()}|{region.lower()}|{variable.lower()}"
    if key in store:
        return store[key], {"matched": "exact", "key": key}
    # collect candidate keys and components
    candidates = list(store.items())  # list of (keystr, entry)
    # Build lists of unique scenario, region, variable values for fuzzy matching
    scen_vals = list({v["scenario"] for (_, v) in candidates})
    region_vals = list({v["region"] for (_, v) in candidates})
    var_vals = list({v["variable"] for (_, v) in candidates})

    # Try fuzzy match each component
    scen_match = fuzzy_best_match(scenario, scen_vals, fuzzy_threshold)
    region_match = fuzzy_best_match(region, region_vals, fuzzy_threshold)
    var_match = fuzzy_best_match(variable, var_vals, fuzzy_threshold)

    # If all matched, try exact composite key
    if scen_match and region_match and var_match:
        key_try = f"{scen_match[0].lower()}|{region_match[0].lower()}|{var_match[0].lower()}"
        if key_try in store:
            return store[key_try], {"matched": "fuzzy_all", "scenario": scen_match, "region": region_match, "variable": var_match}
    # If not all matched, try looser heuristics: find entries matching two components
    # Score each candidate key by matching its components
    best_score = -1
    best_entry = None
    best_reason = None
    for kstr, entry in candidates:
        s_score = fuzz.token_sort_ratio(scenario, entry["scenario"]) if HAS_RAPIDFUZZ else (100 if scenario.lower() in entry["scenario"].lower() else 0)
        r_score = fuzz.token_sort_ratio(region, entry["region"]) if HAS_RAPIDFUZZ else (100 if region.lower() in entry["region"].lower() else 0)
        v_score = fuzz.token_sort_ratio(variable, entry["variable"]) if HAS_RAPIDFUZZ else (100 if variable.lower() in entry["variable"].lower() else 0)
        # weighted total (simple sum)
        total = s_score + r_score + v_score
        if total > best_score:
            best_score = total
            best_entry = entry
            best_reason = {"k": kstr, "s_score": s_score, "r_score": r_score, "v_score": v_score}
    # Accept best if average component score above threshold
    if best_entry and (best_reason["s_score"] >= fuzzy_threshold or best_reason["r_score"] >= fuzzy_threshold or best_reason["v_score"] >= fuzzy_threshold):
        return best_entry, {"matched": "best_of_all", "scores": best_reason}
    return None, {"matched": "none"}

def load_csv_and_find(csv_path: str, scenario: str, region: str, variable: str, fuzzy_threshold: int = 80):
    # read CSV with pandas (try a few separators)
    df = None
    for sep in [None, ",", "\t", ";"]:
        try:
            if sep is None:
                df = pd.read_csv(csv_path)
            else:
                df = pd.read_csv(csv_path, sep=sep)
            cols = [c for c in df.columns]
            if any(c.lower() in ("variable","scenario","region") for c in cols):
                break
        except Exception:
            df = None
    if df is None:
        raise RuntimeError("Unable to read CSV or missing expected columns.")
    # identify columns names
    var_col = next(c for c in df.columns if c.lower()=="variable")
    scen_col = next(c for c in df.columns if c.lower()=="scenario")
    region_col = next(c for c in df.columns if c.lower()=="region")
    # try exact match first
    sel = df[ (df[var_col].astype(str).str.lower() == variable.lower()) &
              (df[scen_col].astype(str).str.lower() == scenario.lower()) &
              (df[region_col].astype(str).str.lower() == region.lower()) ]
    if sel.empty:
        # try fuzzy on unique values
        scen_choices = df[scen_col].dropna().astype(str).unique().tolist()
        region_choices = df[region_col].dropna().astype(str).unique().tolist()
        var_choices = df[var_col].dropna().astype(str).unique().tolist()
        scen_match = fuzzy_best_match(scenario, scen_choices, fuzzy_threshold)
        region_match = fuzzy_best_match(region, region_choices, fuzzy_threshold)
        var_match = fuzzy_best_match(variable, var_choices, fuzzy_threshold)

        # if we have good matches, filter by them
        if scen_match:
            scen_val = scen_match[0]
            sel = df[ df[scen_col].astype(str).str.lower() == scen_val.lower() ]
        if region_match:
            reg_val = region_match[0]
            sel = sel[ sel[region_col].astype(str).str.lower() == reg_val.lower() ]
        if var_match:
            var_val = var_match[0]
            sel = sel[ sel[var_col].astype(str).str.lower() == var_val.lower() ]
    if sel.empty:
        # as a last resort try partial variable match
        sel = df[df[var_col].astype(str).str.lower().str.contains(variable.lower())]
    if sel.empty:
        return None, {"matched": "none"}
    # aggregate across rows by year columns (mean ignoring NaN)
    year_cols = [c for c in df.columns if str(c).strip().isdigit()]
    if not year_cols:
        for c in df.columns:
            try:
                if 1900 <= int(float(c)) <= 2100:
                    year_cols.append(c)
            except Exception:
                pass
    if not year_cols:
        raise RuntimeError("No year columns detected in CSV.")
    agg = {}
    for yc in year_cols:
        vals = pd.to_numeric(sel[yc], errors="coerce").dropna().tolist()
        if vals:
            agg[str(int(float(yc)))] = float(sum(vals) / len(vals))
        else:
            agg[str(int(float(yc)))] = None
    unit = None
    if "Unit" in df.columns:
        unit = normalize(sel.iloc[0].get("Unit"))
    return {"scenario": scenario, "region": region, "variable": variable, "unit": unit, "aggregate": agg, "years": sorted([str(int(float(y))) for y in year_cols], key=int)}, {"matched":"csv_matched"}

def construct_series_from_agg(agg: Dict[str, Any], start: int, end: int):
    # collect years that exist and lie within start..end, sort ascending
    years = sorted([int(y) for y, v in agg.items() if v is not None and start <= int(y) <= end])
    series = [{"year": y, "value": agg[str(y)]} for y in years]
    return series

def plot_series(series: List[Dict[str, Any]], title: str, out_html: str):
    years = [p["year"] for p in series]
    values = [p["value"] for p in series]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=years, y=values, mode="lines+markers"))
    fig.update_layout(title=title, xaxis_title="Year", yaxis_title="Value", template="plotly_white")
    os.makedirs(os.path.dirname(out_html) or ".", exist_ok=True)
    fig.write_html(out_html, include_plotlyjs="cdn")
    print(f"Wrote plot to {out_html}")

def main(args):
    if not os.path.exists("Confirmed_selection/confirmed_selection.json"):
        raise FileNotFoundError("confirmed_selection.json not found. Run retriever to create it first.")
    sel = json.load(open("Confirmed_selection/confirmed_selection.json", "r", encoding="utf-8"))
    variable = sel["variable"].get("id") if isinstance(sel["variable"], dict) else str(sel["variable"])
    scenario = sel["scenario"].get("id") if isinstance(sel["scenario"], dict) else str(sel["scenario"])
    region = sel.get("region", "Global")
    start = int(sel.get("start_year", 2020))
    end = int(sel.get("end_year", 2100))

    fuzzy_threshold = int(args.fuzzy_threshold or 80)

    # 1) Try JSON store (fast)
    data_entry = None
    debug_info = {}
    if args.json and os.path.exists(args.json):
        store = load_tabular_json(args.json)
        entry, info = find_matches_in_json(store, scenario, region, variable, fuzzy_threshold)
        data_entry = entry
        debug_info["json_lookup"] = info

    # 2) Try CSV
    csv_info = None
    if data_entry is None and args.csv and os.path.exists(args.csv):
        print("Searching CSV dataset for matches (with fuzzy matching)...")
        entry_csv, info_csv = load_csv_and_find(args.csv, scenario, region, variable, fuzzy_threshold)
        data_entry = entry_csv
        csv_info = info_csv
        debug_info["csv_lookup"] = info_csv

    # 3) If found in JSON/CSV
    if data_entry:
        # If JSON format from tabular_ingest, it contains keys "aggregate" and "years" and maybe "unit"
        agg = data_entry.get("aggregate", {})
        series = construct_series_from_agg(agg, start, end)
        unit = data_entry.get("unit", "")
        title = f"{variable} — {scenario} — {region} (data)"
        if not series:
            print("No overlapping years found in dataset for the requested timeframe. Nothing plotted.")
            out = {"series": [], "source": "tabular_data", "unit": unit, "debug": debug_info}
            with open("Generated_series/generated_series.json", "w", encoding="utf-8") as fh:
                json.dump(out, fh, indent=2, ensure_ascii=False)
            return
        out = {"series": series, "source": "tabular_data", "unit": unit, "variable": variable, "scenario": scenario, "region": region, "debug": debug_info}
        with open("Generated_series/generated_series.json", "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=2, ensure_ascii=False)
        out_html = args.out or "./output/plot.html"
        plot_series(series, title, out_html)
        print("Saved generated_series.json and plot.")
        return

    # 4) Fallback to RAG generator
    print("No tabular match found. Falling back to RAG generator (synth or remote).")
    rag = RAG(index_dir=args.index_dir, meta_path=args.meta, top_k=args.top_k)
    out = rag.generate(sel["variable"], sel["scenario"], start, end, region=region, max_tokens=args.max_tokens)
    series = out.get("series", [])
    with open("Generated_series/generated_series.json", "w", encoding="utf-8") as fh:
        json.dump({"series": series, "source": out.get("source", "rag")}, fh, indent=2, ensure_ascii=False)
    out_html = args.out or "./output/plot.html"
    title = f"{variable} — {scenario} — {region} (RAG: {out.get('source')})"
    plot_series(series, title, out_html)
    print("Saved generated_series.json and plot (from RAG).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", help="path to dataset CSV (Model,Scenario,Region,Variable,Unit,2020,...)", default="./data/dataset.csv")
    parser.add_argument("--json", help="path to preprocessed tabular_data.json", default="./tabular_data.json")
    parser.add_argument("--index-dir", default="./vector_index")
    parser.add_argument("--meta", default="./metadata.json")
    parser.add_argument("--out", default="./output/plot.html")
    parser.add_argument("--top-k", default=8, type=int)
    parser.add_argument("--max-tokens", default=512, type=int)
    parser.add_argument("--fuzzy-threshold", default=80, help="Fuzzy match acceptance threshold 0-100 (default 80)")
    args = parser.parse_args()
    main(args)