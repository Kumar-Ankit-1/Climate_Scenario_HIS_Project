
# 🌎 Climate Scenario RAG + Tabular Data Chatbot  
*A Retrieval-Augmented Generation + Dataset Lookup System for Climate Analysis*

This project is a complete AI-assisted climate scenario exploration toolkit.  
It allows a user to:

- 🔍 **Search** climate variables & scenarios using semantic retrieval (FAISS + Embeddings)  
- 🧠 **Select** a variable, scenario, region, and timeframe (via CLI retriever)  
- 📊 **Fetch actual dataset values** from your tabular CSV (Model, Scenario, Region, Variable, Unit, 2020…2100)  
- 🤖 **Fallback to RAG** (LLM or synthetic generator) if no dataset match exists  
- 📈 **Plot** the final time‑series (Plotly, saved as `output/plot.html`)  

It supports:
- Exact matching  
- **Fuzzy matching** (rapidfuzz) for scenario, region, and variable names  
- JSON or CSV backend  
- Optional Streamlit UI  

---

# 📁 Project Structure

```
Chatbot/
│
├── ingestion.py                  # Build FAISS vector DB from variables & scenarios
├── retriever.py                  # CLI to choose variable + scenario + region + timeframe
├── rag_model.py                  # RAG fallback generator (if dataset not matched)
├── fetch_and_plot_from_tabular.py# Fetch dataset & plot (handles CSV + fuzzy matching)
├── plotter.py                    # (Optional) simple plotter for RAG-only flow
├── streamlit_app.py              # (Optional) Streamlit UI
├── tabular_ingest.py             # (Optional) Convert CSV → JSON for faster lookups
│
├── vector_index/                 # Generated FAISS index folder
│   └── faiss.index
├── metadata.json                 # Generated metadata file
├── confirmed_selection.json      # User-selected variable/scenario/region/timeframe
├── generated_series.json         # Final time-series used for plot
├── output/
│   └── plot.html                 # Plotly line plot
│
└── data/
    └── dataset.csv               # Your climate dataset
```

---

# ⚙️ Setup Instructions

## 1️⃣ Create Virtual Environment & Install Dependencies

### macOS / Linux
```bash
python -m venv .venv
source .venv/bin/activate
```

### Windows PowerShell
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install packages
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note for Mac M1/M2 users:** Install FAISS via conda:  
> `conda install -c conda-forge faiss-cpu`

---

# 📦 Required Files

### `variables.csv`
```
variable,description
CO2 emissions,Total CO2 emitted per year
Temperature,Global mean temperature anomaly
```

### `scenarios.csv`
```
name,description
ADVANCE_2030_Med2C,Scenario aiming for ~2°C limit
ADVANCE_2030_1p5C,Scenario aiming for ~1.5°C limit
```

### `data/dataset.csv`
Must include:

```
Model,Scenario,Region,Variable,Unit,2020,2030,2040,...,2100
```

---

# 🧱 2️⃣ Build Vector Database (FAISS)

Run ingestion:

```bash
python ingestion.py --variables ../Datasets/tese_variables.csv --scenarios ../Datasets/test_scenarios.csv --index-dir ./vector_index --meta ./metadata.json
```

This creates:

- `vector_index/faiss.index`  
- `metadata.json`

---

# 🔍 3️⃣ Retrieve Variable + Scenario + Region

```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 TOKENIZERS_PARALLELISM=false JOBLIB_TEMP_FOLDER=/tmp
python -X faulthandler retriever.py --index-dir ./vector_index --meta ./metadata.json
```

Interactive prompts:

- Enter search query  
- Select variable (or custom)  
- Select scenario (or custom)  
- Enter region  
- Enter start & end year  
- Saves → **`confirmed_selection.json`**

---

# 🧠 4️⃣ Fetch Real Dataset Values & Plot

If using CSV directly:

```bash
python fetch_and_plot_from_tabular.py   --csv ./data/dataset.csv   --out ./output/plot.html   --fuzzy-threshold 80
```

If you converted CSV → JSON:

```bash
To create the JSON for the CSV : python tabular_ingest.py --csv ../Datasets/AR6_Scenarios_Database_ISO3_v1.1.csv --out ./Dataset_json/tabular_data.json

python fetch_and_plot_from_tabular.py   --json ./Dataset_json/tabular_data.json   --out ./output/plot.html   --fuzzy-threshold 80
```

Open output:

```bash
open ./output/plot.html      # macOS
# or:
xdg-open ./output/plot.html # Linux
```

Outputs:
- `generated_series.json`  
- `output/plot.html` (interactive Plotly)

---

# 🤖 Fuzzy Matching Behavior

When the dataset does not contain *exact* names, the system uses **rapidfuzz**:

Examples:

| User Selection | Dataset Value | Match? |
|----------------|---------------|--------|
| `"ADVANCE 2030 Med2C"` | `"ADVANCE_2030_Med2C"` | ✅ Fuzzy matched |
| `"global"` | `"Global"` | ✅ |
| `"Co2 emision"` | `"CO2 Emissions"` | ✅ |

Tune fuzziness:

```bash
--fuzzy-threshold 70   # more permissive
--fuzzy-threshold 90   # stricter
```

---

# 🧼 Reset / Remove Old FAISS Index

### macOS / Linux
```bash
rm -rf ./vector_index
rm -f ./metadata.json
rm -f ./confirmed_selection.json
rm -f ./generated_series.json
rm -rf ./output
```

### Windows PowerShell
```powershell
Remove-Item -Recurse -Force .ector_index
Remove-Item -Force .\metadata.json
Remove-Item -Force .\confirmed_selection.json
Remove-Item -Force .\generated_series.json
Remove-Item -Recurse -Force .\output
```

Re-run ingestion afterward.

---

# 🖥️ 5️⃣ (Optional) Streamlit Web Interface

```bash
streamlit run streamlit_app.py
```

Workflow:

1. Search  
2. Pick **Variable**  
3. Pick **Scenario**  
4. Enter **Region** + timeframe  
5. Click **Generate & Plot**  
6. View result & `confirmed_selection.json`

---

# 📌 Notes & Tips
- If your dataset is large, convert CSV → JSON using `tabular_ingest.py` for faster searches.  
- If no tabular match found, pipeline falls back to **RAG synthetic** generation.  
- If FAISS crashes:  
  ```
  export OMP_NUM_THREADS=1
  export OPENBLAS_NUM_THREADS=1
  export TOKENIZERS_PARALLELISM=false
  ```

---

# 🎉 You're ready to run full climate scenario intelligence pipeline!

If you'd like enhancements such as merging multiple models, multi-region plots, forecasting, or full Streamlit integration — just ask!
