# rag_model.py
"""
Robust RAG wrapper (region-aware)
- Handles common faiss/index/embedding errors gracefully
- Uses EmbeddingProvider from ingestion.py for embeddings
- Falls back to synthetic timeseries if remote LLM unavailable or fails
"""
import os
import json
import re
import random
import logging
from typing import List, Optional, Dict, Any

import numpy as np
import requests

# configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# lazy-import faiss to avoid import-time crash if not available
try:
    import faiss
except Exception:
    faiss = None

# EmbeddingProvider is defined in ingestion.py. Import lazily in __init__ to avoid import-time errors.
# from ingestion import EmbeddingProvider  # DO NOT import at module top-level


class RAG:
    def __init__(self, index_dir: str = "./vector_index", meta_path: str = "./metadata.json", top_k: int = 6):
        """
        Initializes the RAG object:
         - loads FAISS index (requires faiss)
         - loads metadata JSON mapping index id -> item metadata
         - constructs EmbeddingProvider from ingestion.py
        """
        if faiss is None:
            raise RuntimeError("faiss is not installed or failed to import. Install 'faiss-cpu' or use conda.")

        idx_file = os.path.join(index_dir, "faiss.index")
        if not os.path.exists(idx_file):
            raise FileNotFoundError(f"FAISS index not found at {idx_file}. Run ingestion.py first.")

        try:
            # read index. works with IndexIDMap wrapping IndexFlatL2 etc.
            self.index = faiss.read_index(idx_file)
        except Exception as e:
            logger.exception("Failed to read FAISS index")
            raise

        if not os.path.exists(meta_path):
            raise FileNotFoundError(f"Metadata file not found at {meta_path}. Run ingestion.py first.")
        try:
            with open(meta_path, "r", encoding="utf-8") as fh:
                self.metadata = json.load(fh)
        except Exception as e:
            logger.exception("Failed to load metadata.json")
            raise

        # lazy import EmbeddingProvider now
        try:
            from ingestion import EmbeddingProvider  # local import
            self.emb = EmbeddingProvider()
        except Exception as e:
            logger.exception("Failed to import EmbeddingProvider from ingestion.py")
            raise

        self.top_k = top_k
        self.gemini_url = os.getenv("GEMINI_API_URL")
        self.gemini_key = os.getenv("GEMINI_API_KEY")

    def _embed_text(self, text: str) -> np.ndarray:
        """Embed a single text using the embedding provider. Raises on failure."""
        if not text:
            raise ValueError("Cannot embed empty text.")
        emb = self.emb.embed_one(text)
        emb = np.asarray(emb, dtype=np.float32)
        return emb

    def retrieve(self, text: str, k: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Return up to k metadata documents retrieved for text.
        Returns list of metadata dicts in ranked order.
        """
        if k is None:
            k = self.top_k
        q_emb = self._embed_text(text)
        if q_emb.ndim == 1:
            q_emb = np.expand_dims(q_emb, axis=0)
        try:
            D, I = self.index.search(q_emb.astype(np.float32), k)
        except Exception as e:
            logger.exception("FAISS search failed")
            raise
        ids = I[0].tolist()
        results = []
        for idx in ids:
            if idx == -1:
                continue
            meta = self.metadata.get(str(int(idx)))
            if meta:
                results.append(meta)
        return results

    def _call_remote_generation(self, prompt: str, max_tokens: int = 512) -> str:
        """Call remote LLM endpoint (Gemini/other). Adapt to the vendor response format."""
        if not (self.gemini_url and self.gemini_key):
            raise RuntimeError("Remote generation endpoint not configured (GEMINI_API_URL + GEMINI_API_KEY).")
        headers = {"Authorization": f"Bearer {self.gemini_key}", "Content-Type": "application/json"}
        payload = {"prompt": prompt, "max_tokens": max_tokens}
        resp = requests.post(self.gemini_url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        j = resp.json()
        # try common shapes
        if isinstance(j, dict):
            # look for the most likely text field
            for key in ("text", "output", "generated_text", "result"):
                if key in j:
                    return j[key]
            if "choices" in j and isinstance(j["choices"], list):
                c0 = j["choices"][0]
                # some APIs nest text in multiple ways
                if isinstance(c0, dict):
                    for key in ("text", "message", "output_text"):
                        if key in c0:
                            return c0[key]
        # fallback: return raw string
        return json.dumps(j)

    def _parse_series_from_text(self, text: str, start: int, end: int) -> Optional[List[Dict[str, float]]]:
        """
        Try to parse JSON series or simple year:value patterns from the returned text.
        Returns list of {"year":YYYY, "value":NUM} or None if none found.
        """
        if not text or not isinstance(text, str):
            return None
        # try JSON parse
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and "series" in parsed and isinstance(parsed["series"], list):
                # basic validation
                series = []
                for p in parsed["series"]:
                    if isinstance(p, dict) and "year" in p and "value" in p:
                        try:
                            series.append({"year": int(p["year"]), "value": float(p["value"])})
                        except Exception:
                            continue
                if series:
                    return series
        except Exception:
            pass

        # pattern match year:value pairs
        series = []
        for y in range(start, end + 1):
            # match e.g. "2025: 123.4" or '"2025":123' or '2025 = 1.23e2'
            m = re.search(rf'["\']?{y}["\']?\s*[:=]\s*([0-9+\-\.eE]+)', text)
            if m:
                try:
                    v = float(m.group(1))
                    series.append({"year": y, "value": v})
                except Exception:
                    continue
        if series:
            return series
        return None

    def _synthesize_series(self, start: int, end: int, seed: Optional[int] = None) -> List[Dict[str, float]]:
        """Create a plausible synthetic timeseries; deterministic by seed (if provided)."""
        if seed is None:
            seed = (start + end) % 10_000
        rng = random.Random(seed)
        n = max(1, end - start + 1)
        base = rng.uniform(10.0, 100.0)
        slope = rng.uniform(-2.0, 3.0) / max(1.0, n / 50.0)
        series = []
        for i, y in enumerate(range(start, end + 1)):
            noise = rng.uniform(-2.0, 2.0)
            v = base + slope * i + noise
            series.append({"year": y, "value": round(v, 4)})
        return series

    def generate(self,
                 variable_meta: Dict[str, Any],
                 scenario_meta: Dict[str, Any],
                 start_year: int = 2020,
                 end_year: int = 2100,
                 region: str = "Global",
                 max_tokens: int = 512) -> Dict[str, Any]:
        """
        Generate a timeseries for the given variable+scenario+region+timeframe.
        Returns dict: {"series": [...], "source": "remote_llm"|"synth_fallback"}
        """
        # sanity checks
        if start_year > end_year:
            raise ValueError("start_year must be <= end_year")
        var_id = variable_meta.get("id") if isinstance(variable_meta, dict) else str(variable_meta)
        scen_id = scenario_meta.get("id") if isinstance(scenario_meta, dict) else str(scenario_meta)
        q = f"Variable: {variable_meta.get('text') if isinstance(variable_meta, dict) else var_id}\n" \
            f"Scenario: {scenario_meta.get('text') if isinstance(scenario_meta, dict) else scen_id}\n" \
            f"Region: {region}"
        # retrieve context
        try:
            retrieved = self.retrieve(q, k=self.top_k)
            context = "\n\n".join([f"[{r.get('type')}] {r.get('id')}: {r.get('text')}" for r in retrieved])
        except Exception:
            # retrieval failure should not block generation
            logger.exception("Retrieval failed during generate; proceeding without context.")
            context = ""

        prompt = (
            f"You are a generator that must produce a JSON time series for the variable '{var_id}' "
            f"under scenario '{scen_id}' for region '{region}'.\n"
            f"Years: {start_year} to {end_year} inclusive.\n"
            f"Context (may be empty):\n{context}\n\n"
            "Produce only valid JSON in the following format:\n"
            '{ "series": [{"year":YYYY, "value":NUMBER}, ...] }\n\n'
            "If you cannot compute real data, produce a plausible synthetic timeseries."
        )

        # Try remote LLM if configured
        if self.gemini_url and self.gemini_key:
            try:
                logger.info("Calling remote generation endpoint...")
                resp_text = self._call_remote_generation(prompt, max_tokens=max_tokens)
                series = self._parse_series_from_text(resp_text, start_year, end_year)
                if series:
                    return {"series": series, "source": "remote_llm"}
                else:
                    logger.warning("Remote LLM returned text but parsing produced no series.")
            except Exception:
                logger.exception("Remote generation failed; falling back to synthetic generation.")

        # Synthetic fallback (deterministic-ish using variable+scenario+region)
        seed_val = hash(f"{var_id}::{scen_id}::{region}") & 0xffffffff
        series = self._synthesize_series(start_year, end_year, seed=seed_val)
        return {"series": series, "source": "synth_fallback"}