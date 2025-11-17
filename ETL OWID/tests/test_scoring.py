# tests/test_scoring.py
import pytest
from scripts import scoring

# Example metadata documents
OWID = {
    "id": "owid_co2_v2025",
    "name": "OWID CO2 Dataset",
    "variables": ["co2", "co2_per_capita", "cumulative_co2"],
    "sectors": [],
    "regions": ["World", "Europe", "Germany"],
    "start_year": 1750,
    "end_year": 2023,
    "unit": {"co2": "tonnes/yr"},
    "license": "Our World in Data (see repository for sources and attribution)"
}

IIASA = {
    "id": "iiasa_ssp_v2023",
    "name": "IIASA SSP Database",
    "variables": ["CO2", "CH4", "Energy|Coal", "Energy|Renewables"],
    "sectors": ["Energy", "Industry", "Transport", "AFOLU"],
    "regions": ["World", "Europe", "OECD", "Asia"],
    "start_year": 1850,
    "end_year": 2100,
    "unit": {"CO2": "MtCO2/yr"},
    "license": "see IIASA SSP Database metadata (often open with attribution)"
}

GCP = {
    "id": "gcp_co2_v2024",
    "name": "Global Carbon Project CO2",
    "variables": ["CO2"],
    "sectors": ["Energy", "Transport"],
    "regions": ["World"],
    "start_year": 1959,
    "end_year": 2022,
    "unit": {"CO2": "GtCO2/yr"},
    "license": "open"
}

# Test queries
QUERIES = [
    {"variable": "CO2", "sector": "Industry", "region": "Europe", "start": 2000, "end": 2050},
    {"variable": "CH4", "sector": "Energy", "region": "World", "start": 1990, "end": 2020},
    {"variable": "co2", "sector": None, "region": "Germany", "start": 1800, "end": 1900},
]

@pytest.mark.parametrize("dataset", [OWID, IIASA, GCP])
@pytest.mark.parametrize("query", QUERIES)
def test_score_dataset(dataset, query):
    result = scoring.score_dataset(dataset, query)
    
    # Basic structure
    assert "id" in result
    assert "score" in result
    assert "breakdown" in result
    assert "reasons" in result
    assert "coverage_pct" in result
    assert "unit_compatibility" in result
    
    # Score must be between 0 and 1
    assert 0.0 <= result["score"] <= 1.0
    
    # Coverage percent between 0 and 100
    assert 0.0 <= result["coverage_pct"] <= 100.0
    
    # Unit compatibility should be a dict with required keys
    uc = result["unit_compatibility"]
    assert isinstance(uc, dict)
    assert "compatible" in uc
    assert "factor" in uc or uc["factor"] is None
    assert "dataset_unit" in uc or uc["dataset_unit"] is None

    # Optional: print result for manual inspection (comment out in CI)
    print(f"\nDataset: {dataset['id']}, Query: {query}")
    print(result)
