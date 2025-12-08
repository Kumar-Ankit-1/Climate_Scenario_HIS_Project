# retriever.py
"""
Retriever: semantic search (FAISS) + embedding-based rerank + interactive selection.
Uses Gemini API to intelligently parse user input.
Saves confirmed_selection.json containing variable, scenario, region, start_year, end_year.
"""
import os
import sys
import json
import argparse
import requests
from typing import List, Tuple, Dict, Any, Optional

# NOTE: EmbeddingProvider is implemented in ingestion.py
from ingestion import EmbeddingProvider

# faiss import may be optional at static-check time; fail fast at runtime if missing.
try:
    import faiss
except Exception:
    faiss = None

import numpy as np

def call_gemini_for_query_parsing(user_input: str) -> Dict[str, Any]:
    """
    Parse user input to extract variable and scenario keywords.
    Uses Gemini API if available, otherwise uses local keyword matching.
    """
    # List of known scenarios and variables for fallback parsing
    scenario_keywords = ['SSP1', 'SSP2', 'SSP3', 'SSP4', 'SSP5', 'RCP2.6', 'RCP4.5', 'RCP6.0', 'RCP8.5', 
                         'NPI', 'ADVANCE', 'CURRENT', 'IMMEDIATE', 'CAP', 'TCRE', '1.5C', '2C', '3C']
    variable_keywords_list = ['emissions', 'CO2', 'carbon', 'temperature', 'methane', 'aerosol', 'forcing', 
                         'concentration', 'flux', 'precipitation', 'radiation', 'wind', 'humidity', 
                         'pressure', 'sea level', 'ice', 'snow', 'manufacturing', 'energy', 'transport']
    
    # Try Gemini API first
    gemini_url = os.getenv("GEMINI_GEN_URL")
    gemini_key = os.getenv("GEMINI_API_KEY_GEN") or os.getenv("GEMINI_API_KEY")
    
    if gemini_url and gemini_key:
        prompt = f"""You are an expert at parsing climate scenario queries. Your task is to analyze the user input and categorize terms.

VARIABLE KEYWORDS include: emissions, temperature, CO2, methane, aerosol, forcing, concentration, flux, GMST, precipitation, radiation, wind, humidity, pressure, sea level, ice, snow

SCENARIO KEYWORDS include: SSP (Shared Socioeconomic Pathways like SSP1, SSP2, SSP3, SSP4, SSP5), RCP (like RCP2.6, RCP4.5, RCP6.0, RCP8.5), warming levels (1.5C, 2C, 3C), policy names (NPI, ZERO, ADVANCE, CURRENT, IMMEDIATE), carbon targets (net zero, carbon neutral), named scenarios (CAP, TCRE)

User query: "{user_input}"

INSTRUCTIONS:
1. Extract ONLY the most important variable keywords (keep it concise, 2-5 words max)
2. Extract scenario-related keywords (policy, RCP, SSP, warming level)
3. Extract region if explicitly mentioned
4. If ambiguous, prioritize recognizing known terms from the lists above
5. Return ONLY valid JSON with NO markdown or code blocks:

{{
  "variable_keywords": "the core variable term(s) to search for - single word or short phrase",
  "scenario_keywords": "the scenario identifier(s) - empty if none found",
  "region": "explicit region name or empty string",
  "reasoning": "why this parsing makes sense"
}}"""

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 256
            }
        }
        
        try:
            url = gemini_url
            if "key=" not in url:
                separator = "&" if "?" in url else "?"
                url = f"{url}{separator}key={gemini_key}"
            
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            resp_json = resp.json()
            
            # Extract text from Gemini response
            if "candidates" in resp_json and resp_json["candidates"]:
                candidate = resp_json["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if parts and "text" in parts[0]:
                        text = parts[0]["text"].strip()
                        # Remove markdown code blocks if present
                        if text.startswith("```json"):
                            text = text[7:]
                        if text.startswith("```"):
                            text = text[3:]
                        if text.endswith("```"):
                            text = text[:-3]
                        
                        parsed = json.loads(text.strip())
                        return parsed
        except Exception as e:
            print(f"⚠️ Gemini API parsing failed: {e}")
    
    # Fallback: Local keyword matching
    user_input_lower = user_input.lower()
    found_vars = []
    found_scenarios = []
    
    for var in variable_keywords_list:
        if var.lower() in user_input_lower:
            found_vars.append(var)
    
    for scenario in scenario_keywords:
        if scenario.lower() in user_input_lower:
            found_scenarios.append(scenario)
    
    # If no exact matches found, use the whole query as variable keywords
    if not found_vars:
        found_vars = [user_input]
    
    return {
        "variable_keywords": " ".join(found_vars) if found_vars else user_input,
        "scenario_keywords": " ".join(found_scenarios) if found_scenarios else "",
        "region": ""
    }


def load_index(index_dir: str):
    idx_file = os.path.join(index_dir, "faiss.index")
    if not os.path.exists(idx_file):
        raise FileNotFoundError(f"No FAISS index found at {idx_file}")
    if faiss is None:
        raise RuntimeError("faiss is not installed in this environment.")
    index = faiss.read_index(idx_file)
    # If HNSW index present, set efSearch for query-time recall/speed tradeoff
    try:
        if hasattr(index, "hnsw"):
            index.hnsw.efSearch = 64
    except Exception:
        # ignore if not applicable
        pass
    return index

def load_metadata(meta_path: str) -> Dict[str, Any]:
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"metadata file not found: {meta_path}")
    with open(meta_path, "r", encoding="utf-8") as fh:
        meta = json.load(fh)
    # metadata keys expected to be string ids (matching IndexIDMap ids)
    return meta

def embed_query(emb_provider: EmbeddingProvider, query: str) -> np.ndarray:
    vec = emb_provider.embed_one(query)
    vec = np.asarray(vec, dtype=np.float32)
    if vec.ndim == 1:
        vec = np.expand_dims(vec, axis=0)
    return vec

def search_index(index, q_emb: np.ndarray, k: int) -> Tuple[List[int], List[float]]:
    # q_emb must be shape (1, dim)
    D, I = index.search(q_emb, k)
    ids = I[0].tolist()
    dists = D[0].tolist()
    return ids, dists

def gather_hits(ids: List[int], dists: List[float], metadata: Dict[str, Any]) -> List[Tuple[int,float,Dict[str,Any]]]:
    hits = []
    for idx, dist in zip(ids, dists):
        if idx == -1:
            continue
        # metadata keys are strings
        meta = metadata.get(str(int(idx)))
        if meta:
            hits.append((int(idx), float(dist), meta))
    return hits

def rerank_by_cosine(query_emb: np.ndarray, candidate_texts: List[str], emb_provider: EmbeddingProvider) -> List[int]:
    """
    Returns order array (indices into candidate_texts) sorted by cosine similarity to query_emb descending.
    """
    if len(candidate_texts) == 0:
        return []
    # embed candidates (batch)
    c_emb = emb_provider.embed_batch(candidate_texts).astype(np.float32)
    # normalize
    qe = np.asarray(query_emb, dtype=np.float32).reshape(-1)
    qe = qe / (np.linalg.norm(qe) + 1e-12)
    norms = np.linalg.norm(c_emb, axis=1, keepdims=True) + 1e-12
    c_norm = c_emb / norms
    sims = (c_norm @ qe).reshape(-1)
    order = np.argsort(-sims)  # descending
    return order.tolist()

def present_and_select(prompt_text: str, choices: List[Dict[str,Any]], default_index: int = 0, max_display: int = 8, allow_research: bool = True) -> Dict[str,Any]:
    """
    Present top N choices (limited to max_display, default 8) with clean IDs only.
    Show alternatives separately. Return chosen metadata dict.
    If stdin is not a tty, return default.
    If allow_research is True, allow user to type "0" to search again.
    """
    if not choices:
        return None
    
    # Limit display to max_display items
    displayed_choices = choices[:max_display]
    alternatives = choices[max_display:] if len(choices) > max_display else []
    
    print(f"\n{prompt_text}")
    print("=" * 70)
    
    # Show top matches cleanly (ID only)
    for i, m in enumerate(displayed_choices, start=1):
        item_id = m.get("id") or m.get("text") or f"item-{i}"
        print(f"  {i}. {item_id}")
    
    # Show alternatives if any
    if alternatives:
        print("\nAlternative options (type number or custom name):")
        print("-" * 70)
        for i, m in enumerate(alternatives[:5], start=max_display + 1):  # Show up to 5 alternatives
            item_id = m.get("id") or m.get("text") or f"item-{i}"
            print(f"  {i}. {item_id}")
    
    print("=" * 70)
    if allow_research:
        print("(Type '0' to search again with different keywords)")
    
    if not sys.stdin.isatty():
        print(f"Non-interactive: selecting default choice #{default_index+1}")
        return displayed_choices[default_index] if 0 <= default_index < len(displayed_choices) else displayed_choices[0]
    
    choice = input(f"Pick a number (1-{len(displayed_choices)}) or type a custom name (Enter = {default_index+1}): ").strip()
    
    # Special: return None if user wants to research
    if choice == "0" and allow_research:
        return None
    
    if choice == "":
        return displayed_choices[default_index]
    
    if choice.isdigit():
        idx = int(choice) - 1
        # Check in displayed choices
        if 0 <= idx < len(displayed_choices):
            return displayed_choices[idx]
        # Check in alternatives
        if len(displayed_choices) <= idx < len(displayed_choices) + len(alternatives):
            alt_idx = idx - len(displayed_choices)
            return alternatives[alt_idx]
        print("Number out of range; using default.")
        return displayed_choices[default_index]
    
    # Custom typed name: wrap into metadata dict
    is_var = "variable" in prompt_text.lower()
    return {"type": "variable" if is_var else "scenario", "id": choice, "text": choice, "meta": {}}

def interactive_flow(index_dir: str, meta_path: str, window_k: int=128, vars_k: int=8, scen_k: int=8, query: str=None):
    embprov = EmbeddingProvider()
    index = load_index(index_dir)
    metadata = load_metadata(meta_path)

    if query is None:
        if not sys.stdin.isatty():
            raise RuntimeError("No query provided in non-interactive mode. Use --query.")
        query = input("Enter a search query (e.g., 'aerosol for NPI scenario'): ").strip()

    if not query:
        print("Empty query — aborting.")
        return

    # OUTER LOOP: Allow re-doing entire variable + scenario selection if needed
    selected_variable = None
    selected_scenario = None
    var_keywords = None
    scen_keywords = None
    
    while selected_variable is None or selected_scenario is None:
        # VARIABLE SELECTION LOOP
        while selected_variable is None:
            # Use Gemini API to intelligently parse the query
            print("\n🤖 Parsing your query with AI...")
            parsed_input = call_gemini_for_query_parsing(query)
            var_keywords = parsed_input.get("variable_keywords", query)
            scen_keywords = parsed_input.get("scenario_keywords", "")
            region_hint = parsed_input.get("region", "")
            
            print(f"✓ Variable keywords: {var_keywords}")
            if scen_keywords:
                print(f"✓ Scenario keywords: {scen_keywords}")
            if region_hint:
                print(f"✓ Region hint: {region_hint}")

            # Search for variables using parsed keywords
            q_emb = embed_query(embprov, var_keywords)  # shape (1, dim)
            ids, dists = search_index(index, q_emb, k=window_k)
            hits = gather_hits(ids, dists, metadata)

            # split hits by type
            var_hits = [h for h in hits if h[2].get("type") == "variable"]
            scen_hits = [h for h in hits if h[2].get("type") == "scenario"]

            # If no variable hits found, try using scenario hits as candidate variables (defensive)
            if not var_hits and scen_hits:
                # treat top scenario hits as variable candidates (rare but safe)
                candidate_texts = [h[2]["text"] for h in scen_hits[:min(len(scen_hits), 50)]]
                order = rerank_by_cosine(q_emb, candidate_texts, embprov)
                var_ordered = [scen_hits[i][2] for i in order]
            else:
                candidate_texts = [h[2]["text"] for h in var_hits[:min(len(var_hits), 50)]]
                order = rerank_by_cosine(q_emb, candidate_texts, embprov) if candidate_texts else []
                var_ordered = [var_hits[i][2] for i in order] if order else [h[2] for h in var_hits]

            if not var_ordered:
                print("No variable candidates found. You may type a custom variable name.")
            
            selected_variable = present_and_select("Top variable matches:", var_ordered, default_index=0, max_display=8, allow_research=True)
            
            # If user selected "research again", prompt for new keywords
            if selected_variable is None:
                query = input("\n🔍 Enter new search keywords for variables: ").strip()
                if not query:
                    print("No keywords provided. Using original query.")
                    query = var_keywords
                continue

        # SCENARIO SELECTION LOOP (only if variable was selected)
        while selected_scenario is None:
            # Build scenario query: use parsed scenario keywords if available, otherwise mix variable + original query
            if scen_keywords:
                scen_query = scen_keywords
            else:
                scen_query = f"{selected_variable.get('text') if isinstance(selected_variable, dict) else str(selected_variable)} {query}"
            
            scen_q_emb = embed_query(embprov, scen_query)
            s_ids, s_dists = search_index(index, scen_q_emb, k=window_k)
            s_hits = gather_hits(s_ids, s_dists, metadata)
            # filter scenarios
            s_hits = [h for h in s_hits if h[2].get("type") == "scenario"]
            scen_texts = [h[2]["text"] for h in s_hits[:min(len(s_hits), 50)]]
            order_s = rerank_by_cosine(scen_q_emb, scen_texts, embprov) if scen_texts else []
            scen_ordered = [s_hits[i][2] for i in order_s] if order_s else [h[2] for h in s_hits]

            # FALLBACK: If no scenarios found through semantic search, get all available scenarios from metadata
            if not scen_ordered:
                print("\n⚠️  No scenario matches found for your query. Showing all available scenarios:")
                all_scenarios = [m for m in metadata.values() if m.get("type") == "scenario"]
                if all_scenarios:
                    scen_ordered = all_scenarios
                else:
                    print("No scenarios available in database.")
                    scen_ordered = []
            
            selected_scenario = present_and_select("Top scenario matches:", scen_ordered, default_index=0, max_display=8, allow_research=True)
            
            # If user selected "research again", prompt for new keywords
            if selected_scenario is None:
                option = input("\nDo you want to:\n  1. Search for scenarios with new keywords\n  2. Go back and change variable\nChoice (1 or 2): ").strip()
                if option == "2":
                    # Go back to variable selection - reset variable and break from scenario loop
                    selected_variable = None
                    break
                else:
                    # Research scenarios
                    scen_keywords = input("🔍 Enter new search keywords for scenarios: ").strip()
                    if not scen_keywords:
                        print("No keywords provided. Using previous query.")
                    continue

    # region and timeframe
    if sys.stdin.isatty():
        region = input("Enter REGION (default: 'Global'): ").strip() or "Global"
        start_raw = input("Start year (default 2020): ").strip()
        end_raw = input("End year (default 2100): ").strip()
        try:
            start_year = int(start_raw) if start_raw else 2020
        except:
            start_year = 2020
        try:
            end_year = int(end_raw) if end_raw else 2100
        except:
            end_year = 2100
    else:
        region = "Global"
        start_year, end_year = 2020, 2100

    record = {
        "variable": selected_variable,
        "scenario": selected_scenario,
        "region": region,
        "start_year": start_year,
        "end_year": end_year
    }
    with open("confirmed_selection.json", "w", encoding="utf-8") as fh:
        json.dump(record, fh, indent=2, ensure_ascii=False)
    print("WROTE confirmed_selection.json")
    return record

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--index-dir", default="./vector_index")
    p.add_argument("--meta", default="./metadata.json")
    p.add_argument("--window-k", type=int, default=128)
    p.add_argument("--vars-k", type=int, default=8)
    p.add_argument("--scen-k", type=int, default=8)
    p.add_argument("--query", default=None, help="Provide query for non-interactive mode")
    args = p.parse_args()
    try:
        interactive_flow(args.index_dir, args.meta, window_k=args.window_k, vars_k=args.vars_k, scen_k=args.scen_k, query=args.query)
    except Exception as e:
        print("ERROR in retriever:", e)
        raise