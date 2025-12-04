# streamlit_app.py
"""
Streamlit UI: search -> select -> generate -> plot
Run: streamlit run streamlit_app.py
"""
import streamlit as st
import json
import os

st.set_page_config(page_title="Agentic RAG Demo", layout="wide")
st.title("Agentic RAG — Variable & Scenario Explorer")

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

query = st.text_input("Search (ask for variables or scenarios)", value="renewable energy under drought")
if st.button("Search"):
    try:
        results = rag.retrieve(query, top_k=12)
        st.session_state["results"] = results
    except Exception as e:
        st.error("Search failed. See details.")
        st.exception(e)

results = st.session_state.get("results", None)
if results:
    st.write("Search results (top):")
    for i, r in enumerate(results):
        st.write(f"**{i+1}.** [{r.get('type')}] `{r.get('id')}` — {r.get('text')[:500]}")
    vars_list = [r for r in results if r.get("type") == "variable"]
    scens_list = [r for r in results if r.get("type") == "scenario"]
    col1, col2 = st.columns(2)
    with col1:
        if vars_list:
            v_choice = st.selectbox("Choose variable", options=[f"{i+1}: {v.get('id')}" for i, v in enumerate(vars_list)])
        else:
            v_choice = None
    with col2:
        if scens_list:
            s_choice = st.selectbox("Choose scenario", options=[f"{i+1}: {s.get('id')}" for i, s in enumerate(scens_list)])
        else:
            s_choice = None
    start = st.number_input("Start year", value=2020, step=1)
    end = st.number_input("End year", value=2100, step=1)
    if st.button("Generate & Plot"):
        def parse_choice(choice_str, pool):
            if not choice_str:
                return None
            idx = int(choice_str.split(":")[0]) - 1
            return pool[idx]
        var_meta = parse_choice(v_choice, vars_list) if vars_list else None
        scen_meta = parse_choice(s_choice, scens_list) if scens_list else None
        if not var_meta or not scen_meta:
            st.error("Please select both a variable and a scenario from the search results.")
        else:
            try:
                out = rag.generate(var_meta, scen_meta, int(start), int(end))
                series = out.get("series", [])
                years = [p["year"] for p in series]
                values = [p["value"] for p in series]
                import plotly.graph_objects as go
                fig = go.Figure()
                fig.add_trace(go.Scatter(x=years, y=values, mode="lines+markers", name=f"{var_meta.get('id')}"))
                fig.update_layout(title=f"{var_meta.get('id')} — {scen_meta.get('id')}", xaxis_title="Year", yaxis_title="Value")
                st.plotly_chart(fig, use_container_width=True)
                sel = {"variable": var_meta, "scenario": scen_meta, "start_year": int(start), "end_year": int(end)}
                with open("confirmed_selection.json", "w", encoding="utf-8") as f:
                    json.dump(sel, f, indent=2, ensure_ascii=False)
                st.success("Saved confirmed_selection.json and plotted series.")
            except Exception as e:
                st.error("Generation or plotting failed.")
                st.exception(e)