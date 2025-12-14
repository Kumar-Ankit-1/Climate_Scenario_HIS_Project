import json
import re
from pathlib import Path

CATALOG_PATH = Path("etl/catalog/providers_overview.json")

# Weights
W_VAR   = 0.40
W_SCEN  = 0.25
W_GRAN  = 0.10
W_AVAIL = 0.10


##############################################################
# 1. Helper matchers
##############################################################

def semantic_match(q, p):
    q = q.lower()
    p = p.lower()
    if q == p:
        return 1.0
    if q in p or p in q:
        return 0.8
    return 0.0


def var_match(q_var: str, prov_var: str) -> float:
    qv = q_var.lower()
    pv = prov_var.lower()

    if qv == pv:
        return 1.0
    if qv in pv:
        return 0.8
    if qv.split("|")[0] in pv:
        return 0.5
    if pv in qv:
        return 0.5
    return 0.0


##############################################################
# 2. Score + Explain Provider
##############################################################

def score_provider(provider, q):
    score = 0.0

    matched = {
        "variables": [],
        "regions": [],
        "scenarios": []
    }

    # ---------- STRICT REGION FILTER ----------
    if q["regions"]:
        for qr in q["regions"]:
            for pr in provider["regions"]:
                sim = semantic_match(qr, pr)
                if sim > 0:
                    matched["regions"].append({
                        "query": qr,
                        "provider": pr,
                        "similarity": sim
                    })

        if not matched["regions"]:
            return 0.0, None

    # ---------- VARIABLES (FUZZY) ----------
    if q["variables"]:
        var_scores = []
        for qv in q["variables"]:
            best = 0
            best_p = None
            for pv in provider["variables"]:
                sim = var_match(qv, pv)
                if sim > best:
                    best = sim
                    best_p = pv

            if best > 0:
                var_scores.append(best)
                matched["variables"].append({
                    "query": qv,
                    "provider": best_p,
                    "similarity": best
                })

        if var_scores:
            score += (sum(var_scores) / len(var_scores)) * W_VAR

    # ---------- SCENARIOS (SEMANTIC) ----------
    if q["scenarios"]:
        scen_scores = []
        for qs in q["scenarios"]:
            for ps in provider["scenarios"]:
                sim = semantic_match(qs, ps)
                if sim > 0:
                    scen_scores.append(sim)
                    matched["scenarios"].append({
                        "query": qs,
                        "provider": ps,
                        "similarity": sim
                    })

        if scen_scores:
            score += (sum(scen_scores) / len(q["scenarios"])) * W_SCEN

    # ---------- GRANULARITY ----------
    if q["granularity"] and q["granularity"] == provider["granularity"]:
        score += W_GRAN

    # ---------- YEAR COVERAGE ----------
    if q["start_year"] and q["end_year"]:
        ymin = provider["years"]["min"]
        ymax = provider["years"]["max"]
        if ymin <= q["start_year"] and ymax >= q["end_year"]:
            score += W_AVAIL

    explanation = {
        "matched": {k: v for k, v in matched.items() if v},
        "missing": [k for k, v in matched.items() if not v and q.get(k)]
    }

    return score, explanation


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

    scen_re = re.compile(r"ssp\d.*")
    year_re = re.compile(r"\d{4}")
    var_pipe_re = re.compile(r".*\|.*")

    known_regions = ["india", "china", "usa", "world", "europe", "germany"]

    for t in tokens:
        if scen_re.match(t):
            scenarios.append(t.upper())
        elif var_pipe_re.match(t):
            variables.append(t)
        elif t in known_regions:
            regions.append(t.capitalize())
        elif t in ["annual", "yearly", "5-year", "decadal"]:
            granularity = t
        elif year_re.match(t):
            y = int(t)
            if not start_year:
                start_year = y
            else:
                end_year = y
        elif t in ["gdp", "population", "co2", "emissions"]:
            variables.append(t)

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
        return json.load(f)["providers"]


##############################################################
# 5. Main Matching Function
##############################################################

def match_providers(query_text):
    parsed = parse_query(query_text)
    providers = load_provider_catalog()

    results = []

    for p in providers:
        score, explanation = score_provider(p, parsed)
        if score > 0:
            results.append({
                "provider_id": p["id"],
                "score": score,
                "explanation": explanation,
                "latest_file": p["latest_file"],
                "variables": p["variables"],
                "scenarios": p["scenarios"],
                "regions": p["regions"],
                "models": p.get("models", [])
            })

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "parsedQuery": parsed,
        "providers": results
    }
