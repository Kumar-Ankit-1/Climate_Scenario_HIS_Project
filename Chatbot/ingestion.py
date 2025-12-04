# ingestion.py
"""
Ingestion script (robust)
- variables.csv: header: variable,description
- scenarios.csv: tolerant headers: name/description OR scenario_id/scenario_text OR many variants
- Builds embeddings (remote GEMINI if env set, otherwise sentence-transformers)
- Builds FAISS index and saves metadata JSON mapping index ids -> item metadata

Usage:
  python ingestion.py --variables variables.csv --scenarios scenarios.csv --index-dir ./vector_index --meta ./metadata.json
"""
import os
import csv
import json
import argparse
from typing import List
import numpy as np
import requests
import io

# optional imports
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    import faiss
except Exception:
    faiss = None

# ------------------------
# Embedding wrapper
# ------------------------
def _call_remote_embedding(api_url: str, api_key: str, texts: List[str]) -> List[List[float]]:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"input": texts}
    resp = requests.post(api_url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    j = resp.json()
    if isinstance(j, dict):
        if "data" in j and isinstance(j["data"], list) and "embedding" in j["data"][0]:
            return [d["embedding"] for d in j["data"]]
        if "embeddings" in j:
            return j["embeddings"]
        if "embedding" in j and isinstance(j["embedding"][0], (list, float)):
            return j["embedding"]
        if "embedding" in j:
            return [j["embedding"]]
    if isinstance(j, list):
        extracted = []
        for el in j:
            if isinstance(el, dict) and "embedding" in el:
                extracted.append(el["embedding"])
            else:
                raise ValueError("Unrecognized embedding response shape")
        return extracted
    raise ValueError("Unrecognized embedding response JSON: " + str(j))

class EmbeddingProvider:
    def __init__(self):
        self.gemini_url = os.getenv("GEMINI_API_URL")
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self._sbert = None
    def embed_batch(self, texts: List[str]) -> np.ndarray:
        if self.gemini_url and self.gemini_key:
            emb_list = _call_remote_embedding(self.gemini_url, self.gemini_key, texts)
            arr = np.array(emb_list, dtype=np.float32)
            return arr
        if SentenceTransformer is None:
            raise RuntimeError(
                "sentence-transformers not installed and no GEMINI_API configured. "
                "Install sentence-transformers or set GEMINI_API_URL+GEMINI_API_KEY."
            )
        if self._sbert is None:
            self._sbert = SentenceTransformer("all-MiniLM-L6-v2")
        arr = self._sbert.encode(texts, convert_to_numpy=True)
        if arr.dtype != np.float32:
            arr = arr.astype(np.float32)
        return arr

    def embed_one(self, text: str) -> np.ndarray:
        return self.embed_batch([text])[0]

# ------------------------
# Robust CSV loaders
# ------------------------
def load_variables_csv(path: str):
    items = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            var = (row.get("variable") or row.get("name") or row.get("Variable") or "").strip()
            desc = (row.get("description") or row.get("desc") or row.get("Description") or "").strip()
            if not var:
                continue
            items.append({
                "type": "variable",
                "id": var,
                "text": f"{var}. {desc}".strip(),
                "meta": {"variable": var, "description": desc}
            })
    return items

def _try_read_text(path):
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            with open(path, "r", encoding=enc, newline="") as fh:
                txt = fh.read()
            return txt, enc
        except Exception:
            pass
    raise RuntimeError(f"Unable to read file: {path} with utf-8/latin-1 encodings")

def load_scenarios_csv(path: str):
    txt, enc = _try_read_text(path)
    lines = txt.splitlines()
    if not lines:
        return []
    delim = ","
    try:
        sn = csv.Sniffer()
        dialect = sn.sniff("\n".join(lines[:50]))
        delim = dialect.delimiter
    except Exception:
        delim = ","
    reader = csv.DictReader(io.StringIO(txt), delimiter=delim)
    headers = [h for h in (reader.fieldnames or []) if h]
    header_map = {}
    for h in headers:
        lh = h.lower().strip().replace(" ", "_").replace("-", "_")
        header_map[lh] = h

    id_candidates = ["scenario_id","id","scenario","name","scenarioid","scen_id","scenid"]
    text_candidates = ["scenario_text","text","description","scenario_description","scenariotext","scenario-text","desc"]

    found_id = None
    found_text = None
    for cand in id_candidates:
        if cand in header_map:
            found_id = header_map[cand]; break
    for cand in text_candidates:
        if cand in header_map:
            found_text = header_map[cand]; break

    items = []
    if found_id or found_text:
        ctr = 0
        for row in reader:
            ctr += 1
            sid = (row.get(found_id) or "").strip() if found_id else ""
            textval = (row.get(found_text) or "").strip() if found_text else ""
            if not sid:
                for h in ("scenario_id","id","scenario","name"):
                    if h in row and (row.get(h) or "").strip():
                        sid = (row.get(h) or "").strip()
                        break
            if not textval:
                for h in ("scenario_text","text","description"):
                    if h in row and (row.get(h) or "").strip():
                        textval = (row.get(h) or "").strip()
                        break
            if (sid and sid.strip()) or (textval and textval.strip()):
                if not sid:
                    sid = f"sc-{ctr}"
                if not textval:
                    textval = ""
                items.append({"type":"scenario","id":sid,"text":textval,"meta":{"scenario_id":sid,"text":textval}})
        return items

    ctr = 0
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        ctr += 1
        sid = f"sc-{ctr}"
        items.append({"type":"scenario","id":sid,"text":s,"meta":{"scenario_id":sid,"text":s}})
    return items

# ------------------------
# Build faiss index
# ------------------------
def build_and_save_index(corpus_items, index_dir: str, meta_path: str, batch_size=64):
    if faiss is None:
        raise RuntimeError("faiss not installed. Install 'faiss-cpu' (pip) or use Conda.")
    os.makedirs(index_dir, exist_ok=True)
    emb_provider = EmbeddingProvider()
    texts = [it["text"] for it in corpus_items]
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        arr = emb_provider.embed_batch(batch)
        embeddings.append(arr)
    embeddings = np.vstack(embeddings).astype(np.float32)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index_id_map = faiss.IndexIDMap(index)
    ids = np.arange(1, len(corpus_items) + 1, dtype=np.int64)
    index_id_map.add_with_ids(embeddings, ids)
    idx_file = os.path.join(index_dir, "faiss.index")
    faiss.write_index(index_id_map, idx_file)
    metadata = {}
    for i, item in enumerate(corpus_items):
        metadata[str(int(ids[i]))] = {
            "type": item["type"],
            "id": item["id"],
            "text": item["text"],
            "meta": item["meta"]
        }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    return idx_file, meta_path

# ------------------------
# Main
# ------------------------
def main(variables_csv, scenarios_csv, index_dir, meta_path):
    vars_items = load_variables_csv(variables_csv)
    scen_items = load_scenarios_csv(scenarios_csv)
    corpus = vars_items + scen_items
    if len(corpus) == 0:
        raise RuntimeError("No corpus items loaded. Check CSV files.")
    print(f"Loaded {len(vars_items)} variables and {len(scen_items)} scenarios -> total {len(corpus)} items.")
    idx_file, meta_file = build_and_save_index(corpus, index_dir, meta_path)
    print(f"Saved FAISS index to {idx_file}")
    print(f"Saved metadata to {meta_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--variables", required=True, help="variables CSV path (columns: variable,description)")
    parser.add_argument("--scenarios", required=True, help="scenarios CSV path (columns: scenario_id,scenario_text OR name,description)")
    parser.add_argument("--index-dir", default="./vector_index", help="directory to store faiss.index")
    parser.add_argument("--meta", default="./metadata.json", help="metadata json path")
    args = parser.parse_args()
    main(args.variables, args.scenarios, args.index_dir, args.meta)