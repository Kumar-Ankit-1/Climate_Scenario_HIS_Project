#!/usr/bin/env python3
"""
cli_rag_chatbot.py

Command-line RAG chatbot:
- builds/loads a FAISS index of docs created from your dataset
- accepts natural-language queries on stdin
- retrieves relevant records, extracts variable/scenario/year range
- plots time-series line graphs and saves them to ./outputs/
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

import numpy as np
import pandas as pd
from tqdm import tqdm
from rapidfuzz import process, fuzz
from sentence_transformers import SentenceTransformer
import faiss
import plotly.express as px

# ---------------------------
# Config
# ---------------------------
DATA_CSV = "Datasets/Extracted_AR6_Scenarios_Database_World_ALL_CLIMATE_v1.1.csv"
INDEX_DIR = Path("./rag_index")
INDEX_DIR.mkdir(parents=True, exist_ok=True)
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"   # lightweight and good
EMBED_DIM = 384                         # all-MiniLM-L6-v2 dim
DOCS_PARQUET = INDEX_DIR / "docs.parquet"
FAISS_INDEX_PATH = INDEX_DIR / "faiss.index"
METADATA_JSON = INDEX_DIR / "meta.json"

# ---------------------------
# Helpers: load dataset & build docs
# ---------------------------
def load_dataframe(path: str = DATA_CSV) -> pd.DataFrame:
    print("Loading CSV:", path)
    df = pd.read_csv(path)
    # Keep the key columns we expect and ensure year-like columns are strings of digits
    # Detect year/decade columns
    year_cols = [c for c in df.columns if isinstance(c, str) and c.isdigit()]
    # Keep common categorical columns if present
    cat_cols = [c for c in ["Model","Scenario","Region","Variable","Unit"] if c in df.columns]
    keep_cols = cat_cols + year_cols
    df2 = df[keep_cols].copy()
    print("Loaded shape:", df2.shape, "years:", len(year_cols))
    return df2

def doc_text_from_row(row: pd.Series, decade_cols: List[str]) -> Tuple[str, Dict[str,Any]]:
    """
    Create a short textual document string for the row and return metadata dict.
    We'll include metadata (Scenario, Variable, Region) to filter later.
    """
    meta = {
        "Scenario": row.get("Scenario", ""),
        "Variable": row.get("Variable", ""),
        "Region": row.get("Region", ""),
        "Unit": row.get("Unit", "")
    }
    # Compose a compact summary + a sample of decade values
    # show up to first 5 decades and last 3 decades for context
    vals = []
    for c in decade_cols:
        v = row.get(c, np.nan)
        if pd.isna(v):
            vals.append(f"{c}:NaN")
        else:
            vals.append(f"{c}:{float(v):.3f}")
    # document text: include variable/scenario tokens + numbers for semantic retrieval
    text = f"Scenario: {meta['Scenario']} | Variable: {meta['Variable']} | Region: {meta['Region']} | " \
           + " | ".join(vals)
    return text, meta

def build_documents(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build a small DataFrame of docs: id, text, and metadata.
    We'll create one document per original row (could cluster/aggregate later).
    """
    decade_cols = [c for c in df.columns if c.isdigit()]
    docs = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Building docs"):
        text, meta = doc_text_from_row(row, decade_cols)
        docs.append({
            "doc_id": int(idx),
            "text": text,
            "Scenario": meta["Scenario"],
            "Variable": meta["Variable"],
            "Region": meta["Region"],
            "Unit": meta["Unit"]
        })
    docs_df = pd.DataFrame(docs)
    return docs_df

# ---------------------------
# Embeddings + FAISS index
# ---------------------------
def build_and_save_index(docs_df: pd.DataFrame, model_name: str = EMBED_MODEL_NAME):
    model = SentenceTransformer(model_name)
    texts = docs_df["text"].tolist()
    print("Computing embeddings for", len(texts), "documents...")
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    # build FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # inner product; will normalize
    # normalize for cosine similarity
    faiss.normalize_L2(embeddings)
    index.add(embeddings)
    faiss.write_index(index, str(FAISS_INDEX_PATH))
    # save docs and simple metadata
    docs_df.to_parquet(DOCS_PARQUET, index=False)
    meta = {"model_name": model_name, "dim": int(dim), "n_docs": len(texts)}
    with open(METADATA_JSON, "w") as f:
        json.dump(meta, f)
    print("Index saved:", FAISS_INDEX_PATH, "docs:", DOCS_PARQUET)
    return index

def load_index_and_docs():
    if not FAISS_INDEX_PATH.exists() or not DOCS_PARQUET.exists():
        return None, None
    index = faiss.read_index(str(FAISS_INDEX_PATH))
    docs_df = pd.read_parquet(DOCS_PARQUET)
    with open(METADATA_JSON, "r") as f:
        meta = json.load(f)
    print("Loaded index:", meta)
    return index, docs_df

# ---------------------------
# Retrieval
# ---------------------------
def embed_query(model: SentenceTransformer, text: str):
    v = model.encode([text], convert_to_numpy=True)
    faiss.normalize_L2(v)
    return v

def retrieve(index: faiss.Index, docs_df: pd.DataFrame, query: str, model: SentenceTransformer, k=8):
    qv = embed_query(model, query)
    D, I = index.search(qv, k)
    scores = D[0].tolist()
    idxs = I[0].tolist()
    results = []
    for score, idx in zip(scores, idxs):
        if idx < 0 or idx >= len(docs_df):
            continue
        row = docs_df.iloc[idx]
        results.append({
            "doc_id": int(row["doc_id"]),
            "text": row["text"],
            "Scenario": row["Scenario"],
            "Variable": row["Variable"],
            "Region": row["Region"],
            "Unit": row["Unit"],
            "score": float(score)
        })
    return results

# ---------------------------
# Local parsing + fuzzy helpers
# ---------------------------
def parse_years(text: str) -> Tuple[Optional[int], Optional[int]]:
    ys = [int(m.group(0)) for m in re.finditer(r"(19|20)\d{2}", text)]
    if len(ys) >= 2:
        return ys[0], ys[1]
    if len(ys) == 1:
        return ys[0], ys[0]
    return None, None

def fuzzy_choice(token: str, choices: List[str], cutoff=65):
    match, score, _ = process.extractOne(token, choices, scorer=fuzz.WRatio)
    if score >= cutoff:
        return match, score
    return None, score

def infer_slots_from_retrieval(retrieved: List[Dict[str,Any]], user_text: str, top_n=5):
    """
    Heuristic: from top retrieved docs, try to determine likely Variable(s) and Scenario(s).
    Return lists (variables, scenarios) in order of frequency.
    """
    var_counts = {}
    scen_counts = {}
    for r in retrieved[:top_n]:
        var = r.get("Variable")
        scen = r.get("Scenario")
        if isinstance(var, str) and var.strip():
            var_counts[var] = var_counts.get(var, 0) + 1
        if isinstance(scen, str) and scen.strip():
            scen_counts[scen] = scen_counts.get(scen, 0) + 1
    # sort by count
    vars_sorted = sorted(var_counts.items(), key=lambda x: -x[1])
    scens_sorted = sorted(scen_counts.items(), key=lambda x: -x[1])
    return [v for v,c in vars_sorted], [s for s,c in scens_sorted]

# ---------------------------
# Retrieve numeric timeseries and plot
# ---------------------------
def get_time_series_from_df(df: pd.DataFrame, variable: str, scenario: str, region: Optional[str], start: int, end: int):
    # filter exact matches (best). If region None, keep all regions and average across them.
    sub = df
    if variable is not None:
        sub = sub[sub["Variable"] == variable]
    if scenario is not None:
        sub = sub[sub["Scenario"] == scenario]
    if region:
        sub = sub[sub["Region"] == region]
    if sub.empty:
        return pd.DataFrame()

    # pick decade columns
    decade_cols = sorted([int(c) for c in df.columns if c.isdigit()])
    decade_cols = [c for c in decade_cols if c >= start and c <= end]
    decade_strs = [str(c) for c in decade_cols]
    # convert to numeric and aggregate mean across rows
    vals = sub[decade_strs].astype(float).mean(axis=0, skipna=True)
    ts = vals.reset_index()
    ts.columns = ["year","value"]
    ts["year"] = ts["year"].astype(int)
    return ts

def save_plot(ts: pd.DataFrame, label: str, output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    if ts.empty:
        print("No time series to plot for", label)
        return None
    fig = px.line(ts, x="year", y="value", markers=True, title=label)
    fname = output_dir / f"{re.sub(r'[^A-Za-z0-9_\\-]+', '_', label)[:180]}.html"
    fig.write_html(str(fname))
    print("Saved plot to:", fname)
    return fname

# ---------------------------
# CLI interaction
# ---------------------------
def interactive_loop(df: pd.DataFrame, index, docs_df):
    model = SentenceTransformer(EMBED_MODEL_NAME)

    print("\nRAG chatbot ready. Type queries like:")
    print("  Show Emissions|CO2|Energy for EN_NPi2020_1000 from 2020 to 2100")
    print("  Plot Secondary Energy|Electricity between 2030 and 2070 for scenario EN_NPi2020_1400\n")
    print("Type 'exit' or Ctrl-C to quit.\n")

    all_variables = sorted(df["Variable"].dropna().unique().tolist())
    all_scenarios = sorted(df["Scenario"].dropna().unique().tolist())

    while True:
        try:
            q = input(">> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nBye.")
            break
        if not q:
            continue
        if q.lower() in ("exit","quit"):
            break

        # 1) semantic retrieve
        retrieved = retrieve(index, docs_df, q, model, k=8)
        print(f"Retrieved {len(retrieved)} docs (top 3):")
        for r in retrieved[:3]:
            print(f"  [score={r['score']:.3f}] Var={r['Variable']} Scen={r['Scenario']} Reg={r['Region']}")

        # 2) infer variable/scenario candidates from retrieval
        cand_vars, cand_scens = infer_slots_from_retrieval(retrieved, q, top_n=6)
        print("Candidate variables (by retrieval):", cand_vars[:5])
        print("Candidate scenarios (by retrieval):", cand_scens[:5])

        # 3) try to parse years
        start, end = parse_years(q)
        if start is None or end is None:
            # default to available decades in dataset
            decade_cols = sorted([int(c) for c in df.columns if c.isdigit()])
            start = decade_cols[0]; end = decade_cols[-1]
            print(f"No years found in query -> defaulting to {start}-{end}")
        else:
            print(f"Parsed years: {start}-{end}")

        # 4) if user mentioned exact scenario/variable tokens, prefer those (use fuzzy)
        # Attempt to detect explicit scenario/variable tokens present in query (substring or fuzzy)
        chosen_var = None
        chosen_scen = None
        # exact substring match (case-insensitive)
        for v in all_variables:
            if isinstance(v, str) and v.lower() in q.lower() and len(v) > 3:
                chosen_var = v; break
        for s in all_scenarios:
            if isinstance(s, str) and s.lower() in q.lower() and len(s) > 3:
                chosen_scen = s; break
        # fallback to retrieval candidates
        if chosen_var is None and cand_vars:
            chosen_var = cand_vars[0]
        if chosen_scen is None and cand_scens:
            chosen_scen = cand_scens[0]

        # 5) If still missing ask user to clarify
        if chosen_var is None:
            # show top 6 fuzzy matches for tokens in query
            token = q.split()
            match, score = fuzzy_choice(q, all_variables, cutoff=60)
            if match:
                print(f"Fuzzy matched variable -> {match} (score {score})")
                chosen_var = match
            else:
                print("Couldn't determine variable. Please type the exact Variable name (or press enter to skip).")
                ans = input("Variable (or ENTER to skip): ").strip()
                if ans:
                    chosen_var = ans
        if chosen_scen is None:
            match, score = fuzzy_choice(q, all_scenarios, cutoff=60)
            if match:
                print(f"Fuzzy matched scenario -> {match} (score {score})")
                chosen_scen = match
            else:
                print("Couldn't determine scenario. Please type the exact Scenario name (or press enter to skip).")
                ans = input("Scenario (or ENTER to skip): ").strip()
                if ans:
                    chosen_scen = ans

        print("Final chosen:", "Variable=", chosen_var, "Scenario=", chosen_scen)

        # 6) optionally ask region (default None -> aggregate across regions)
        print("If you want a specific region (ISO3), type it, otherwise ENTER to aggregate across regions.")
        region = input("Region (e.g. USA) or ENTER: ").strip() or None

        # 7) extract timeseries and plot
        if chosen_var and chosen_scen:
            ts = get_time_series_from_df(df, chosen_var, chosen_scen, region, start, end)
            label = f"{chosen_var} — {chosen_scen} — {region or 'ALL'}"
            out = save_plot(ts, label, Path("./outputs"))
            if out:
                print("Plot saved. Open the HTML file in a browser to view it.")
            else:
                print("No data found for that combination.")
        else:
            print("Missing variable or scenario. Try a clearer query.")

# ---------------------------
# CLI main
# ---------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild-index", action="store_true", help="Rebuild embeddings index from CSV")
    parser.add_argument("--data", type=str, default=DATA_CSV)
    args = parser.parse_args()

    df_local = load_dataframe(args.data)

    if args.rebuild_index or not (FAISS_INDEX_PATH.exists() and DOCS_PARQUET.exists()):
        print("Building docs -> embeddings -> FAISS index (this can take time)...")
        docs_df = build_documents(df_local)
        build_and_save_index(docs_df)
        print("Index build complete.")
    index, docs_df = load_index_and_docs()
    if index is None:
        print("Index not found. Run with --rebuild-index to create it.")
        return

    interactive_loop(df_local, index, docs_df)

if __name__ == "__main__":
    main()