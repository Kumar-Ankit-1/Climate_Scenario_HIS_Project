from flask import Flask, jsonify, request
from pymongo import MongoClient
from scoring import score_dataset
app = Flask(__name__)
client = MongoClient("mongodb://localhost:27017/")
db = client["climate_catalog"]
datasets = db["datasets"]

@app.route("/api/datasets")
def list_datasets():
    query = {
        "variable": request.args.get("variable"),
        "sector": request.args.get("sector"),
        "region": request.args.get("region"),
        "start": int(request.args.get("start")) if request.args.get("start") else None,
        "end": int(request.args.get("end")) if request.args.get("end") else None
    }

    results = []
    for ds in datasets.find():
        scored = score_dataset(ds, query)
        results.append(scored)

    # sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return jsonify({"query": query, "results": results})

@app.route("/api/datasets/<dataset_id>")
def dataset_metadata(dataset_id):
    ds = datasets.find_one({"id": dataset_id})
    if not ds:
        return jsonify({"error": "Dataset not found"}), 404
    return jsonify(ds)

if __name__ == "__main__":
    app.run(port=5000, debug=True)
