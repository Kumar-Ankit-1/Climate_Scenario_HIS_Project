# app.py for the frontend for the Climate Chatbot using Streamlit
import os
import re
import json
from typing import Optional, Tuple, Dict, List, Any
import requests

import pandas as pd
import numpy as np
import plotly.express as px
import streamlit as st
from rapidfuzz import process, fuzz

# ---------------------------
# Configuration / Constants
# ---------------------------
DEFAULT_DECADE_STEP = 10
FUZZY_SCORE_CUTOFF_HIGH = 85
FUZZY_SCORE_CUTOFF_MED = 70
TOP_N_CHOICES = 6

# ---------------------------
# Load data (cached)
# ---------------------------
@st.cache_data(show_spinner=False)
def load_df(path: str = "../Datasets/Extracted_AR6_Scenarios_Database_World_ALL_CLIMATE_v1.1.csv") -> pd.DataFrame:
    df = pd.read_csv(path)
    # detect year columns that are multiples of 10
    year_cols = [c for c in df.columns if c.isdigit() and int(c) % DEFAULT_DECADE_STEP == 0]
    cat_cols = [c for c in ["Model", "Scenario", "Region", "Variable", "Unit"] if c in df.columns]
    keep_cols = cat_cols + [c for c in year_cols if c in df.columns]
    df_filtered = df[keep_cols].copy()
    # ensure decades are numeric columns
    for c in [c for c in df_filtered.columns if c.isdigit()]:
        df_filtered[c] = pd.to_numeric(df_filtered[c], errors="coerce")
    return df_filtered

df = load_df()
DECADE_COLS = sorted([int(c) for c in df.columns if c.isdigit()])
DECADE_STR_COLS = [str(c) for c in DECADE_COLS]

# ---------------------------
# Fuzzy helpers
# ---------------------------
def fuzzy_top_matches(query: str, choices: List[str], limit: int = TOP_N_CHOICES):
    """
    Returns list of (choice, score) sorted descending by score.
    """
    if not choices:
        return []
    # use rapidfuzz.process.extract for multiple matches
    results = process.extract(query, choices, scorer=fuzz.WRatio, limit=limit)
    # results: list of tuples (match, score, index)
    return [(r[0], r[1]) for r in results]

def fuzzy_best(query: str, choices: List[str]):
    m = process.extractOne(query, choices, scorer=fuzz.WRatio)
    if not m:
        return None, 0
    return m[0], m[1]

# ---------------------------
# Groq integration (generic)
# ---------------------------
def call_groq_parse(text: str, groq_api_url: str, groq_api_key: str) -> Dict[str, Any]:
    """
    Generic Groq call. This function assumes Groq expects a JSON POST with {"input": "<text>"}
    and returns JSON that contains extracted fields. Because Groq setups vary, this function:
      - Sends a POST to groq_api_url with Authorization header
      - Attempts to parse a few likely response shapes:
         * {"output": {"variable":..., "scenario":..., "start":..., "end":...}}
         * {"result": {...}}
         * or a top-level JSON with keys "variable", "scenario", etc.
      - Returns a dict with keys: variables(list or None), scenarios(list or None), start, end, raw
    If your Groq endpoint uses a different contract, adapt this function accordingly.
    """
    headers = {"Authorization": f"Bearer {groq_api_key}", "Content-Type": "application/json"}
    payload = {"input": text}

    try:
        resp = requests.post(groq_api_url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Groq API call failed: {e}")

    try:
        j = resp.json()
    except Exception as e:
        raise RuntimeError(f"Cannot decode Groq JSON response: {e}")

    # Attempt to find useful fields
    parsed = {"variables": None, "scenarios": None, "start": None, "end": None, "raw": j}

    def pick_key(d, keys):
        for k in keys:
            if k in d:
                return d[k]
        return None

    # common patterns
    # 1) j might have "output" or "result"
    candidates = {}
    if isinstance(j, dict):
        if "output" in j and isinstance(j["output"], dict):
            candidates.update(j["output"])
        if "result" in j and isinstance(j["result"], dict):
            candidates.update(j["result"])
        candidates.update(j)  # include top-level

    # normalize fields
    var = pick_key(candidates, ["variable", "variables", "var", "vars"])
    scen = pick_key(candidates, ["scenario", "scenarios", "scen"])
    start = pick_key(candidates, ["start", "from", "year_start", "begin"])
    end = pick_key(candidates, ["end", "to", "year_end", "finish"])

    # coerce to lists/ints if necessary
    if isinstance(var, str):
        # split common separators
        parsed["variables"] = [v.strip() for v in re.split(r"[;,/|]|\band\b", var) if v.strip()]
    elif isinstance(var, list):
        parsed["variables"] = var
    if isinstance(scen, str):
        parsed["scenarios"] = [s.strip() for s in re.split(r"[;,/|]|\band\b", scen) if s.strip()]
    elif isinstance(scen, list):
        parsed["scenarios"] = scen

    # years
    try:
        if isinstance(start, str):
            start = int(re.search(r"(19|20)\d{2}", start).group(0))
        parsed["start"] = int(start) if start is not None else None
    except Exception:
        parsed["start"] = None
    try:
        if isinstance(end, str):
            end = int(re.search(r"(19|20)\d{2}", end).group(0))
        parsed["end"] = int(end) if end is not None else None
    except Exception:
        parsed["end"] = None

    return parsed

# ---------------------------
# Local parser (regex + fuzzy)
# ---------------------------
def parse_user_query_local(text: str, df: pd.DataFrame) -> Dict[str, Any]:
    """
    Extract variables (list), scenarios (list), and start/end years from free text.
    Uses direct substring matching first, then fuzzy matching with candidate selection.
    """
    text_low = text.lower()

    # years detection
    years = [int(m.group(0)) for m in re.finditer(r"(19|20)\d{2}", text)]
    start, end = None, None
    if len(years) >= 2:
        start, end = years[0], years[1]
    elif len(years) == 1:
        start = end = years[0]

    # candidate tokens for matching
    # Prefer long tokens and pipe-separated tokens present in dataset variable names
    all_vars = df["Variable"].dropna().unique().tolist()
    all_scen = df["Scenario"].dropna().unique().tolist()

    # try substring matches for multi-values (split user by 'and' ',' ';' '|')
    tokens = re.split(r"[;,]| and | & |\band\b|\|", text)
    tokens = [t.strip() for t in tokens if t.strip()]

    var_candidates = []
    scen_candidates = []

    # Direct substring search over tokens
    for t in tokens:
        tl = t.lower()
        # check variables list
        for v in all_vars:
            if isinstance(v, str) and v.lower() in tl and len(v) > 3:
                var_candidates.append(v)
        # check scenarios list
        for s in all_scen:
            if isinstance(s, str) and s.lower() in tl and len(s) > 3:
                scen_candidates.append(s)

    # If none found via substring, do fuzzy on longer tokens and full input
    if not var_candidates:
        # try full text fuzzy top matches
        var_matches = fuzzy_top_matches(text, all_vars, limit=TOP_N_CHOICES)
        var_candidates = [m for m,score in var_matches if score >= FUZZY_SCORE_CUTOFF_MED]
    if not scen_candidates:
        scen_matches = fuzzy_top_matches(text, all_scen, limit=TOP_N_CHOICES)
        scen_candidates = [m for m,score in scen_matches if score >= FUZZY_SCORE_CUTOFF_MED]

    # If still empty, attempt token-wise fuzzy search (for short names)
    if not var_candidates:
        words = sorted(set(re.findall(r"[A-Za-z0-9\|\-_\/]{3,}", text)), key=len, reverse=True)
        for w in words[:12]:
            m,score = fuzzy_best(w, all_vars)
            if m and score >= FUZZY_SCORE_CUTOFF_MED:
                var_candidates.append(m)
    if not scen_candidates:
        words = sorted(set(re.findall(r"[A-Za-z0-9_\-]{3,}", text)), key=len, reverse=True)
        for w in words[:12]:
            m,score = fuzzy_best(w, all_scen)
            if m and score >= FUZZY_SCORE_CUTOFF_MED:
                scen_candidates.append(m)

    # deduplicate while preserving order
    def uniq(seq):
        seen = set()
        out = []
        for x in seq:
            if x not in seen:
                out.append(x); seen.add(x)
        return out

    var_candidates = uniq(var_candidates)
    scen_candidates = uniq(scen_candidates)

    # default years if missing -> full decade range available
    if start is None and end is None and DECADE_COLS:
        start, end = DECADE_COLS[0], DECADE_COLS[-1]

    return {
        "variables": var_candidates if var_candidates else None,
        "scenarios": scen_candidates if scen_candidates else None,
        "start": start,
        "end": end,
        "raw_text": text
    }

# ---------------------------
# Data extraction & pre-aggregation caching
# ---------------------------
@st.cache_data(show_spinner=False)
def preaggregate_df(df: pd.DataFrame, by_cols: List[str] = ["Scenario", "Variable", "Region"]):
    """
    Pre-aggregate mean values for each combination of Scenario+Variable+Region across decades.
    This speeds up repeated queries.
    """
    decade_cols = [c for c in df.columns if c.isdigit()]
    # compute mean across any duplicates (e.g., multiple models)
    grouped = df.groupby(by_cols)[decade_cols].mean().reset_index()
    return grouped

preagg = preaggregate_df(df)

def extract_time_series_multi(df_agg: pd.DataFrame, variable: str, scenario: str, start: int, end: int) -> pd.DataFrame:
    """
    Return time series (years, value) for a single variable+scenario pair aggregated across regions (mean).
    """
    decade_cols = [str(c) for c in DECADE_COLS if c >= start and c <= end]
    sub = df_agg[(df_agg["Scenario"] == scenario) & (df_agg["Variable"] == variable)]
    if sub.empty:
        return pd.DataFrame(columns=["year", "value"])
    # aggregate across regions (mean)
    series = sub[decade_cols].astype(float).mean(axis=0, skipna=True)
    ts = series.reset_index()
    ts.columns = ["year", "value"]
    ts["year"] = ts["year"].astype(int)
    return ts

# ---------------------------
# Plotting utility (multiseries)
# ---------------------------
def plot_multi_series(series_map: Dict[str, pd.DataFrame], title: str = "Time series"):
    """
    series_map: dict with legend label -> dataframe with columns year,value
    """
    # combine into long dataframe for plotly
    rows = []
    for label, ts in series_map.items():
        if ts.empty:
            continue
        tmp = ts.copy()
        tmp["label"] = label
        rows.append(tmp)
    if not rows:
        return None
    long = pd.concat(rows, ignore_index=True)
    fig = px.line(long, x="year", y="value", color="label", markers=True, title=title)
    fig.update_layout(xaxis=dict(dtick=10), legend_title_text="")
    return fig

# ---------------------------
# Streamlit UI
# ---------------------------
st.set_page_config(layout="wide", page_title="Climate Chatbot — Full Implementation")
st.title("Climate Chatbot — Natural language → Line graphs")

# Sidebar / controls
with st.sidebar:
    st.header("Settings")
    use_groq = st.checkbox("Use Groq API for parsing (requires API URL & key)", value=False)
    groq_api_url = st.text_input("Groq API URL", value=os.getenv("GROQ_API_URL", ""))
    groq_api_key = st.text_input("Groq API Key", value=os.getenv("GROQ_API_KEY", ""), type="password")
    st.markdown("---")
    st.markdown("Quick filters")
    scenario_dropdown = st.selectbox("Select scenario (manual)", options=[None] + list(df["Scenario"].value_counts().head(50).index), index=0)
    variable_dropdown = st.selectbox("Select variable (manual)", options=[None] + list(df["Variable"].value_counts().head(100).index), index=0)
    st.markdown("Dataset stats")
    st.write(f"Rows: {df.shape[0]:,}, Decades: {DECADE_COLS[0]} - {DECADE_COLS[-1]} ({len(DECADE_COLS)} decades)")
    if st.button("Show sample rows"):
        st.write(df.sample(5))

# Main input
col1, col2 = st.columns([3,1])

with col1:
    user_input = st.text_input("Ask a question (variable, scenario, timeframe). Examples:\n"
                               "- Show Emissions|CO2|Energy for EN_NPi2020_1000 from 2020 to 2100\n"
                               "- Plot Secondary Energy|Electricity and Emissions|CO2 for EN_NPi2020_1400 and EN_NPi2020_1000 between 2030 and 2070",
                               value="Show Emissions|CO2|Energy for EN_NPi2020_1000 from 2020 to 2100")
    run = st.button("Run query")

    if run:
        st.info("Parsing the query...")
        parsed = None
        groq_error = None
        if use_groq and groq_api_url and groq_api_key:
            try:
                parsed = call_groq_parse(user_input, groq_api_url, groq_api_key)
                st.write("Groq parsed (raw):", parsed.get("raw", parsed))
            except Exception as e:
                groq_error = str(e)
                st.error(f"Groq parse failed: {groq_error}. Falling back to local parser.")
                parsed = parse_user_query_local(user_input, df)
        else:
            parsed = parse_user_query_local(user_input, df)

        # Merge UI manual dropdowns if user selected those (they override parsed)
        if scenario_dropdown:
            parsed["scenarios"] = [scenario_dropdown]
        if variable_dropdown:
            parsed["variables"] = [variable_dropdown]

        st.write("Parsed result (post-processing):", parsed)

        # If parsed has None for variables or scenarios, present candidate picks
        # Compute fuzzy candidates for missing items so user can select
        candidate_vars = []
        candidate_scens = []
        if not parsed.get("variables"):
            # produce top fuzzy candidates from the input
            candidate_vars = [m for m,s in fuzzy_top_matches(user_input, df["Variable"].dropna().unique().tolist(), limit=TOP_N_CHOICES)]
        else:
            candidate_vars = parsed.get("variables")

        if not parsed.get("scenarios"):
            candidate_scens = [m for m,s in fuzzy_top_matches(user_input, df["Scenario"].dropna().unique().tolist(), limit=TOP_N_CHOICES)]
        else:
            candidate_scens = parsed.get("scenarios")

        st.markdown("### Candidate variables (select one or more)")
        chosen_vars = st.multiselect("Variables", options=candidate_vars, default=candidate_vars[:1] if candidate_vars else [])
        st.markdown("### Candidate scenarios (select one or more)")
        chosen_scens = st.multiselect("Scenarios", options=candidate_scens, default=candidate_scens[:1] if candidate_scens else [])

        # If still empty ask user to type exact names (without blocking)
        if not chosen_vars:
            st.warning("No variable selected — please select from candidates or type exact variable name in the input above.")
        if not chosen_scens:
            st.warning("No scenario selected — please select from candidates or type exact scenario name in the input above.")

        # Parse timeframe
        start = parsed.get("start") or DECADE_COLS[0]
        end = parsed.get("end") or DECADE_COLS[-1]
        st.write(f"Using timeframe: {start} — {end}")

        # Build series per combination
        series_map = {}
        for var in chosen_vars:
            for scen in chosen_scens:
                ts = extract_time_series_multi(preagg, var, scen, start, end)
                label = f"{var} — {scen}"
                if ts.empty:
                    st.warning(f"No data for {label}")
                else:
                    series_map[label] = ts

        if not series_map:
            st.error("No valid series to plot. Try selecting different variables or scenarios.")
        else:
            fig = plot_multi_series(series_map, title=f"User query: {user_input}")
            st.plotly_chart(fig, use_container_width=True)

with col2:
    st.markdown("## Tips & Examples")
    st.markdown("""
    - Include exact variable text from dataset when possible (e.g., `Emissions|CO2|Energy`).
    - You can list multiple variables or scenarios separated by `and`, `,`, `|`.
    - If parser confidence is low, choose from candidate lists shown.
    """)
    st.markdown("### Top scenarios (sample)")
    st.dataframe(df["Scenario"].value_counts().head(20).rename_axis("Scenario").reset_index(name="count"))
    st.markdown("### Top variables (sample)")
    st.dataframe(df["Variable"].value_counts().head(20).rename_axis("Variable").reset_index(name="count"))

st.caption("Notes: Groq integration uses a generic POST contract — if your Groq endpoint expects a different shape adapt call_groq_parse(). The app is intentionally conservative: it falls back to local parsing and requires user confirmation when confidence is low.")