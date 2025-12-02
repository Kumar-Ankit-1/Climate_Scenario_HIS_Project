#!/usr/bin/env python3
"""
CLI RAG chatbot.

Usage examples:
  # ingest two CSVs and append (or replace with --replace)
  ./cli_bot.py ingest --file1 scenarios1.csv --file2 scenarios2.csv --provider local

  # query natural text
  ./cli_bot.py query "I need AC maintenance in warehouse 7 from 2026-06-01 to 2026-06-10"

  # list stored variables
  ./cli_bot.py vars

  # choose a candidate (if query returned multiple)
  ./cli_bot.py select --index 2 --timeframe "June 1 - June 10 2026"

"""

import os
import sys
import json
import io
import argparse
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import pandas as pd
import numpy as np
import re
import dateparser
from datetime import datetime

# try import faiss but handle missing gracefully
try:
    import faiss
    FAISS_AVAILABLE = True
except Exception as e:
    faiss = None
    FAISS_AVAILABLE = False

# embeddings (local default)
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMER_AVAILABLE = True
except Exception:
    SENTENCE_TRANSFORMER_AVAILABLE = False

load_dotenv()

# configuration from .env with sane defaults
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "faiss.index")
METADATA_PATH = os.getenv("METADATA_PATH", "metadata.json")
VARIABLES_PATH = os.getenv("VARIABLES_PATH", "selected_variables.json")
REPLACE_FAISS = os.getenv("REPLACE_FAISS", "false").lower() in ("1", "true", "yes")
EMBED_DIM = int(os.getenv("EMBED_DIM", "384"))
LOCAL_EMBED_MODEL = os.getenv("LOCAL_EMBED_MODEL", "all-MiniLM-L6-v2")
CONFIDENCE_DIFF_THRESHOLD = float(os.getenv("CONFIDENCE_DIFF_THRESHOLD", "0.15"))
CONFIDENCE_SCORE_THRESHOLD = float(os.getenv("CONFIDENCE_SCORE_THRESHOLD", "0.4"))

# runtime stores
index = None  # faiss index if available
metadata_store: Dict[int, Dict[str, str]] = {}
next_index_id = 0
in_memory_vectors: Optional[np.ndarray] = None  # shape (N, D)
in_memory_ids: List[int] = []

persisted_variables = {
    "scenario": None,
    "matched_variable": None,
    "timeframe": None
}

# ---------- helper: persist/restore ----------
def save_metadata(path: str = METADATA_PATH):
    with open(path, "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in metadata_store.items()}, f, ensure_ascii=False, indent=2)

def load_metadata(path: str = METADATA_PATH):
    global metadata_store
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            metadata_store = {int(k): v for k, v in raw.items()}
    else:
        metadata_store = {}

def save_variables(path: str = VARIABLES_PATH):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(persisted_variables, f, ensure_ascii=False, indent=2)

def load_variables(path: str = VARIABLES_PATH):
    global persisted_variables
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            persisted_variables = json.load(f)

# ---------- embedding (pluggable) ----------
_embed_model = None
def get_local_embed_model():
    global _embed_model
    if _embed_model is None:
        if not SENTENCE_TRANSFORMER_AVAILABLE:
            raise RuntimeError("sentence-transformers not installed. Install `sentence-transformers` or change provider.")
        _embed_model = SentenceTransformer(LOCAL_EMBED_MODEL)
    return _embed_model

def embed_texts(texts: List[str], provider: str = "local") -> np.ndarray:
    if provider == "local":
        model = get_local_embed_model()
        embs = model.encode(texts, convert_to_numpy=True)
        return embs.astype("float32")
    else:
        # provider stubs - user can implement groq/google later
        raise NotImplementedError("Only 'local' provider implemented in CLI. Implement groq/google if needed.")

# ---------- FAISS helpers (or in-memory fallback) ----------
def create_faiss(dim: int = EMBED_DIM):
    global index
    if not FAISS_AVAILABLE:
        print("faiss not available; using in-memory fallback.")
        index = None
        return
    idx = faiss.IndexFlatIP(dim)
    index = idx

def save_faiss(path: str = FAISS_INDEX_PATH):
    if FAISS_AVAILABLE and index is not None:
        faiss.write_index(index, path)

def load_faiss(path: str = FAISS_INDEX_PATH):
    global index
    if FAISS_AVAILABLE and os.path.exists(path):
        index = faiss.read_index(path)
    else:
        index = None

def add_vectors(vectors: np.ndarray, metadatas: List[Dict[str, Any]], replace: bool = False):
    """
    Add vectors + metadata. If FAISS available, use it. Otherwise keep in memory.
    """
    global index, metadata_store, next_index_id, in_memory_vectors, in_memory_ids
    # normalize vectors for cosine similarity
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors_norm = vectors / norms
    if replace:
        # reset stores
        metadata_store = {}
        next_index_id = 0
        in_memory_vectors = None
        in_memory_ids = []
        if FAISS_AVAILABLE:
            create_faiss(vectors_norm.shape[1])
            index.add(vectors_norm.astype("float32"))
            for i, md in enumerate(metadatas):
                metadata_store[i] = md
            next_index_id = len(metadatas)
        else:
            in_memory_vectors = vectors_norm.astype("float32")
            in_memory_ids = list(range(len(metadatas)))
            for i, md in enumerate(metadatas):
                metadata_store[i] = md
            next_index_id = len(metadatas)
    else:
        if FAISS_AVAILABLE:
            if index is None:
                create_faiss(vectors_norm.shape[1])
            index.add(vectors_norm.astype("float32"))
            start = next_index_id
            for i, md in enumerate(metadatas):
                metadata_store[start + i] = md
            next_index_id += len(metadatas)
        else:
            if in_memory_vectors is None:
                in_memory_vectors = vectors_norm.astype("float32")
            else:
                in_memory_vectors = np.vstack([in_memory_vectors, vectors_norm.astype("float32")])
            start = next_index_id
            for i, md in enumerate(metadatas):
                metadata_store[start + i] = md
            in_memory_ids = list(metadata_store.keys())
            next_index_id += len(metadatas)
    # persist metadata and faiss if available
    save_metadata()
    if FAISS_AVAILABLE:
        save_faiss()

def search_vectors(query_vec: np.ndarray, top_k: int = 5):
    """
    Returns list of (index_id, score) ordered by score desc.
    Works with FAISS if available, else brute-force with in-memory vectors.
    """
    # normalize query
    q = query_vec / (np.linalg.norm(query_vec) + 1e-12)
    if FAISS_AVAILABLE and index is not None and index.ntotal > 0:
        D, I = index.search(q.reshape(1, -1).astype("float32"), top_k)
        res = []
        for score, idx in zip(D[0].tolist(), I[0].tolist()):
            if idx == -1:
                continue
            res.append((int(idx), float(score)))
        return res
    else:
        global in_memory_vectors
        if in_memory_vectors is None:
            return []
        # compute cosine similarities
        sims = float(np.dot(in_memory_vectors, q).max())  # not used except debugging
        scores = (in_memory_vectors @ q).tolist()
        indexed = list(enumerate(scores))
        indexed.sort(key=lambda x: x[1], reverse=True)
        return [(int(i), float(s)) for i, s in indexed[:top_k]]

# ---------- timeframe extraction ----------
def extract_timeframes(text: str) -> Optional[str]:
    # look for "from X to Y" or "between X and Y"
    range_patterns = [r"from (.+?) to (.+?)", r"between (.+?) and (.+?)"]
    for pat in range_patterns:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if m:
            groups = m.groups()
            dates = []
            for g in groups:
                parsed = dateparser.parse(g)
                if parsed:
                    dates.append(parsed.date().isoformat())
            if dates:
                return " to ".join(dates)
    # fallback parse single date
    parsed = dateparser.parse(text, settings={"PREFER_DATES_FROM": "future"})
    if parsed:
        return parsed.date().isoformat()
    return None

# ---------- CLI actions ----------
def cmd_ingest(file1: str, file2: str, provider: str = "local", replace: Optional[bool] = None):
    global REPLACE_FAISS
    if replace is None:
        replace_flag = REPLACE_FAISS
    else:
        replace_flag = bool(replace)

    if not os.path.exists(file1) or not os.path.exists(file2):
        print("One of the CSV files does not exist.")
        sys.exit(1)
    df1 = pd.read_csv(file1)
    df2 = pd.read_csv(file2)
    for df in (df1, df2):
        if not set(["name", "description"]).issubset(df.columns):
            print("CSV must have 'name' and 'description' columns.")
            sys.exit(1)
    combined = pd.concat([df1, df2], ignore_index=True)
    texts = (combined["name"].fillna("") + " - " + combined["description"].fillna("")).tolist()
    print(f"Embedding {len(texts)} items with provider '{provider}' ...")
    embs = embed_texts(texts, provider=provider)
    if embs.ndim == 1:
        embs = embs.reshape(1, -1)
    metadatas = []
    for i, row in combined.iterrows():
        metadatas.append({"name": str(row["name"]), "description": str(row["description"]), "source_row": int(i)})
    add_vectors(embs.astype("float32"), metadatas, replace=replace_flag)
    print(f"Ingested {len(metadatas)} items. REPLACE={replace_flag}")

def cmd_query(query_text: str, top_k: int = 5, provider: str = "local"):
    # embed query
    q_emb = embed_texts([query_text], provider=provider)[0]
    results = search_vectors(q_emb, top_k=top_k)
    if not results:
        print("No matches found in index. Please ingest data or try rephrasing.")
        return
    # present candidates
    print("Top candidates:")
    for idx, score in results:
        md = metadata_store.get(idx, {})
        print(f"  index={idx} score={score:.4f} name={md.get('name')} desc={md.get('description')[:120]}...")
    # decide confidence
    top_idx, top_score = results[0]
    second_score = results[1][1] if len(results) > 1 else -1.0
    if (top_score - second_score > CONFIDENCE_DIFF_THRESHOLD) and (top_score > CONFIDENCE_SCORE_THRESHOLD):
        timeframe = extract_timeframes(query_text)
        selected = {
            "scenario": metadata_store[top_idx]["name"],
            "matched_variable": metadata_store[top_idx]["description"],
            "timeframe": timeframe
        }
        persisted_variables.update(selected)
        save_variables()
        print("\nAuto-selected best match with high confidence:")
        print(json.dumps(selected, indent=2))
        return
    else:
        # ambiguous
        print("\nAmbiguous results. Please choose index (use `select --index <id>`).")
        # briefly show suggestion for timeframe if any
        tf = extract_timeframes(query_text)
        if tf:
            print(f"Detected timeframe suggestion: {tf}")

def cmd_select(index_id: int, timeframe_override: Optional[str] = None):
    md = metadata_store.get(index_id)
    if md is None:
        print("index_id not found in metadata.")
        return
    timeframe = None
    if timeframe_override:
        parsed = extract_timeframes(timeframe_override) or timeframe_override
        timeframe = parsed
    selected = {
        "scenario": md.get("name"),
        "matched_variable": md.get("description"),
        "timeframe": timeframe
    }
    persisted_variables.update(selected)
    save_variables()
    print("Selection stored:")
    print(json.dumps(selected, indent=2))

def cmd_vars():
    load_variables()
    print("Stored variables:")
    print(json.dumps(persisted_variables, indent=2))

def cmd_init():
    # utility to load existing faiss + metadata if present
    load_metadata()
    load_faiss()
    load_variables()
    print("Loaded metadata keys:", list(metadata_store.keys())[:10], " total:", len(metadata_store))
    if FAISS_AVAILABLE and index is not None:
        print("FAISS index loaded. ntotal:", index.ntotal)
    else:
        print("FAISS index not loaded or not available; using in-memory fallback.")

# ---------- CLI wiring ----------
def main():
    parser = argparse.ArgumentParser(prog="cli_bot.py")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ingest = sub.add_parser("ingest", help="Ingest two CSV files (name, description columns).")
    p_ingest.add_argument("--file1", required=True)
    p_ingest.add_argument("--file2", required=True)
    p_ingest.add_argument("--provider", default="local", choices=["local"], help="Embedding provider.")
    p_ingest.add_argument("--replace", action="store_true", help="Replace existing index/metadata.")

    p_query = sub.add_parser("query", help="Query natural text and get matches.")
    p_query.add_argument("text", help="Natural language query (surround with quotes).")
    p_query.add_argument("--top_k", type=int, default=5)
    p_query.add_argument("--provider", default="local", choices=["local"])

    p_select = sub.add_parser("select", help="Select a candidate by index id.")
    p_select.add_argument("--index", type=int, required=True)
    p_select.add_argument("--timeframe", default=None, help="Optional timeframe override text.")

    p_vars = sub.add_parser("vars", help="Show stored variables.")

    p_init = sub.add_parser("init", help="Load index/metadata/variables from disk and report status.")

    args = parser.parse_args()

    # ensure metadata loaded on start
    load_metadata()
    load_variables()

    if args.cmd == "ingest":
        cmd_ingest(args.file1, args.file2, provider=args.provider, replace=args.replace)
    elif args.cmd == "query":
        cmd_query(args.text, top_k=args.top_k, provider=args.provider)
    elif args.cmd == "select":
        cmd_select(args.index, timeframe_override=args.timeframe)
    elif args.cmd == "vars":
        cmd_vars()
    elif args.cmd == "init":
        cmd_init()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()