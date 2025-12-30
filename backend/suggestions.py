import os
import difflib
import pandas as pd
import json
from pathlib import Path
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
# Load environment variables
load_dotenv()

# Import chat_service for DB connection
import chat_service

# NEW: Global cache for variables
cached_variables = []

def load_variable_cache():
    """Load variables from Postgres variable_semantics table into memory."""
    global cached_variables
    conn = chat_service.get_db_connection()
    if not conn:
        print("Warning: Could not connect to DB for variable cache.")
        return

    try:
        cur = conn.cursor()
        query = """
        SELECT variable, sector, industry, description
        FROM variable_semantics
        ORDER BY variable; 
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        # Store as list of dicts
        cached_variables = []
        for r in rows:
            cached_variables.append({
                "variable": r[0],
                "sector": r[1],
                "industry": r[2],
                "description": r[3]
            })
            
        print(f"Cache: Loaded {len(cached_variables)} variables from DB.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error loading variable cache: {e}")
        if conn: conn.close()

def get_variable_suggestions_from_cache(query, sector=None, max_suggestions=10):
    """
    Return list of {value: variable, label: variable, ...} based on query.
    Sector-aware filtering.
    """
    # If cache is empty, try loading it (lazy load fallback)
    if not cached_variables:
        load_variable_cache()

    q_lower = query.lower().strip()
    results = []
    
    for item in cached_variables:
        # 1. Sector Filter
        if sector and sector != "All Sectors":
            # item['sector'] might be None or string. Data is "sector", input is "sector"
            if not item['sector'] or sector.lower() != item['sector'].lower():
                 # Try lenient match?
                 if not item['sector'] or sector.lower() not in item['sector'].lower():
                    continue
        
        # 2. Query Match
        # Simple substring match for "lightweight"
        v_name = item['variable']
        # v_descStr = item['description'] if item['description'] else ""
        
        if q_lower in v_name.lower():
            results.append(item)
             
        if len(results) >= max_suggestions * 5: # Optimization: stop early
            break
            
    # Sort: Exact starts_with matches first, then shortest length
    def sort_key(x):
        name = x['variable'].lower()
        starts = name.startswith(q_lower)
        return (not starts, len(name))
        
    results.sort(key=sort_key)
    
    return results[:max_suggestions]

# Initialize Groq client
groq_api_key = os.getenv('GROQ_API_KEY')
client = None
if groq_api_key:
    client = Groq(api_key=groq_api_key)

# Load CSV data
DATA_DIR = Path(__file__).parent.parent / "training_data"
# Handle case where file might be imported from different CWD
if not DATA_DIR.exists():
    DATA_DIR = Path("training_data")

def load_data():
    try:
        variables_df = pd.read_csv(DATA_DIR / "variables_vector.csv")
        scenarios_df = pd.read_csv(DATA_DIR / "scenario_vector.csv")
        return variables_df.to_dict('records'), scenarios_df.to_dict('records')
    except Exception as e:
        print(f"Error loading data: {e}")
        return [], []

variables_list, scenarios_list = load_data()

def get_semantic_suggestions(query: str, data_list: list, max_suggestions: int = 5) -> list:
    """
    Use Groq to find semantically relevant suggestions when simple matching fails.
    """
    if not client: 
        return []
        
    try:
        # Super optimization: Only send names to keeping it fast and cheap
        names_list = [item.get('name', '') for item in data_list]
        
        prompt = f"""
        I have a list of financial/climate variables/scenarios: {names_list[:200]}...
        The user searched for: "{query}" through a variable/scenario database.
        
        Return a JSON array of up to {max_suggestions} strings from the provided list that are most semantically relevant to "{query}".
        Return ONLY valid JSON array of strings.
        """
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        suggested_names = json.loads(content.strip())
        
        matches = []
        for name in suggested_names:
            for item in data_list:
                if item.get('name') == name:
                    matches.append(item)
                    break
        
        return matches[:max_suggestions]
        
    except Exception as e:
        print(f"Semantic Search Error: {e}")
        return []

def get_suggestions(query: str, data_list: list, max_suggestions: int = 5, use_llm: bool = True) -> list:
    """
    Get suggestions using robust field detection and fuzzy/token matching.
    Falls back to semantic search if no matches found AND use_llm is True.
    """
    if not query:
        return []

    query_lower = query.lower()
    matches = []

    for item in data_list:
        # Normalize item name/desc logic (reused from original)
        name = ""
        desc = ""
        # ... logic similar to original app.py ...
        for k, v in item.items():
            kl = k.lower()
            if kl in ("variable", "variable name", "name", "scenario", "scenario name", "title"):
                name = str(v)
                break
        if not name:
             for k, v in item.items():
                if "name" in k.lower() or "variable" in k.lower() or "scenario" in k.lower():
                    name = str(v)
                    break
        if not name:
            try:
                name = str(next(iter(item.values())))
            except Exception:
                name = ""
        
        for k in ("description", "Description", "desc", "details", "Scenario Name"):
            if k in item:
                desc = str(item.get(k, ""))
                break

        item['name'] = name
        item['description'] = desc
        name_lower = name.lower()

        def normalize_token(t: str) -> str:
            t = t.lower()
            t = ''.join([c for c in t if c.isalnum() or c.isspace()])
            for suffix in ("ing", "ment", "tion", "s", "es", "ly"):
                if len(t) > len(suffix) + 2 and t.endswith(suffix):
                    t = t[: -len(suffix)]
                    break
            return t

        qtokens = [normalize_token(t) for t in ''.join([c if c.isalnum() else ' ' for c in query_lower]).split() if t]
        ntokens = [normalize_token(t) for t in ''.join([c if c.isalnum() else ' ' for c in name_lower]).split() if t]

        score = 0.0
        if query_lower in name_lower:
            score = 1.0
        else:
            if qtokens and all(any(qt == nt for nt in ntokens) for qt in qtokens):
                score = 0.95
            else:
                try:
                    ratio = difflib.SequenceMatcher(None, query_lower, name_lower).ratio()
                except Exception:
                    ratio = 0.0
                score = ratio

        if score > 0.4:
            matches.append({
                "name": name,
                "description": desc,
                "score": score
            })

    matches.sort(key=lambda x: x["score"], reverse=True)
    top_matches = matches[:max_suggestions]
    
    if len(top_matches) < 2 and len(data_list) > 0 and use_llm:
        # No good matches, try semantic
        semantic_matches = get_semantic_suggestions(query, data_list, max_suggestions)
        existing_names = {m['name'] for m in top_matches}
        for sm in semantic_matches:
            if sm.get('name') not in existing_names:
                top_matches.append({
                    "name": sm.get('name'),
                    "description": sm.get('description'),
                    "score": 0.8
                })
    
    return top_matches[:max_suggestions]
