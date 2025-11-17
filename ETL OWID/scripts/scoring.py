"""
Scoring module for dataset matching.

Weights:
 - sector_match: 0.4
 - region_match: 0.25
 - time_coverage: 0.15
 - variable_coverage: 0.10
 - license_score: 0.10

score_dataset(dataset_doc, query) -> dict with score, breakdown, reasons, coverage_pct, unit_compatibility
"""

from typing import Dict, Any, Optional, Tuple
import datetime

WEIGHTS = {
    "sector_match": 0.4,
    "region_match": 0.25,
    "time_coverage": 0.15,
    "variable_coverage": 0.10,
    "license_score": 0.10,
}

LICENSE_SCORES = {
    "open": 1.0,
    "cc-by": 1.0,
    "cc-by-4.0": 1.0,
    "free": 1.0,
    "registration": 0.5,
    "restricted": 0.0,
    "closed": 0.0
}

UNIT_EQUIVALENCES = {
    "t": 1.0,
    "tonne": 1.0,
    "tonnes": 1.0,
    "tonnes/yr": 1.0,
    "tonnes yr-1": 1.0,
    "MtCO2/yr": 1e6,
    "MtCO2": 1e6,
    "tonnes CO2/yr": 1.0
}

def _normalize_unit(u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    return u.strip()

def unit_compatibility(dataset_unit_map: dict, requested_variable: str) -> Tuple[bool, Optional[float], Optional[str]]:
    if not dataset_unit_map:
        return (False, None, None)
    ds_unit = dataset_unit_map.get(requested_variable) or dataset_unit_map.get(requested_variable.lower())
    if not ds_unit:
        if len(dataset_unit_map) == 1:
            ds_unit = next(iter(dataset_unit_map.values()))
        else:
            return (False, None, None)
    ds_unit_n = _normalize_unit(ds_unit)
    for key, scale in UNIT_EQUIVALENCES.items():
        if key.lower() in ds_unit_n.lower():
            return (True, scale, ds_unit)
    return (False, None, ds_unit)

def compute_time_coverage(ds_start:int, ds_end:int, req_start:int, req_end:int) -> float:
    if req_end < req_start:
        return 0.0
    total_years = req_end - req_start + 1
    overlap_start = max(ds_start, req_start)
    overlap_end = min(ds_end, req_end)
    if overlap_end < overlap_start:
        return 0.0
    covered_years = overlap_end - overlap_start + 1
    return covered_years / total_years

def region_match_fn(ds_regions, requested_region) -> Tuple[float, str]:
    if not requested_region:
        return 1.0, "No region requested"
    if not ds_regions:
        return 0.9, "Dataset contains granular country rows (assumed)"
    req = requested_region.lower()
    ds_lower = [r.lower() for r in ds_regions]
    if req in ds_lower:
        return 1.0, f"Exact region match: {requested_region}"
    if "world" in ds_lower:
        return 0.8, "Dataset covers World (aggregatable)"
    for r in ds_lower:
        if req in r or r in req:
            return 0.9, f"Partial region match: dataset '{r}' ~ requested '{requested_region}'"
    return 0.0, f"No region match for {requested_region}"

def sector_match_fn(ds_sectors, requested_sector) -> Tuple[float, str]:
    if not requested_sector:
        return 1.0, "No sector requested"
    if not ds_sectors:
        return 1.0, "Dataset not sectored (assumed covers all)"
    req = requested_sector.lower()
    ds_lower = [s.lower() for s in ds_sectors]
    if req in ds_lower:
        return 1.0, f"Has sector {requested_sector}"
    if "all" in ds_lower:
        return 1.0, "Dataset lists 'all' sectors"
    for s in ds_lower:
        if req in s or s in req:
            return 0.9, f"Partial sector match: dataset '{s}'"
    return 0.0, f"No sector match for {requested_sector}"

def license_score_from_string(license_str: Optional[str]) -> float:
    if not license_str:
        return 0.0
    s = license_str.lower()
    for k,v in LICENSE_SCORES.items():
        if k in s:
            return v
    if "cc" in s or "creative commons" in s or "public domain" in s or "open" in s:
        return 1.0
    if "registration" in s or "login" in s:
        return 0.5
    return 0.0

def score_dataset(dataset_doc: dict, query: dict) -> dict:
    variable = query.get("variable")
    sector = query.get("sector")
    region = query.get("region")
    start = int(query.get("start")) if query.get("start") is not None else None
    end = int(query.get("end")) if query.get("end") is not None else None

    ds_vars = dataset_doc.get("variables", [])
    ds_sectors = dataset_doc.get("sectors", [])
    ds_regions = dataset_doc.get("regions", [])
    ds_start = int(dataset_doc.get("start_year", -9999))
    ds_end = int(dataset_doc.get("end_year", 9999))
    ds_units = dataset_doc.get("unit", {})

    # sector
    sector_score, sector_reason = sector_match_fn(ds_sectors, sector)
    # region
    region_score, region_reason = region_match_fn(ds_regions, region)
    # time coverage
    time_cov = compute_time_coverage(ds_start, ds_end, start, end) if start is not None and end is not None else (1.0 if ds_start <= ds_end else 0.0)

    # variable coverage & unit compatibility
    unit_compat = {"compatible": False, "factor": None, "dataset_unit": None}
    if variable:
        dv_lower = [v.lower() for v in ds_vars]
        if variable.lower() in dv_lower:
            ok, factor, ds_unit = unit_compatibility(ds_units, variable)
            unit_compat = {"compatible": ok, "factor": factor, "dataset_unit": ds_unit}
            var_present = True
            var_reason = f"Variable {variable} present"
        else:
            var_present = False
            var_reason = f"Variable {variable} not present"
    else:
        var_present = True
        var_reason = "No variable requested"

    variable_score = 1.0 if var_present else 0.0

    # license
    lic_score = license_score_from_string(dataset_doc.get("license"))

    breakdown = {
        "sector_match": sector_score,
        "region_match": region_score,
        "time_coverage": round(time_cov, 4),
        "variable_coverage": variable_score,
        "license_score": round(lic_score, 4)
    }

    total_score = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)

    reasons = [sector_reason, region_reason, var_reason,
               f"Time coverage: {int(time_cov*100)}% of requested years",
               f"License: {dataset_doc.get('license','unknown')} (score {round(lic_score,2)})"]

    result = {
        "id": dataset_doc.get("id"),
        "name": dataset_doc.get("name"),
        "score": round(total_score, 4),
        "breakdown": breakdown,
        "reasons": reasons,
        "coverage_pct": round(time_cov * 100, 2),
        "unit_compatibility": unit_compat  # ALWAYS included
    }
    return result
