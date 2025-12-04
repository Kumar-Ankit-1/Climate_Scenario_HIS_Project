# rag_model.py
"""
RAG wrapper:
- Loads faiss index and metadata
- Retrieves top-k docs given a (variable+scenario) query
- Calls remote generator if GEMINI env vars set; otherwise synthesizes a plausible timeseries
"""
import os
import json
import numpy as np
import re
import random

try:
    import faiss
except Exception:
    faiss = None

from ingestion import EmbeddingProvider
import requests

class RAG:
    def __init__(self, index_dir="./vector_index", meta_path="./metadata.json", top_k=6):
        if faiss is None:
            raise RuntimeError("faiss is not installed.")
        idx_file = os.path.join(index_dir, "faiss.index")
        if not os.path.exists(idx_file):
            raise FileNotFoundError(f"Index not found at {idx_file}. Run ingestion.py first.")
        self.index = faiss.read_index(idx_file)
        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        self.emb = EmbeddingProvider()
        self.top_k = top_k
        self.gemini_url = os.getenv("GEMINI_API_URL")
        self.gemini_key = os.getenv("GEMINI_API_KEY")

    def retrieve(self, text: str, k: int = None):
        if k is None:
            k = self.top_k
        q_emb = self.emb.embed_one(text).astype(np.float32)
        D, I = self.index.search(np.expand_dims(q_emb, axis=0), k)
        ids = I[0].tolist()
        results = []
        for idx in ids:
            if idx == -1:
                continue
            m = self.metadata.get(str(int(idx)), None)
            if m:
                results.append(m)
        return results

    def _call_remote_generation(self, prompt: str, max_tokens=512):
        if not (self.gemini_url and self.gemini_key):
            raise RuntimeError("Remote generation not configured.")
        headers = {"Authorization": f"Bearer {self.gemini_key}", "Content-Type": "application/json"}
        payload = {"prompt": prompt, "max_tokens": max_tokens}
        resp = requests.post(self.gemini_url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        j = resp.json()
        if isinstance(j, dict):
            for key in ("text", "output", "generated_text", "result"):
                if key in j:
                    return j[key]
            if "choices" in j and isinstance(j["choices"], list) and "text" in j["choices"][0]:
                return j["choices"][0]["text"]
        return json.dumps(j)

    def _parse_series_from_text(self, text: str, start: int, end: int):
        try:
            j = json.loads(text)
            if isinstance(j, dict) and "series" in j:
                return j["series"]
        except Exception:
            pass
        series = []
        for y in range(start, end + 1):
            m = re.search(rf'["\']?{y}["\']?\s*[:=]\s*([0-9+\-\.eE]+)', text)
            if m:
                try:
                    v = float(m.group(1))
                except:
                    v = None
                if v is not None:
                    series.append({"year": y, "value": v})
        if series:
            return series
        return None

    def _synthesize_series(self, start: int, end: int, seed: int = None):
        if seed is None:
            seed = (start + end) % 1000
        rng = random.Random(seed)
        n = max(1, end - start + 1)
        base = rng.uniform(10.0, 100.0)
        slope = rng.uniform(-1.0, 2.0) / max(1.0, n / 50.0)
        series = []
        for i, y in enumerate(range(start, end + 1)):
            noise = rng.uniform(-2.0, 2.0)
            v = base + slope * i + noise
            series.append({"year": y, "value": round(v, 4)})
        return series

    def generate(self, variable_meta: dict, scenario_meta: dict, start_year: int = 2020, end_year: int = 2100, max_tokens=512):
        q = f"Variable: {variable_meta.get('text')}\nScenario: {scenario_meta.get('text')}"
        retrieved = self.retrieve(q, k=self.top_k)
        context = "\n\n".join([f"[{r.get('type')}] {r.get('id')}: {r.get('text')}" for r in retrieved])
        prompt = (
            f"You are a generator that must produce a JSON time series for the variable '{variable_meta.get('id')}' "
            f"under scenario '{scenario_meta.get('id')}'.\n"
            f"Years: {start_year} to {end_year} inclusive.\n"
            f"Context:\n{context}\n\n"
            "Produce only valid JSON in the following format:\n"
            '{ "series": [{"year":YYYY, "value":NUMBER}, ...] }\n\n'
            "If you cannot compute real data, produce a plausible synthetic timeseries."
        )
        if self.gemini_url and self.gemini_key:
            try:
                resp_text = self._call_remote_generation(prompt, max_tokens=max_tokens)
                series = self._parse_series_from_text(resp_text, start_year, end_year)
                if series:
                    return {"series": series, "source": "remote_llm"}
            except Exception as e:
                print(f"Remote generation failed: {e}. Falling back to local synthesis.")
        synth = self._synthesize_series(start_year, end_year, seed=hash(variable_meta.get("id") + "_" + scenario_meta.get("id")))
        return {"series": synth, "source": "synth_fallback"}