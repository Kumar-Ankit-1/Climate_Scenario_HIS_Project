# retriever.py
"""
Retriever CLI (variables-first display)

Behavior:
- Runs a single vector search (with a larger window)
- Splits results into variables and scenarios (preserving relative rank)
- Displays variables first (up to --vars-k) then scenarios (up to --scen-k)
- Supports interactive mode (stdin) and non-interactive --query mode (auto-select)
- Writes confirmed_selection.json

Usage:
  python retriever.py --index-dir ./vector_index --meta ./metadata.json
  python retriever.py --query "co2 emission" --index-dir ./vector_index --meta ./metadata.json
"""
import os
import json
import argparse
import sys

def import_faiss():
    try:
        import faiss
        return faiss
    except Exception:
        return None

def import_embedding_provider():
    try:
        from ingestion import EmbeddingProvider
        return EmbeddingProvider
    except Exception:
        return None

def load_index(index_dir: str):
    idx_file = os.path.join(index_dir, "faiss.index")
    if not os.path.exists(idx_file):
        raise FileNotFoundError(f"Index not found at {idx_file}. Run ingestion.py first.")
    faiss = import_faiss()
    if faiss is None:
        raise RuntimeError("faiss is not installed or failed to import.")
    try:
        index = faiss.read_index(idx_file)
    except Exception as e:
        raise RuntimeError(f"Failed to read faiss index: {e}")
    return index

def load_metadata(meta_path: str):
    if not os.path.exists(meta_path):
        raise FileNotFoundError(f"Metadata file not found at {meta_path}. Run ingestion.py first.")
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    return metadata

def retrieve_candidates(index, q_emb, window_k):
    # perform one search to get enough candidates
    import numpy as np
    q_emb = q_emb.astype(np.float32)
    D, I = index.search(np.expand_dims(q_emb, axis=0), window_k)
    ids = I[0].tolist()
    return ids, D[0].tolist()

def interactive_search(index, metadata, emb_provider, query=None, window_k=64, vars_k=8, scen_k=8):
    # get query
    if query is None:
        try:
            query = input("Enter a search query (e.g., 'renewable energy under drought'): ").strip()
        except Exception as e:
            print(f"Unable to read from stdin: {e}")
            return None
    if not query:
        print("Empty query. Exiting.")
        return None

    # embed
    try:
        q_emb = emb_provider.embed_one(query)
    except Exception as e:
        print(f"Embedding failed: {e}")
        return None

    # retrieve a larger window to allow type filtering
    try:
        ids, dists = retrieve_candidates(index, q_emb, window_k)
    except Exception as e:
        print(f"Vector search failed: {e}")
        return None

    # Map ids -> metadata entries preserving order; skip -1
    hits = []
    for idx, dist in zip(ids, dists):
        if idx == -1:
            continue
        meta = metadata.get(str(int(idx)), None)
        if not meta:
            continue
        hits.append((idx, dist, meta))

    # split into variables and scenarios preserving ranking
    vars_hits = [h for h in hits if h[2].get("type") == "variable"]
    scen_hits = [h for h in hits if h[2].get("type") == "scenario"]

    # take top-k from each
    vars_display = vars_hits[:vars_k]
    scen_display = scen_hits[:scen_k]

    # printing: number results sequentially, variables first then scenarios
    print("\nTop matches (variables first, then scenarios):")
    numbered = []
    counter = 1
    if vars_display:
        print("\nVariables:")
        for h in vars_display:
            meta = h[2]
            print(f"{counter}. [variable] id={meta.get('id')}: {meta.get('text')[:200]}")
            numbered.append(h)
            counter += 1
    else:
        print("\nVariables: (none)")

    if scen_display:
        print("\nScenarios:")
        for h in scen_display:
            meta = h[2]
            print(f"{counter}. [scenario] id={meta.get('id')}: {meta.get('text')[:200]}")
            numbered.append(h)
            counter += 1
    else:
        print("\nScenarios: (none)")

    if not numbered:
        print("No results found.")
        return None

    # selection step
    print("\nPick one of the above results to be the VARIABLE and one to be the SCENARIO.")
    is_interactive = sys.stdin.isatty()
    if not is_interactive:
        # auto-pick first variable and first scenario from the full lists (not only displayed ones)
        var_meta = vars_hits[0][2] if vars_hits else numbered[0][2]
        scen_meta = scen_hits[0][2] if scen_hits else (numbered[1][2] if len(numbered)>1 else numbered[0][2])
        print(f"Non-interactive: auto-selected variable='{var_meta.get('id')}', scenario='{scen_meta.get('id')}'")
    else:
        try:
            var_choice = input("Enter the number of the item to use as VARIABLE (e.g., 1): ").strip()
            scen_choice = input("Enter the number of the item to use as SCENARIO (e.g., 2): ").strip()
            var_idx = int(var_choice) - 1
            scen_idx = int(scen_choice) - 1
            if var_idx < 0 or var_idx >= len(numbered) or scen_idx < 0 or scen_idx >= len(numbered):
                print("Selection out of range. Exiting.")
                return None
            var_meta = numbered[var_idx][2]
            scen_meta = numbered[scen_idx][2]
        except Exception:
            print("Invalid selection or input aborted. Exiting.")
            return None

    # timeframe
    if is_interactive:
        start = input("Enter start year (leave blank for default 2020): ").strip()
        end = input("Enter end year (leave blank for default 2100): ").strip()
        try:
            start_y = int(start) if start else 2020
        except:
            start_y = 2020
        try:
            end_y = int(end) if end else 2100
        except:
            end_y = 2100
    else:
        start_y, end_y = 2020, 2100

    record = {
        "variable": var_meta,
        "scenario": scen_meta,
        "start_year": start_y,
        "end_year": end_y
    }
    out_path = "confirmed_selection.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)
    print(f"\nSaved selection to {out_path}")
    return record

def main(args):
    EmbeddingProvider = import_embedding_provider()
    if EmbeddingProvider is None:
        print("Could not import EmbeddingProvider from ingestion.py. Check ingestion.py.")
        return

    try:
        index = load_index(args.index_dir)
    except Exception as e:
        print(f"Failed to load FAISS index: {e}")
        return

    try:
        metadata = load_metadata(args.meta)
    except Exception as e:
        print(f"Failed to load metadata: {e}")
        return

    emb = EmbeddingProvider()
    try:
        interactive_search(index, metadata, emb, query=args.query, window_k=args.window_k, vars_k=args.vars_k, scen_k=args.scen_k)
    except Exception as e:
        print(f"Unexpected error during search: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--index-dir", default="./vector_index", help="directory with faiss.index")
    parser.add_argument("--meta", default="./metadata.json", help="metadata json path")
    parser.add_argument("--window-k", default=64, type=int, help="search window size to collect candidates")
    parser.add_argument("--vars-k", default=8, type=int, help="number of variable results to show")
    parser.add_argument("--scen-k", default=8, type=int, help="number of scenario results to show")
    parser.add_argument("--query", default=None, help="(optional) query string to run non-interactively")
    args = parser.parse_args()
    main(args)