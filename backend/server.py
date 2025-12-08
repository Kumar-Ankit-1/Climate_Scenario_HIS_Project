from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import pandas as pd
import numpy as np

# Import the new matching function:
from .matching import match_providers   

app = FastAPI()
BASE = Path(__file__).resolve().parents[1]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # TEMP for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

##############################################################
# Request models
##############################################################

class Query(BaseModel):
    query: str


##############################################################
# 1. MATCH: /query 
##############################################################

@app.post("/query")
async def query_endpoint(q: Query):
    """
    Returns:
        parsedQuery: {variables, regions, scenarios, ...}
        providers: ranked list of provider matches
    """
    results = match_providers(q.query)
    return results


##############################################################
# 2. DOWNLOAD LATEST CANONICAL FOR PROVIDER
##############################################################

@app.get("/download/{provider_id}")
async def download_dataset(provider_id: str):
    """
    Sends the latest canonical file produced by scenario_runner.
    """
    file_path = BASE / "canonical" / "latest" / f"{provider_id}_latest.csv"
    if file_path.exists():
        return FileResponse(str(file_path), media_type="text/csv")
    return {"error": "Dataset not found"}


##############################################################
# 3. FILTER: /filter
##############################################################

@app.post("/filter")
async def filter_dataset(payload: dict):
    """
    Loads canonical CSV and returns only filtered subset.
    """

    csv_path = payload["file"]
    variables = payload.get("variables", [])
    regions = payload.get("regions", [])
    scenarios = payload.get("scenarios", [])
    models = payload.get("models", [])

    df = pd.read_csv(csv_path)

    if variables:
        df = df[df["variable"].isin(variables)]

    if regions:
        df = df[df["region"].isin(regions)]

    if scenarios:
        df = df[df["scenario"].isin(scenarios)]

    if models:
        df = df[df["model"].isin(models)]

    
    # 🎯 FIX: Replace NaN with None (JSON safe)
    df = df.replace({np.nan: None})

    return df.to_dict(orient="records")


@app.get("/")
async def root():
    return {"message": "Climate Scenario Matching API running"}
