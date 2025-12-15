from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Import the new matching function:
from .matching import match_providers

app = FastAPI()
BASE = Path(__file__).resolve().parents[1]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    print("Loading environment variables...")
    env_paths = [
        BASE / ".env",
        BASE / "backend" / ".env"
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"Loaded .env from {env_path}")
            break
    else:
        print("No .env file found, using system environment variables")
    
    print("Server ready!")

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
    try:
        csv_path = payload.get("file")
        if not csv_path:
            raise HTTPException(status_code=400, detail="File path is required")
        
        csv_path = csv_path.replace("\\", "/").replace("//", "/")
        
        csv_file = Path(csv_path)
        
        if csv_file.is_absolute():
            if not csv_file.exists():
                raise HTTPException(status_code=404, detail=f"File not found: {csv_path}")
        else:
            possible_paths = [
                BASE / csv_path,
                BASE / Path(csv_path),
                BASE / "canonical" / "latest" / Path(csv_path).name,
                BASE / "canonical" / "latest" / csv_path.replace("canonical/latest/", ""),
            ]
            
            csv_file = None
            for possible_path in possible_paths:
                if possible_path.exists() and possible_path.is_file():
                    csv_file = possible_path
                    break
            
            if csv_file is None:
                error_msg = f"File not found: {csv_path}\nTried paths:\n"
                for p in possible_paths:
                    error_msg += f"  - {p} ({'exists' if p.exists() else 'not found'})\n"
                raise HTTPException(status_code=404, detail=error_msg)
        
        variables = payload.get("variables", [])
        regions = payload.get("regions", [])
        scenarios = payload.get("scenarios", [])
        models = payload.get("models", [])

        df = pd.read_csv(str(csv_file))

        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower()
            if col_lower == "variable":
                column_mapping["variable"] = col
            elif col_lower == "region":
                column_mapping["region"] = col
            elif col_lower == "scenario":
                column_mapping["scenario"] = col
            elif col_lower == "model":
                column_mapping["model"] = col

        var_col = column_mapping.get("variable", "Variable")
        region_col = column_mapping.get("region", "Region")
        scen_col = column_mapping.get("scenario", "Scenario")
        model_col = column_mapping.get("model", "Model")

        if variables:
            df = df[df[var_col].isin(variables)]

        if regions:
            df = df[df[region_col].isin(regions)]

        if scenarios:
            df = df[df[scen_col].isin(scenarios)]

        if models:
            df = df[df[model_col].isin(models)]

        df = df.replace({np.nan: None})

        return df.to_dict(orient="records")
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Climate Scenario Matching API running"}