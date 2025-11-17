"""
scripts/add_dataset.py
CLI to insert or update dataset metadata into MongoDB
Usage:
python scripts/add_dataset.py metadata/owid_co2_v2025.json
"""

import sys
import json
from pymongo import MongoClient
from datetime import datetime

if len(sys.argv) < 2:
    print("Usage: python add_dataset.py <metadata.json>")
    sys.exit(1)

metadata_file = sys.argv[1]

# Load metadata JSON
with open(metadata_file, "r") as f:
    metadata = json.load(f)

# Set last_updated to now
metadata["last_updated"] = datetime.utcnow().isoformat() + "Z"

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["climate_catalog"]
datasets = db["datasets"]

# Upsert the dataset
result = datasets.update_one(
    {"id": metadata["id"]},
    {"$set": metadata},
    upsert=True
)

if result.upserted_id:
    print(f"✅ Dataset '{metadata['id']}' inserted successfully!")
else:
    print(f"✅ Dataset '{metadata['id']}' updated successfully!")
