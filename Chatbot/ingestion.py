# ingestion.py
"""
Ingestion: build FAISS index from variables + scenarios CSVs.
EmbeddingProvider uses local sentence-transformers by default,
but will call a remote Gemini embedding endpoint if GEMINI_EMBED_URL + GEMINI_API_KEY are set.
"""
import os
import csv
import json
import argparse
import io
from typing import List
import numpy as np
import requests

# try imports
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None
try:
    import faiss
except Exception:
    faiss = None

def call_remote_embeddings(url: str, api_key: str, texts: List[str], timeout=30):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"input": texts}
    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
    resp.raise_for_status()
    j = resp.json()
    # tolerate shapes
    if isinstance(j, dict):
        if "data" in j and isinstance(j["data"], list):
            out = []
            for d in j["data"]:
                emb = d.get("embedding") or d.get("emb") or d.get("vector")
                out.append(emb)
            return out
        if "embeddings" in j:
            return j["embeddings"]
        if "embedding" in j and isinstance(j["embedding"][0], (list, float)):
            return j["embedding"]
    if isinstance(j, list) and isinstance(j[0], dict) and "embedding" in j[0]:
        return [d["embedding"] for d in j]
    raise ValueError("Unexpected embedding response: %s" % j)

class EmbeddingProvider:
    def __init__(self):
        self.gemini_url = os.getenv("GEMINI_EMBED_URL")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self._sbert = None
        if not (self.gemini_url and self.gemini_key) and SentenceTransformer is None:
            raise RuntimeError("No remote embedding configured and sentence-transformers not installed.")
    def embed_batch(self, texts: List[str]) -> np.ndarray:
        if self.gemini_url and self.gemini_key:
            vecs = call_remote_embeddings(self.gemini_url, self.gemini_key, texts)
            arr = np.array(vecs, dtype=np.float32)
            return arr
        if self._sbert is None:
            self._sbert = SentenceTransformer("all-MiniLM-L6-v2")
        arr = self._sbert.encode(texts, convert_to_numpy=True)
        if arr.dtype != np.float32:
            arr = arr.astype(np.float32)
        return arr
    def embed_one(self, text: str) -> np.ndarray:
        return self.embed_batch([text])[0]

# CSV loaders
def load_variables_csv(path: str):
    items = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            var = (row.get("variable") or row.get("Variable") or row.get("name") or "").strip()
            desc = (row.get("description") or row.get("Description") or "").strip()
            if not var:
                continue
            items.append({"type":"variable","id":var,"text":f"{var}. {desc}".strip(),"meta":{"variable":var,"description":desc}})
    return items

def load_scenarios_csv(path: str):
    txt = None
    encs = ("utf-8-sig","utf-8","latin-1")
    for e in encs:
        try:
            with open(path,"r",encoding=e) as fh:
                txt = fh.read()
            break
        except Exception:
            txt = None
    if txt is None:
        raise RuntimeError(f"Cannot read {path}")
    reader = csv.DictReader(io.StringIO(txt))
    items = []
    ctr = 0
    for row in reader:
        ctr += 1
        sid = (row.get("scenario") or row.get("name") or row.get("id") or "").strip()
        text = (row.get("description") or row.get("text") or "").strip()
        if not sid and text:
            sid = f"sc-{ctr}"
        if sid:
            items.append({"type":"scenario","id":sid,"text":text,"meta":{"scenario_id":sid,"text":text}})
    # fallback: one-per-line
    if not items:
        for i,line in enumerate(txt.splitlines(),1):
            s=line.strip()
            if s:
                items.append({"type":"scenario","id":f"sc-{i}","text":s,"meta":{"scenario_id":f"sc-{i}","text":s}})
    return items

def build_and_save_index(corpus_items, index_dir: str, meta_path: str, batch_size=64):
    if faiss is None:
        raise RuntimeError("faiss not available. Install faiss-cpu or use conda.")
    os.makedirs(index_dir, exist_ok=True)
    emb = EmbeddingProvider()
    texts = [it["text"] for it in corpus_items]
    all_emb = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        arr = emb.embed_batch(batch)
        all_emb.append(arr)
    embeddings = np.vstack(all_emb).astype(np.float32)
    dim = embeddings.shape[1]
    # Use HNSW for scalable approximate NN
    index = faiss.IndexHNSWFlat(dim, 32)
    index.hnsw.efConstruction = 200
    index = faiss.IndexIDMap(index)
    ids = np.arange(1, len(corpus_items)+1, dtype=np.int64)
    index.add_with_ids(embeddings, ids)
    idx_file = os.path.join(index_dir, "faiss.index")
    faiss.write_index(index, idx_file)
    metadata = {}
    for i, item in enumerate(corpus_items):
        metadata[str(int(ids[i]))] = {"type": item["type"], "id": item["id"], "text": item["text"], "meta": item["meta"]}
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    return idx_file, meta_path

def main(vars_csv, scen_csv, index_dir, meta_path):
    vars_items = load_variables_csv(vars_csv)
    scen_items = load_scenarios_csv(scen_csv)
    corpus = vars_items + scen_items
    if not corpus:
        raise RuntimeError("No items loaded.")
    print(f"Loaded {len(vars_items)} variables and {len(scen_items)} scenarios -> total {len(corpus)} items.")
    idx_file, meta_file = build_and_save_index(corpus, index_dir, meta_path)
    print("Saved FAISS index:", idx_file)
    print("Saved metadata:", meta_file)

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--variables", required=True)
    p.add_argument("--scenarios", required=True)
    p.add_argument("--index-dir", default="./vector_index")
    p.add_argument("--meta", default="./metadata.json")
    args = p.parse_args()
    main(args.variables, args.scenarios, args.index_dir, args.meta)