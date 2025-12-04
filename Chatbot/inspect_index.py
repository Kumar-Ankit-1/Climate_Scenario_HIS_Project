# inspect_index.py
import json, os, sys

META = "./metadata.json"
IDX_DIR = "./vector_index/faiss.index"

def main():
    print("PWD:", os.getcwd())
    print("metadata exists:", os.path.exists(META))
    print("index exists:", os.path.exists(IDX_DIR))
    if os.path.exists(META):
        with open(META, "r", encoding="utf-8") as f:
            meta = json.load(f)
        print("Total metadata entries:", len(meta))
        # sample first 8 entries and counts by type
        types = {}
        sample = []
        for k, v in list(meta.items())[:12]:
            t = v.get("type", "UNKNOWN")
            types[t] = types.get(t, 0) + 1
            sample.append((k, t, v.get("id"), (v.get("text") or "")[:160]))
        print("Type counts:", types)
        print("Sample entries:")
        for s in sample:
            print(" ", s)
    else:
        print("metadata.json not present or unreadable.")

if __name__ == "__main__":
    main()