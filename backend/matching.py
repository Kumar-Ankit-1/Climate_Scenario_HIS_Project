import json
import re
from pathlib import Path

CATALOG_PATH = Path("etl/catalog/providers_overview.json")

# Weights (tune if needed)
W_VAR  = 0.40
W_SCEN = 0.25
W_GRAN = 0.10
W_AVAIL = 0.10

##############################################################
# 1. VARIABLE MATCHING (fuzzy)
##############################################################

def var_match(q_var: str, prov_var: str) -> float:
    qv = q_var.lower()
    pv = prov_var.lower()

    # Exact match
    if qv == pv:
        return 1.0

    # If the whole query seg is inside provider variable
    if qv in pv:
        return 0.8

    # Base match ("gdp" matches "gdp|ppp")
    if qv.split("|")[0] in pv:
        return 0.5

    # Reverse partial
    if pv in qv:
        return 0.5

    return 0.0


##############################################################
# 2. Score Provider
##############################################################

def score_provider(provider, q):
    score = 0.0

    # ---------------------------------------------------------
    # STRICT REGION MATCHING
    # ---------------------------------------------------------
    if q["regions"]:  # user explicitly asked for region
        if not any(r in provider["regions"] for r in q["regions"]):
            return 0.0   # reject provider completely

    # ---------------------------------------------------------
    # VARIABLE MATCH (fuzzy)
    # ---------------------------------------------------------
    if q["variables"]:
        var_scores = []
        for qv in q["variables"]:
            best = max(var_match(qv, pv) for pv in provider["variables"])
            var_scores.append(best)
        score += (sum(var_scores) / len(var_scores)) * W_VAR

    # ---------------------------------------------------------
    # SCENARIO MATCH
    # ---------------------------------------------------------
    if q["scenarios"]:
        matched = sum(1 for s in q["scenarios"] if s in provider["scenarios"])
        score += (matched / len(q["scenarios"])) * W_SCEN

    # ---------------------------------------------------------
    # GRANULARITY
    # ---------------------------------------------------------
    if q["granularity"] and q["granularity"] == provider["granularity"]:
        score += W_GRAN

    # ---------------------------------------------------------
    # YEAR SPAN
    # ---------------------------------------------------------
    if q["start_year"] and q["end_year"]:
        ymin = provider["years"]["min"]
        ymax = provider["years"]["max"]
        if ymin <= q["start_year"] and ymax >= q["end_year"]:
            score += W_AVAIL

    return score


##############################################################
# 3. Normalize Query
##############################################################

def parse_query(text):
    tokens = text.lower().split()

    variables = []
    regions = []
    scenarios = []
    granularity = None
    start_year = None
    end_year = None

    # Patterns
    scen_re = re.compile(r"ssp\d.*")     # SSP2, SSP1-26, SSP3baseline
    year_re = re.compile(r"\d{4}")
    var_pipe_re = re.compile(r".*\|.*")  # GDP|PPP, Emissions|CO2
    
    # Simple known region list (you can expand or load from file)
    known_regions = ["india", "china", "usa", "world", "europe", "germany"]

    for t in tokens:
        # scenario
        if scen_re.match(t):
            scenarios.append(t.upper())
            continue

        # variable with pipes ("gdp|ppp")
        if var_pipe_re.match(t):
            variables.append(t)
            continue

        # region
        if t in known_regions:
            regions.append(t.capitalize())
            continue

        # granularity
        if t in ["annual", "yearly", "5-year", "decadal"]:
            granularity = t
            continue

        # years
        if year_re.match(t):
            y = int(t)
            if not start_year:
                start_year = y
            else:
                end_year = y
            continue

        # potential base variables (gdp, population, co2)
        if t in ["gdp", "population", "co2", "emissions"]:
            variables.append(t)
            continue

    return {
        "variables": variables,
        "regions": regions,
        "scenarios": scenarios,
        "granularity": granularity,
        "start_year": start_year,
        "end_year": end_year,
    }


##############################################################
# 4. Load Providers Catalog
##############################################################

def load_provider_catalog():
    with open(CATALOG_PATH) as f:
        data = json.load(f)
    return data["providers"]


##############################################################
# 5. Main Matching Function
##############################################################

def match_providers(query_text):
    parsed = parse_query(query_text)
    providers = load_provider_catalog()

    results = []
    for p in providers:
        s = score_provider(p, parsed)
        if s > 0:  # keep only relevant
            results.append({
                "provider_id": p["id"],
                "score": s,
                "latest_file": p["latest_file"],
                "variables": p["variables"],
                "scenarios": p["scenarios"],
                "regions": p["regions"]
            })

    # Sort by descending score
    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "parsedQuery": parsed,
        "providers": results
    }
