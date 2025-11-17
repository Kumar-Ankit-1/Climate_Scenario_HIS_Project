from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["climate_catalog"]
datasets = db["datasets"]

# Unique ID
datasets.create_index("id", unique=True)

# Multikey indexes on individual fields (safe)
datasets.create_index("variables")
datasets.create_index("sectors")
datasets.create_index("regions")
datasets.create_index("family")
datasets.create_index("provenance.retrieval_date")

print("✅ All safe indexes created successfully!")
