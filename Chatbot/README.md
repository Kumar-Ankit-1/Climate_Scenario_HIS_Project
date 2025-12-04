# 🌎 Climate Scenario RAG Chatbot  
*A Vector-Search + RAG + Streamlit Agentic AI System for Climate Variable & Scenario Exploration*

This project implements an **Agentic AI Retrieval-Augmented Generation (RAG)** pipeline enabling users to:

- Ingest climate **variables** and **scenarios** into a FAISS vector database  
- Perform **semantic retrieval** across both types  
- Select variable + scenario + timeframe  
- Use an LLM-powered or synthetic **RAG model** to generate time-series data  
- Visualize results using **Plotly**  
- Interact with everything through a **Streamlit chatbot UI**

---

## 📁 Project Structure

```
Chatbot/
│
├── ingestion.py             # Build vector DB (variables + scenarios)
├── retriever.py             # Semantic retrieval (variables-first, scenarios-second)
├── rag_model.py             # RAG generator (LLM or synthetic fallback)
├── plotter.py               # Plot generated timeseries
├── streamlit_app.py         # Streamlit chatbot UI
├── inspect_index.py         # Utility to inspect metadata & index stats
├── debug_env.py             # Diagnostic environment script
│
├── vector_index/            # Auto-generated FAISS index
│   └── faiss.index
├── metadata.json            # Generated metadata for all items
│
├── output/                  # Folder where plots may be stored
│   └── plot.html
│
└── README.md                # (This file)
```

---

# 🔧 Installation

## 1. Create a virtual environment

### macOS / Linux
```bash
python -m venv .venv
source .venv/bin/activate
```

### Windows PowerShell
```powershell
python -m venv .venv
.env\Scripts\Activate.ps1
```

---

## 2. Install dependencies

```bash
pip install --upgrade pip
pip install sentence-transformers faiss-cpu plotly streamlit requests tqdm
```

If FAISS fails on macOS M1/M2:
```bash
conda install -c conda-forge faiss-cpu
```

---

# 📊 Preparing Input CSV Files

## variables.csv
```
variable,description
CO2 emissions,Total CO2 emitted per year
Renewable generation,Electricity generated from renewables
```

## scenarios.csv  
Supports many header styles (`name,description`, `scenario_id,scenario_text`, etc.)

Example:
```
name,description
ADVANCE_2020_1.5C-2100,Scenario from the ADVANCE project, aiming for 1.5°C warming
ADVANCE_2030_Med2C,Scenario targeting 2°C warming
```

---

# 🏗️ Step 1 — Build Vector Database

Run ingestion:

```bash
python ingestion.py     --variables ../Datasets/variables.csv     --scenarios ../Datasets/scenarios.csv     --index-dir ./vector_index     --meta ./metadata.json
```

Expected output:

```
Loaded X variables and Y scenarios -> total Z items.
Saved FAISS index to ./vector_index/faiss.index
Saved metadata to metadata.json
```

---

# 🔍 Step 2 — Retrieve Variables & Scenarios

## Interactive mode
```bash
python retriever.py --index-dir ./vector_index --meta ./metadata.json
```

You will be prompted:

```
Enter a search query: carbon dioxide
Variables:
1. [variable] id=...
2. [variable] id=...
Scenarios:
3. [scenario] id=...
...

Pick VARIABLE and SCENARIO by number:
```

## Non-interactive
```bash
python retriever.py     --query "carbon dioxide"     --index-dir ./vector_index     --meta ./metadata.json
```

This creates:

```
confirmed_selection.json
```

---

# 🧠 Step 3 — Generate Time Series (RAG)

Use a helper script (e.g. `quick_generate.py`):

```python
import json
from rag_model import RAG

sel = json.load(open("confirmed_selection.json"))
rag = RAG(index_dir="./vector_index", meta_path="./metadata.json")

out = rag.generate(
    sel["variable"],
    sel["scenario"],
    sel["start_year"],
    sel["end_year"]
)

json.dump(out, open("generated_series.json", "w"), indent=2)
print("Saved generated_series.json")
```

Run:

```bash
python quick_generate.py
```

---

# 📈 Step 4 — Plot the Time Series

## A. Plot from generated JSON:
```bash
python plotter.py --series-file ./Generated_series/generated_series.json
```

## B. Or generate + plot directly:
```bash
python plotter.py --selection ./Confirmed_selection/confirmed_selection.json
```

Plot output is saved as:

```
plot.html
```

To open the plot:

```bash
open ../outputs/plot.html
```

---

# 💬 Step 5 — Streamlit Chatbot

Launch UI:

```bash
streamlit run streamlit_app.py
```

Open:

```
http://localhost:8501
```

Flow:

1. Enter search query  
2. View variables and scenarios separately  
3. Select variable + scenario  
4. Enter timeframe  
5. Generate & view Plotly chart  
6. Auto-saves selection to `confirmed_selection.json`

---

# 🔧 Troubleshooting

### Ingestion loads **0 scenarios**
Your scenario CSV likely uses headers like:
```
name,description
```
The updated loader supports this.

### FAISS segmentation fault (macOS ARM)
Run before retriever:

```bash
export OMP_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export MKL_NUM_THREADS=1
export TOKENIZERS_PARALLELISM=false
export JOBLIB_TEMP_FOLDER=/tmp
```

### Streamlit blank page
Run:

```bash
python debug_env.py
```

---

# 🤖 Gemini API (Optional)

To use Gemini for embeddings & generation:

```bash
export GEMINI_API_URL="https://your-gemini-endpoint"
export GEMINI_API_KEY="your_key"
```

Without these → SBERT embeddings + synthetic generator automatically used.

---

# 📌 Summary

This chatbot system provides:

- Climate variable & scenario ingestion  
- FAISS vector search  
- Variables-first ranking  
- RAG-powered time-series generation  
- Plotly visualization  
- Streamlit chatbot interface  

---

Want enhancements such as FastAPI, Dockerfile, dataset auto-cleaning, or architecture diagrams?  
Just ask!
