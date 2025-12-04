# plotter.py
"""
Plotter
- Modes:
  --series-file <generated_series.json>
  --selection <confirmed_selection.json> (calls RAG to create series)
- Writes plot.html
"""
import argparse
import json
import os
from rag_model import RAG
import plotly.graph_objects as go

def plot_series(series, title="Series", out_html="../outputs/plot.html"):
    years = [p["year"] for p in series]
    values = [p["value"] for p in series]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=years, y=values, mode="lines+markers", name=title))
    fig.update_layout(title=title, xaxis_title="Year", yaxis_title="Value", template="plotly_white")
    fig.write_html(out_html, include_plotlyjs="cdn")
    print(f"Wrote interactive plot to {out_html}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--series-file", help="Path to a JSON file with {'series': [{year:, value:}, ...]}")
    parser.add_argument("--selection", help="confirmed_selection.json (variable/scenario/start/end) to generate series via RAG")
    parser.add_argument("--index-dir", default="./vector_index")
    parser.add_argument("--meta", default="./metadata.json")
    args = parser.parse_args()

    if args.series_file:
        data = json.load(open(args.series_file, "r", encoding="utf-8"))
        series = data.get("series")
        if not series:
            raise RuntimeError("No 'series' found in series file.")
        plot_series(series, title="Provided Series", out_html="../outputs/plot.html")
    elif args.selection:
        sel = json.load(open(args.selection, "r", encoding="utf-8"))
        rag = RAG(index_dir=args.index_dir, meta_path=args.meta)
        var = sel["variable"]
        sc = sel["scenario"]
        start = sel.get("start_year", 2020)
        end = sel.get("end_year", 2100)
        out = rag.generate(var, sc, start, end)
        series = out.get("series")
        plot_series(series, title=f"{var.get('id')} — {sc.get('id')}", out_html="../outputs/plot.html")
    else:
        print("Provide either --series-file or --selection")
        return

if __name__ == "__main__":
    main()