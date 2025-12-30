import os
import json
import psycopg2
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_api_key = os.getenv('GROQ_API_KEY')
client = None
if groq_api_key:
    client = Groq(api_key=groq_api_key)

def get_db_connection():
    """Establish connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'climate_db'),
            user=os.getenv('DB_USER', 'climate_user'),
            password=os.getenv('DB_PASSWORD', 'climate_pass'),
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=os.getenv('DB_PORT', '5432')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def get_provider_recommendations(sector, region, start_year, end_year, variables):
    """
    Orchestrate the recommendation process:
    1. Resolve variables (if needed, though mostly passed in).
    2. Compute coverage metrics via SQL.
    3. Score candidates.
    4. Get LLM justification.
    """
    
    
    # Defaults
    if not start_year: start_year = 2020
    if not end_year: end_year = 2050
    if not variables: variables = [] 
    
    # Step 2: Compute Coverage Metrics
    metrics = compute_coverage_metrics(sector, region, start_year, end_year)
    
    if not metrics:
        return {
            "top_recommendation": None,
            "candidates": []
        }

    # Step 3: Score Candidates
    scored_candidates = score_candidates(metrics, expected_var_count=len(variables) if variables else 10)
    # Take top 6 for display
    top_candidates = scored_candidates[:6] 

    # Step 4: LLM Enrichment
    # We pass the top candidates to LLM to generate rich metadata (description, pros/cons)
    result = enrich_candidates_with_llm(sector, region, start_year, end_year, variables, top_candidates)
    
    return result

def compute_coverage_metrics(sector, region, start_year, end_year):
    """
    Execute SQL to get provider-model coverage metrics.
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    results = []
    try:
        cur = conn.cursor()
        
        sql = """
            SELECT
              so.provider,
              so.model,
              COUNT(DISTINCT so.variable) AS variable_count,
              COUNT(DISTINCT so.region) AS region_count,
              MIN(so.year) AS min_year,
              MAX(so.year) AS max_year
            FROM scenario_observations so
            JOIN variable_semantics vs
              ON so.variable = vs.variable
            WHERE
              (vs.sector = %s OR %s IS NULL)
              AND (%s IS NULL OR so.region = %s)
              AND so.year BETWEEN %s AND %s
            GROUP BY so.provider, so.model;
        """
        
        p_sector = sector if sector and sector != "All Sectors" else None
        p_region = region if region and region != "Global" else None
        
        cur.execute(sql, (p_sector, p_sector, p_region, p_region, start_year, end_year))
        rows = cur.fetchall()
        
        for r in rows:
            results.append({
                "provider": r[0],
                "model": r[1],
                "variable_coverage_count": r[2],
                "region_coverage_count": r[3],
                "min_year": r[4],
                "max_year": r[5]
            })
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error computing coverage: {e}")
        if conn: conn.close()
        
    return results

def score_candidates(metrics, expected_var_count=10):
    """
    Apply scoring formula.
    """
    if not metrics: return []
    
    max_vars = max([m['variable_coverage_count'] for m in metrics]) if metrics else 1
    max_regions = max([m['region_coverage_count'] for m in metrics]) if metrics else 1
    
    scored = []
    
    for m in metrics:
        var_score = m['variable_coverage_count'] / max_vars if max_vars > 0 else 0
        reg_score = m['region_coverage_count'] / max_regions if max_regions > 0 else 0
        
        duration = m['max_year'] - m['min_year']
        time_score = min(duration / 30.0, 1.0) 
        
        bonus = 0.5 
        
        total_score = (0.4 * var_score) + (0.3 * reg_score) + (0.2 * time_score) + (0.1 * bonus)
        
        m['score'] = round(total_score * 100) # Scale to 0-100 for UI
        m['details'] = f"{m['variable_coverage_count']} variables, {m['min_year']}-{m['max_year']}"
        scored.append(m)
        
    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored

def enrich_candidates_with_llm(sector, region, start, end, variables, candidates):
    """
    Call Groq to analyze candidates and return full UI-ready JSON.
    """
    if not client:
        return {"error": "LLM client not available"}

    candidates_json = json.dumps(candidates, indent=2)
    
    prompt = f"""
    You are a climate data advisor.
    
    I have a list of dataset candidates based on database coverage metrics.
    I need you to generate a detailed JSON response to populate a UI.

    User Request:
    - Sector: {sector}
    - Region: {region}
    - Time: {start}-{end}
    - Variables: {variables}

    Candidates (Metrics):
    {candidates_json}

    Task:
    1. Select the BEST candidate as the "top_recommendation".
    2. For EACH candidate in the list, generate "enriched" metadata (description, assessment, strengths, limitations).
    3. Infer "scenarioFamily" and "scenario" names from the 'model' field if possible (e.g., 'MESSAGE-GLOBIOM' -> Family: 'MESSAGE').
    4. Estimate data quality (High/Medium/Low) based on the provider reputation.
    5. Infer reasonable lists for 'assumptions' (e.g. "Carbon tax", "Population growth") and covered 'variables' based on sector.

    Output Schema (JSON only):
    {{
      "top_recommendation": {{
         "recommended_provider": "...",
         "recommended_model": "...",
         "reasoning": "...",
         "strengths": ["..."],
         "limitations": ["..."]
      }},
      "candidates": [
        {{
          "dataset": {{
            "id": "generate-unique-slug-id", 
            "provider": "...", 
            "name": "...", 
            "scenarioFamily": "...", 
            "scenario": "...", 
            "description": "...", 
            "coverage": {{
               "timeRange": {{ "start": int, "end": int }},
               "sectors": ["..."],
               "regions": ["..."],
               "variables": ["..."]
            }},
            "dataQuality": {{
               "sectoralDetail": "High/Medium/Low",
               "regionalDetail": "High/Medium/Low",
               "temporalResolution": "5-year/Annual/etc"
            }},
            "assumptions": ["...", "..."],
            "limitations": ["...", "..."]
          }},
          "matchScore": int (copy from input score),
          "strengths": ["...", "..."],
          "limitations": ["...", "..."],
          "recommendation": "Short assessment sentence"
        }}
      ]
    }}
    
    Ensure the "candidates" list includes ALL the input candidates, in the same order.
    The 'matchScore' strictly comes from the input 'score'.
    The 'coverage.timeRange' comes from input min_year/max_year.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=2500,
            temperature=0.1
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"LLM Enrichment Error: {e}")
        # Fallback construction
        fallback_candidates = []
        for c in candidates:
            fallback_candidates.append({
                "dataset": {
                    "id": f"{c['provider']}-{c['model']}".lower().replace(" ", "-"),
                    "provider": c['provider'],
                    "name": c['model'],
                    "scenarioFamily": "Standard",
                    "scenario": c['model'],
                    "description": f"Dataset from {c['provider']}",
                    "coverage": {
                        "timeRange": {"start": c['min_year'], "end": c['max_year']},
                        "sectors": ["General"],
                        "regions": ["Global"],
                        "variables": ["Generic Variable"]
                    },
                    "dataQuality": {
                        "sectoralDetail": "Medium",
                        "regionalDetail": "Medium",
                        "temporalResolution": "Unknown"
                    },
                    "assumptions": ["Standard assumptions applied"],
                    "limitations": ["No specific limitations listed"]
                },
                "matchScore": c.get('score', 0),
                "strengths": ["Data available"],
                "limitations": ["Automated fallback metadata"],
                "recommendation": "Available based on basic coverage."
            })
            
        return {
            "top_recommendation": {
                "recommended_provider": candidates[0]['provider'] if candidates else "None",
                "recommended_model": candidates[0]['model'] if candidates else "None",
                "reasoning": "Selected based on highest technical coverage score.",
                "strengths": ["High coverage"],
                "limitations": []
            },
            "candidates": fallback_candidates
        }
