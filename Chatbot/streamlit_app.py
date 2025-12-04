# streamlit_app.py
"""
Streamlit UI (variable-first then scenario, region-aware, scenario alternatives shown)
Run: streamlit run streamlit_app.py
"""
import streamlit as st
import json
import os

st.set_page_config(page_title="Agentic RAG Demo", layout="wide")
st.title("Agentic RAG — Variable & Scenario Explorer (Region-aware)")

INDEX_DIR = "./vector_index"
META_PATH = "./metadata.json"

# Defensive startup checks
if not os.path.exists(os.path.join(INDEX_DIR, "faiss.index")) or not os.path.exists(META_PATH):
    st.warning("Vector index or metadata missing. Run ingestion.py first.")
    st.stop()

try:
    from ingestion import EmbeddingProvider
    from rag_model import RAG
except Exception as e:
    st.error("Failed to import modules (check ingestion.py and rag_model.py).")
    st.exception(e)
    st.stop()

# instantiate
try:
    emb_provider = EmbeddingProvider()
    rag = RAG(index_dir=INDEX_DIR, meta_path=META_PATH)
except Exception as e:
    st.error("Initialization failed (faiss/sentence-transformers or metadata issue).")
    st.exception(e)
    st.stop()

# Search box
query = st.text_input("Search (ask for variables or scenarios)", value="renewable energy under drought")
if st.button("Search"):
    try:
        results = rag.retrieve(query, top_k=48)  # larger window to capture both
        st.session_state["results"] = results
        st.session_state["query"] = query
    except Exception as e:
        st.error("Search failed. See details.")
        st.exception(e)

results = st.session_state.get("results", None)
if results:
    # split
    vars_list = [r for r in results if r.get("type") == "variable"]
    scens_list = [r for r in results if r.get("type") == "scenario"]

    st.subheader("Variable options (top matches)")
    if vars_list:
        v_idx = st.selectbox("Choose variable", options=[f"{i+1}: {v.get('id')}" for i, v in enumerate(vars_list)], key="var_select")
        # parse selected variable
        var_idx = int(v_idx.split(":")[0]) - 1
        var_meta = vars_list[var_idx]
    else:
        st.info("No variable matches found for your query.")
        var_meta = None

    # After variable selection, show scenarios filtered by the variable context
    st.subheader("Scenario options (filtered by chosen variable)")
    scen_meta = None
    if var_meta:
        # Build context query
        context_q = f"{var_meta.get('text')} {st.session_state.get('query','')}"
        scen_candidates = rag.retrieve(context_q, top_k=48)
        scen_list = [r for r in scen_candidates if r.get("type") == "scenario"]
        if scen_list:
            s_idx = st.selectbox("Choose scenario", options=[f"{i+1}: {s.get('id')}" for i, s in enumerate(scen_list)], key="scen_select")
            s_choice_idx = int(s_idx.split(":")[0]) - 1
            scen_meta = scen_list[s_choice_idx]
            # Show alternative scenario suggestions (next-best) in an expander for discoverability
            alt_list = scen_list[8:13]  # show 5 alternatives beyond top-8
            if alt_list:
                with st.expander("Alternative scenario suggestions (useful if you don't see what you want)"):
                    for a in alt_list:
                        st.write(f"- {a.get('id')}: {a.get('text')[:300]}")
        else:
            st.info("No scenario matches found for this variable. You may enter a custom scenario below.")
            custom_s = st.text_input("Custom scenario (optional)", value="")
            if custom_s:
                scen_meta = {"type":"scenario","id":custom_s,"text":custom_s,"meta":{"scenario_id":custom_s,"text":custom_s}}

    # Region input
    st.subheader("Region & Timeframe")
    region = st.text_input("Region (e.g., Global, Europe, USA)", value="Global")
    col1, col2 = st.columns(2)
    with col1:
        start = st.number_input("Start year", value=2020, step=1)
    with col2:
        end = st.number_input("End year", value=2100, step=1)

    if st.button("Generate & Plot"):
        if not var_meta or not scen_meta:
            st.error("Please select both a variable and a scenario (or provide a custom scenario).")
        else:
            try:
                out = rag.generate(var_meta, scen_meta, int(start), int(end), region=region)
                series = out.get("series", [])
                years = [p["year"] for p in series]
                values = [p["value"] for p in series]
                import plotly.graph_objects as go
                fig = go.Figure()
                fig.add_trace(go.Scatter(x=years, y=values, mode="lines+markers", name=f"{var_meta.get('id')}"))
                fig.update_layout(title=f"{var_meta.get('id')} — {scen_meta.get('id')} — {region}", xaxis_title="Year", yaxis_title="Value")
                st.plotly_chart(fig, use_container_width=True)
                sel = {"variable": var_meta, "scenario": scen_meta, "region": region, "start_year": int(start), "end_year": int(end)}
                with open("confirmed_selection.json", "w", encoding="utf-8") as f:
                    json.dump(sel, f, indent=2, ensure_ascii=False)
                st.success("Saved confirmed_selection.json and plotted series.")
            except Exception as e:
                st.error("Generation or plotting failed.")
                st.exception(e)