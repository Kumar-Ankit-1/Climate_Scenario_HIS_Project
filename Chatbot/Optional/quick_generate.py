# quick_generate.py
import json
from rag_model import RAG
sel = json.load(open("./Confirmed_selection/confirmed_selection.json", "r", encoding="utf-8"))
rag = RAG(index_dir="./vector_index", meta_path="./metadata.json")
out = rag.generate(sel["variable"], sel["scenario"], sel.get("start_year", 2020), sel.get("end_year", 2100))
with open("./Generated_series/generated_series.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print("Wrote generated_series.json (source:", out.get("source"), ")")