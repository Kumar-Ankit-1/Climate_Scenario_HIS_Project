# fetch_and_plot_from_tabular.py
"""
Load confirmed_selection.json, lookup tabular_data.json (or CSV) using fuzzy matching,
or fallback to RAG generate. Plotly output to ./output/plot.html
"""
import os
import json
import argparse
from typing import Dict, Any, List, Optional, Tuple
import plotly.graph_objects as go

# rapidfuzz optional
try:
    from rapidfuzz import process, fuzz
    HAS_RAPIDFUZZ = True
except Exception:
    HAS_RAPIDFUZZ = False

from rag_model import RAG

def normalize(s):
    return "" if s is None else str(s).strip()

def load_json_store(path: str) -> Dict[str,Any]:
    with open(path,"r",encoding="utf-8") as fh:
        return json.load(fh)

def fuzzy_best_match(query: str, choices: List[str], cutoff:int=80) -> Optional[Tuple[str,int]]:
    q = normalize(query)
    if not q or not choices:
        return None
    if HAS_RAPIDFUZZ:
        best = process.extractOne(q, choices, scorer=fuzz.token_sort_ratio)
        if best and best[1] >= cutoff:
            return (best[0], int(best[1]))
        return None
    # fallback simple substring
    for c in choices:
        if q.lower() in c.lower():
            return (c, 100)
    return None

def find_in_store(store: Dict[str,Any], scenario:str, region:str, variable:str, fuzzy_threshold:int=80):
    key = f"{scenario.lower()}|{region.lower()}|{variable.lower()}"
    if key in store:
        return store[key], {"matched":"exact","key":key}
    # build lists
    scen_vals = list({v["scenario"] for v in store.values()})
    reg_vals = list({v["region"] for v in store.values()})
    var_vals = list({v["variable"] for v in store.values()})
    scen_m = fuzzy_best_match(scenario, scen_vals, fuzzy_threshold)
    reg_m = fuzzy_best_match(region, reg_vals, fuzzy_threshold)
    var_m = fuzzy_best_match(variable, var_vals, fuzzy_threshold)
    if scen_m and reg_m and var_m:
        try_key = f"{scen_m[0].lower()}|{reg_m[0].lower()}|{var_m[0].lower()}"
        if try_key in store:
            return store[try_key], {"matched":"fuzzy_all","scenario":scen_m,"region":reg_m,"variable":var_m}
    # best-of heuristic
    best = None
    best_score = -1
    for k,v in store.items():
        s_score = fuzz.token_sort_ratio(scenario, v["scenario"]) if HAS_RAPIDFUZZ else (100 if scenario.lower() in v["scenario"].lower() else 0)
        r_score = fuzz.token_sort_ratio(region, v["region"]) if HAS_RAPIDFUZZ else (100 if region.lower() in v["region"].lower() else 0)
        v_score = fuzz.token_sort_ratio(variable, v["variable"]) if HAS_RAPIDFUZZ else (100 if variable.lower() in v["variable"].lower() else 0)
        tot = s_score + r_score + v_score
        if tot > best_score:
            best_score = tot
            best = (k,v,{"s":s_score,"r":r_score,"v":v_score})
    if best and (best[2]["s"] >= fuzzy_threshold or best[2]["r"] >= fuzzy_threshold or best[2]["v"] >= fuzzy_threshold):
        return best[1], {"matched":"best_of_all","scores":best[2],"key":best[0]}
    return None, {"matched":"none"}

def construct_series_from_agg(agg: Dict[str,Any], start:int, end:int):
    years = sorted([int(y) for y in agg.keys() if agg[y] is not None and start <= int(y) <= end])
    series = [{"year": y, "value": agg[str(y)]} for y in years]
    return series

def plot_series(series: List[Dict[str,Any]], title:str, out_html:str):
    years = [p["year"] for p in series]
    values = [p["value"] for p in series]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=years, y=values, mode="lines+markers"))
    fig.update_layout(title=title, xaxis_title="Year", yaxis_title="Value", template="plotly_white")
    os.makedirs(os.path.dirname(out_html) or ".", exist_ok=True)
    fig.write_html(out_html, include_plotlyjs="cdn")
    print("Wrote plot to", out_html)

def main(args):
    if not os.path.exists("confirmed_selection.json"):
        raise FileNotFoundError("confirmed_selection.json missing. Run retriever.py first.")
    sel = json.load(open("confirmed_selection.json","r",encoding="utf-8"))
    variable = sel["variable"].get("id") if isinstance(sel["variable"], dict) else str(sel["variable"])
    scenario = sel["scenario"].get("id") if isinstance(sel["scenario"], dict) else str(sel["scenario"])
    region = sel.get("region","Global")
    start = int(sel.get("start_year",2020))
    end = int(sel.get("end_year",2100))
    fuzzy_threshold = int(args.fuzzy_threshold or 80)

    data_entry = None
    debug = {}
    if args.json and os.path.exists(args.json):
        store = load_json_store(args.json)
        data_entry, info = find_in_store(store, scenario, region, variable, fuzzy_threshold)
        debug["json_lookup"] = info

    if data_entry is None and args.csv and os.path.exists(args.csv):
        # try reading CSV quickly and searching (simpler)
        import pandas as pd
        df = pd.read_csv(args.csv)
        var_col = next(c for c in df.columns if c.lower()=="variable")
        scen_col = next(c for c in df.columns if c.lower()=="scenario")
        region_col = next(c for c in df.columns if c.lower()=="region")
        sel_rows = df[ (df[var_col].astype(str).str.lower() == variable.lower()) &
                       (df[scen_col].astype(str).str.lower() == scenario.lower()) &
                       (df[region_col].astype(str).str.lower() == region.lower()) ]
        if sel_rows.empty:
            # fallback fuzzy via rapidfuzz on unique values
            scen_choices = df[scen_col].dropna().astype(str).unique().tolist()
            region_choices = df[region_col].dropna().astype(str).unique().tolist()
            var_choices = df[var_col].dropna().astype(str).unique().tolist()
            from rapidfuzz import process, fuzz as rf_fuzz
            def best(q, choices):
                b = process.extractOne(q, choices, scorer=rf_fuzz.token_sort_ratio)
                return b
            try:
                sm = best(scenario, scen_choices)
                rm = best(region, region_choices)
                vm = best(variable, var_choices)
                debug["csv_matches"] = {"scen":sm, "reg":rm, "var":vm}
                if sm and sm[1] >= fuzzy_threshold:
                    scen_val = sm[0]
                    sel_rows = df[df[scen_col].astype(str).str.lower() == scen_val.lower()]
                if rm and rm[1] >= fuzzy_threshold:
                    reg_val = rm[0]
                    sel_rows = sel_rows[sel_rows[region_col].astype(str).str.lower() == reg_val.lower()]
                if vm and vm[1] >= fuzzy_threshold:
                    var_val = vm[0]
                    sel_rows = sel_rows[sel_rows[var_col].astype(str).str.lower() == var_val.lower()]
            except Exception:
                pass
        if not sel_rows.empty:
            # aggregate across models
            year_cols = [c for c in df.columns if str(c).strip().isdigit()]
            agg = {}
            for yc in year_cols:
                vals = sel_rows[yc].dropna().astype(float).tolist()
                agg[str(int(float(yc)))] = float(sum(vals)/len(vals)) if vals else None
            data_entry = {"scenario": scenario, "region": region, "variable": variable, "aggregate": agg}
            debug["csv_lookup"] = {"found": True, "rows": len(sel_rows)}
        else:
            debug["csv_lookup"] = {"found": False}

    if data_entry:
        agg = data_entry.get("aggregate", {})
        series = construct_series_from_agg(agg, start, end)
        if not series:
            print("No overlapping years in dataset for requested timeframe.")
            with open("generated_series.json","w",encoding="utf-8") as fh:
                json.dump({"series":[],"source":"tabular_data","debug":debug}, fh, indent=2)
            return
        out = {"series": series, "source": "tabular_data", "variable": variable, "scenario": scenario, "region": region, "debug": debug}
        with open("generated_series.json","w",encoding="utf-8") as fh:
            json.dump(out, fh, indent=2)
        plot_series(series, f"{variable} — {scenario} — {region}", args.out or "./output/plot.html")
        print("Wrote generated_series.json and plot.")
        return

    print("No tabular match found; falling back to RAG.")
    rag = RAG(index_dir=args.index_dir, meta_path=args.meta, top_k=args.top_k)
    out = rag.generate(sel["variable"], sel["scenario"], start, end, region=region, max_tokens=args.max_tokens)
    series = out.get("series", [])
    with open("generated_series.json","w",encoding="utf-8") as fh:
        json.dump({"series": series, "source": out.get("source"), "debug": out.get("debug_checks")}, fh, indent=2)
    plot_series(series, f"{variable} — {scenario} — {region} (RAG)", args.out or "./output/plot.html")
    print("Wrote generated_series.json and plot (RAG).")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--json", default="./tabular_data.json")
    p.add_argument("--csv", default="./data/dataset.csv")
    p.add_argument("--index-dir", default="./vector_index")
    p.add_argument("--meta", default="./metadata.json")
    p.add_argument("--out", default="./output/plot.html")
    p.add_argument("--fuzzy-threshold", default=80, type=int)
    p.add_argument("--top-k", default=8, type=int)
    p.add_argument("--max-tokens", default=512, type=int)
    args = p.parse_args()
    main(args)