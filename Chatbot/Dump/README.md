# Climate Scenario RAG Chatbot

A Retrieval-Augmented Generation (RAG) system for querying the **IPCC
AR6 Scenario Database** with **natural language** and generating
**interactive line graphs** of climate variables over time.

This system allows users to ask questions like:

> "Show CO₂ emissions under scenario EN_NPi2020_1000 from 2020 to 2100."
> "Plot electricity demand for multiple scenarios between 2030 and
> 2070."

## Features

-   Semantic search (FAISS + SentenceTransformers)
-   Fuzzy matching for Variables & Scenarios
-   Natural-language parsing
-   Plotly line graphs
-   CLI chatbot interface
-   Ready for Groq + LCEL integration

## Installation

``` bash
python3 -m venv .venv
source .venv/bin/activate
pip install pandas numpy plotly sentence-transformers faiss-cpu rapidfuzz tqdm
```

## Build RAG Index

``` bash
python Chatbot/cli_rag_chatbot.py --rebuild-index --data Datasets/Extracted_AR6_Scenarios_Database_World_ALL_CLIMATE_v1.1.csv
```

## Run Chatbot

``` bash
python Chatbot/cli_rag_chatbot.py --data Datasets/Extracted_AR6_Scenarios_Database_World_ALL_CLIMATE_v1.1.csv

OR

python Chatbot/cli_rag_chatbot.py
```

## Output

Interactive plots saved to:

    outputs/

## Troubleshooting

-   Ensure dataset path is correct
-   Use `faiss-cpu==1.7.4` on macOS if needed

## License

MIT License
