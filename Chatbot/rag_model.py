# rag_model.py
"""
RAG wrapper that:
 - loads optional external domain context file(s)
 - retrieves top-k documents from FAISS (metadata.json)
 - calls a remote Gemini-style generator with a strict JSON-only prompt
 - parses & validates JSON output
 - merges generated values with dataset values when available
 - falls back to deterministic synthetic series when needed

Place this file at project root (with ingestion.py, metadata.json, vector_index/)
Environment variables:
 - GEMINI_GEN_URL         : (optional) remote generator endpoint
 - GEMINI_API_KEY_GEN     : (optional) API key for generator (or GEMINI_API_KEY)
 - GEMINI_TEMPERATURE     : (optional) default 0.0
 - GEMINI_MAX_TOKENS      : (optional) default 512
"""

import os
import json
import logging
import random
import re
from typing import Dict, Any, List, Optional
import numpy as np
import requests

# Try to import faiss and the local EmbeddingProvider from ingestion.py
try:
    import faiss
except Exception:
    faiss = None

try:
    from ingestion import EmbeddingProvider
except Exception as e:
    raise ImportError("ingestion.EmbeddingProvider not found. Make sure ingestion.py exists and defines EmbeddingProvider.") from e

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# -----------------------
# External context helpers
# -----------------------
def load_external_context_file(path: str = "domain_context.txt") -> str:
    """
    Loads a single external context file. If it does not exist, returns empty string.
    """
    if not path:
        return ""
    if not os.path.exists(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except Exception as e:
        logger.warning("Could not read external context %s: %s", path, e)
        return ""

def load_external_context_folder(folder: str = "context") -> str:
    """
    If you want to keep multiple small files, put them in ./context/ and this will load
    and concatenate them (sorted alphabetically).
    """
    if not os.path.isdir(folder):
        return ""
    pieces = []
    for fname in sorted(os.listdir(folder)):
        if not fname.lower().endswith((".txt", ".md")):
            continue
        p = os.path.join(folder, fname)
        try:
            with open(p, "r", encoding="utf-8") as fh:
                text = fh.read().strip()
                if text:
                    pieces.append(f"### {fname}\n{text}")
        except Exception as e:
            logger.warning("Failed to read %s: %s", p, e)
    return "\n\n".join(pieces)


# -----------------------
# RAG class
# -----------------------
class RAG:
    def __init__(self, index_dir: str = "./vector_index", meta_path: str = "./metadata.json", top_k: int = 8,
                 external_context_path: str = "domain_context.txt", external_context_dir: str = "context"):
        """
        index_dir: directory containing faiss.index (IndexIDMap)
        meta_path: metadata.json created by ingestion.py
        top_k: number of retrieval docs to include in the prompt
        external_context_path: optional single file with domain knowledge
        external_context_dir: optional folder with multiple small context files
        """
        if faiss is None:
            raise RuntimeError("faiss not available. Install faiss-cpu or use conda faiss build.")
        idx_file = os.path.join(index_dir, "faiss.index")
        if not os.path.exists(idx_file):
            raise FileNotFoundError(f"FAISS index not found at {idx_file}")
        self.index = faiss.read_index(idx_file)
        # if HNSW index exists, set efSearch for query-time tuning
        try:
            if hasattr(self.index, "hnsw"):
                self.index.hnsw.efSearch = 64
        except Exception:
            pass

        if not os.path.exists(meta_path):
            raise FileNotFoundError(f"metadata.json not found at {meta_path}")
        with open(meta_path, "r", encoding="utf-8") as fh:
            self.metadata = json.load(fh)

        self.emb = EmbeddingProvider()
        self.top_k = int(top_k)

        # External context
        self.external_context_file = external_context_path
        self.external_context_dir = external_context_dir
        # load once (cached)
        self._external_context = None

        # Gemini config (optional)
        self.gemini_url = os.getenv("GEMINI_GEN_URL")
        self.gemini_key = os.getenv("GEMINI_API_KEY_GEN") or os.getenv("GEMINI_API_KEY")
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.0"))
        self.max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "512"))

    # ---------------------------
    # Context loaders
    # ---------------------------
    def _load_external_context(self) -> str:
        if self._external_context is not None:
            return self._external_context
        # load single file first, then folder
        txt1 = load_external_context_file(self.external_context_file)
        txt2 = load_external_context_folder(self.external_context_dir)
        combined = "\n\n".join([t for t in (txt1, txt2) if t])
        self._external_context = combined
        return combined

    # ---------------------------
    # Retrieval helpers
    # ---------------------------
    def _embed(self, text: str) -> np.ndarray:
        emb = self.emb.embed_one(text)
        return np.asarray(emb, dtype=np.float32)

    def retrieve(self, text: str, k: Optional[int] = None, doc_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve documents by semantic search, optionally filtering by type (variable, scenario, etc.)"""
        if k is None:
            k = self.top_k
        q_emb = self._embed(text)
        if q_emb.ndim == 1:
            q_emb = np.expand_dims(q_emb, axis=0)
        D, I = self.index.search(q_emb, k * 3)  # Get more candidates to filter
        ids = I[0].tolist()
        results = []
        for id_ in ids:
            if id_ == -1:
                continue
            meta = self.metadata.get(str(int(id_)))
            if meta:
                # Filter by type if specified
                if doc_type and meta.get("type") != doc_type:
                    continue
                results.append(meta)
                if len(results) >= k:
                    break
        return results

    # ---------------------------
    # Gemini call helpers
    # ---------------------------
    def _call_gemini(self, prompt: str, temperature: float = 0.0, max_tokens: int = 512, timeout: int = 60) -> Any:
        if not (self.gemini_url and self.gemini_key):
            raise RuntimeError("Gemini generation not configured (GEMINI_GEN_URL/GEMINI_API_KEY_GEN).")
        headers = {"Content-Type": "application/json"}
        # Google Gemini API expects contents with parts format
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": float(temperature),
                "maxOutputTokens": int(max_tokens),
                "topP": 0.95,
                "topK": 40
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_UNSPECIFIED",
                    "threshold": "BLOCK_NONE"
                }
            ]
        }
        # Append API key to URL if not in headers
        url = self.gemini_url
        if "key=" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}key={self.gemini_key}"
        
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    def _extract_text_from_response(self, resp_json: Any) -> str:
        # flexibly handle common shapes
        if isinstance(resp_json, str):
            return resp_json
        if isinstance(resp_json, dict):
            # Handle Google Gemini API response format
            if "candidates" in resp_json and isinstance(resp_json["candidates"], list):
                if len(resp_json["candidates"]) > 0:
                    candidate = resp_json["candidates"][0]
                    if "content" in candidate and isinstance(candidate["content"], dict):
                        parts = candidate["content"].get("parts", [])
                        if isinstance(parts, list) and len(parts) > 0:
                            text = parts[0].get("text", "")
                            if isinstance(text, str):
                                return text
            # Handle standard keys
            for k in ("output_text", "text", "result", "generated_text"):
                if k in resp_json and isinstance(resp_json[k], str):
                    return resp_json[k]
            if "choices" in resp_json and isinstance(resp_json["choices"], list) and len(resp_json["choices"]) > 0:
                c0 = resp_json["choices"][0]
                if isinstance(c0, dict):
                    for k in ("text", "message", "output_text"):
                        if k in c0 and isinstance(c0[k], str):
                            return c0[k]
                    if "message" in c0 and isinstance(c0["message"], dict) and "content" in c0["message"]:
                        cont = c0["message"]["content"]
                        if isinstance(cont, str):
                            return cont
                        if isinstance(cont, dict):
                            parts = cont.get("parts")
                            if isinstance(parts, list) and parts:
                                return parts[0]
            if "data" in resp_json and isinstance(resp_json["data"], list):
                texts = []
                for itm in resp_json["data"]:
                    if isinstance(itm, dict) and isinstance(itm.get("text"), str):
                        texts.append(itm["text"])
                if texts:
                    return "\n".join(texts)
        try:
            return json.dumps(resp_json)
        except Exception:
            return str(resp_json)

    # ---------------------------
    # Parse JSON from text
    # ---------------------------
    def _parse_json_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        if not text or not isinstance(text, str):
            return None
        # First try direct parse
        try:
            obj = json.loads(text.strip())
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass
        
        # Try to find JSON object in text (with aggressive cleanup)
        text_clean = text.strip()
        # Remove markdown code blocks if present
        if text_clean.startswith("```json"):
            text_clean = text_clean[7:]
        if text_clean.startswith("```"):
            text_clean = text_clean[3:]
        if text_clean.endswith("```"):
            text_clean = text_clean[:-3]
        
        # Search for JSON object
        start_idx = text_clean.find("{")
        if start_idx != -1:
            # Find matching closing brace
            brace_count = 0
            for i in range(start_idx, len(text_clean)):
                if text_clean[i] == "{":
                    brace_count += 1
                elif text_clean[i] == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        candidate = text_clean[start_idx:i+1]
                        try:
                            obj = json.loads(candidate)
                            if isinstance(obj, dict):
                                return obj
                        except Exception:
                            # Try best-effort cleanup of trailing commas
                            candidate2 = re.sub(r",\s*}", "}", candidate)
                            candidate2 = re.sub(r",\s*]", "]", candidate2)
                            try:
                                obj = json.loads(candidate2)
                                if isinstance(obj, dict):
                                    return obj
                            except Exception:
                                pass
        return None

    # ---------------------------
    # Tabular merge & validation
    # ---------------------------
    def _load_tabular_store(self) -> Dict[str, Any]:
        path = "tabular_data.json"
        if not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return json.load(fh)
        except Exception as e:
            logger.warning("Could not load tabular_data.json: %s", e)
            return {}

    def _validate_and_merge(self, series: List[Dict[str, Any]], variable: str, scenario: str, region: str,
                            tolerance: float = 0.2) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        tab = self._load_tabular_store()
        key = f"{scenario.lower()}|{region.lower()}|{variable.lower()}"
        entry = tab.get(key)
        checks = {"mismatches": [], "used_dataset_years": [], "synthesized_years": []}
        merged = []
        for p in series:
            try:
                year = int(p.get("year"))
                val = float(p.get("value"))
            except Exception:
                continue
            ds_val = None
            if entry:
                ds_val = entry.get("aggregate", {}).get(str(year))
            if ds_val is not None:
                rel = abs(ds_val - val) / (abs(ds_val) + 1e-9)
                if rel > tolerance:
                    checks["mismatches"].append({"year": year, "dataset": float(ds_val), "generated": float(val), "rel_diff": rel})
                merged.append({"year": year, "value": float(ds_val), "source_ids": [], "synthesized": False})
                checks["used_dataset_years"].append(year)
            else:
                synth_flag = bool(p.get("synthesized", False))
                if synth_flag:
                    checks["synthesized_years"].append(year)
                merged.append({"year": year, "value": float(val), "source_ids": p.get("source_ids", []), "synthesized": synth_flag})
        return merged, checks

    # ---------------------------
    # Synthetic fallback
    # ---------------------------
    def _synthesize_series(self, start: int, end: int, seed: Optional[int] = None) -> List[Dict[str, Any]]:
        if seed is None:
            seed = (start + end) & 0xffffffff
        rng = random.Random(seed)
        base = rng.uniform(10.0, 100.0)
        slope = rng.uniform(-0.5, 0.5)
        res = []
        for i, y in enumerate(range(start, end + 1)):
            val = base + slope * i + rng.uniform(-1.0, 1.0)
            res.append({"year": int(y), "value": round(val, 6), "source_ids": [], "synthesized": True})
        return res

    # ---------------------------
    # Public generate()
    # ---------------------------
    def generate(self, variable_meta: Any, scenario_meta: Any, start_year: int = 2020, end_year: int = 2100,
                 region: str = "Global", max_tokens: Optional[int] = None) -> Dict[str, Any]:
        if max_tokens is None:
            max_tokens = self.max_tokens

        # normalize variable/scenario
        if isinstance(variable_meta, dict):
            var_text = variable_meta.get("text", variable_meta.get("id"))
            var_id = variable_meta.get("id")
        else:
            var_text = str(variable_meta)
            var_id = str(variable_meta)
        if isinstance(scenario_meta, dict):
            scen_text = scenario_meta.get("text", scenario_meta.get("id"))
            scen_id = scenario_meta.get("id")
        else:
            scen_text = str(scenario_meta)
            scen_id = str(scenario_meta)

        # retrieval context
        query = f"{var_text} {scen_text} {region}"
        retrieved = self.retrieve(query, k=self.top_k)
        context_lines = []
        for r in retrieved:
            rid = r.get("id")
            excerpt = (r.get("text") or "")[:450]
            context_lines.append(f"{rid} || {excerpt}")
        retrieved_context = "\n".join(context_lines)

        # external domain context
        external_context = self._load_external_context()

        # build prompt with both contexts (external domain context + retrieved docs)
        prompt = f"""You are a factual climate data generator. Your task is to generate a time series for climate scenario data.

**STRICT RULES - MUST FOLLOW:**
1. Return ONLY valid JSON. Do NOT include any explanatory text, markdown, or commentary.
2. Use ONLY data from the RETRIEVED CONTEXT and EXTERNAL DOMAIN CONTEXT provided below.
3. Do NOT invent, hallucinate, or guess values beyond what these contexts explicitly support.
4. Synthesize missing years ONLY if necessary, and mark them with synthesized=true.
5. For all other years, set synthesized=false and include source_ids from the retrieved context.
6. If you cannot find relevant data in the contexts, still generate entries but mark them as synthesized=true.

**REQUEST DETAILS:**
Variable: {var_id}
Scenario: {scen_id}
Region: {region}
Years: {start_year} to {end_year}

**EXTERNAL DOMAIN CONTEXT:**
{external_context}

**RETRIEVED CONTEXT (id || excerpt):**
{retrieved_context}

**REQUIRED OUTPUT FORMAT - RETURN ONLY THIS JSON:**
{{
  "series": [
    {{"year": 2020, "value": 100.5, "source_ids": ["id1", "id2"], "synthesized": false}},
    {{"year": 2025, "value": 112.3, "source_ids": [], "synthesized": true}},
    {{"year": 2100, "value": 250.0, "source_ids": ["id3"], "synthesized": false}}
  ]
}}

**GENERATION REQUIREMENTS:**
- Generate exactly one entry for each year from {start_year} to {end_year}.
- "year": integer year value (required)
- "value": numeric value as float/int (required) 
- "source_ids": list of document IDs from RETRIEVED CONTEXT if data comes from context, otherwise empty list [] (required)
- "synthesized": boolean true only if value is not from context, false if it came from context (required)
- Do NOT add any other fields
- Do NOT include any text outside the JSON object

Return the JSON object now, with no additional text:"""

        # Attempt remote generation if configured
        if self.gemini_url and self.gemini_key:
            try:
                logger.info("Calling remote generator at %s", self.gemini_url)
                resp_json = self._call_gemini(prompt, temperature=self.temperature, max_tokens=max_tokens, timeout=60)
                raw_text = self._extract_text_from_response(resp_json)
                parsed = self._parse_json_from_text(raw_text)
                if parsed and isinstance(parsed.get("series"), list):
                    # normalize and merge
                    normalized = []
                    for s in parsed.get("series"):
                        try:
                            y = int(s.get("year"))
                            v = float(s.get("value"))
                        except Exception:
                            continue
                        normalized.append({
                            "year": int(y),
                            "value": float(v),
                            "source_ids": s.get("source_ids", []) if isinstance(s.get("source_ids", []), list) else [],
                            "synthesized": bool(s.get("synthesized", False))
                        })
                    merged, checks = self._validate_and_merge(normalized, str(var_id), str(scen_id), region)
                    return {"series": merged, "source": "remote_llm", "debug_checks": checks}
                else:
                    logger.warning("Remote generator returned no valid JSON 'series'. Falling back to synth.")
            except Exception as e:
                logger.exception("Remote generation failed: %s", e)

        # Fallback synthetic series
        series = self._synthesize_series(start_year, end_year, seed=hash(f"{var_id}::{scen_id}::{region}") & 0xffffffff)
        return {"series": series, "source": "synth_fallback", "debug_checks": {}}