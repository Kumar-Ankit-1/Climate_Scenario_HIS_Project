# retriever.py
"""
Retriever CLI (variables-first, with alternatives + scenario pick + region)

Flow:
1. Ask user for a search query.
2. Retrieve a window of neighbors from FAISS.
3. Display top variable matches and alternative variable suggestions.
4. Let user pick a variable (or type a custom variable).
5. Retrieve scenario candidates conditioned on selected variable and display
   top scenarios plus alternative scenario suggestions.
6. Ask user to choose a scenario (or enter a custom one).
7. Ask for region/timeframe and save confirmed_selection.json.
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
    import numpy as np
    q_emb = q_emb.astype(np.float32)
    D, I = index.search(np.expand_dims(q_emb, axis=0), window_k)
    ids = I[0].tolist()
    dists = D[0].tolist()
    return ids, dists

def present_variable_options(hits, vars_k):
    """Return displayed numbered list and mapping to meta entries (vars first)."""
    vars_hits = [h for h in hits if h[2].get("type") == "variable"]
    scen_hits = [h for h in hits if h[2].get("type") == "scenario"]

    vars_display = vars_hits[:vars_k]
    # alternative suggestions: up to next 5 variable ids not in vars_display
    alt_vars = [h for h in vars_hits[vars_k:vars_k+10]]

    numbered = []
    counter = 1
    print("\nTop variable matches:")
    if vars_display:
        for h in vars_display:
            meta = h[2]
            print(f"{counter}. {meta.get('id')}")
            numbered.append(h)
            counter += 1
    else:
        print(" (no variable matches found)")

    if alt_vars:
        print("\nAlternative variable suggestions:")
        for h in alt_vars[:5]:
            meta = h[2]
            print(f"- {meta.get('id')}")

    return numbered, vars_hits, scen_hits

def present_scenario_options(scen_hits, scen_k):
    """Return primary numbered scenarios and also a list of alternative suggestions."""
    scen_display = scen_hits[:scen_k]
    alt_scen = scen_hits[scen_k:scen_k+10]  # alternatives beyond the primary list

    numbered = []
    counter = 1
    print("\nScenario candidates:")
    if scen_display:
        for h in scen_display:
            meta = h[2]
            print(f"{counter}. {meta.get('id')}")
            numbered.append(h)
            counter += 1
    else:
        print(" (no scenario matches found for this variable)")

    if alt_scen:
        print("\nAlternative scenario suggestions:")
        for h in alt_scen[:5]:
            meta = h[2]
            print(f"- {meta.get('id')}")

    return numbered, alt_scen

def interactive_flow(index, metadata, emb_provider, query=None, window_k=128, vars_k=8, scen_k=8):
    is_interactive = sys.stdin.isatty()
    if query is None:
        if not is_interactive:
            print("No query and non-interactive terminal: use --query.")
            return None
        try:
            query = input("Enter a search query (e.g., 'Carbon Dioxide or Med2C'): ").strip()
        except Exception as e:
            print(f"Unable to read from stdin: {e}")
            return None
    if not query:
        print("Empty query. Exiting.")
        return None

    try:
        q_emb = emb_provider.embed_one(query)
    except Exception as e:
        print(f"Embedding failed: {e}")
        return None

    try:
        ids, dists = retrieve_candidates(index, q_emb, window_k)
    except Exception as e:
        print(f"Vector search failed: {e}")
        return None

    hits = []
    for idx, dist in zip(ids, dists):
        if idx == -1:
            continue
        meta = metadata.get(str(int(idx)), None)
        if not meta:
            continue
        hits.append((idx, dist, meta))

    # Present variable options and alternatives
    numbered_vars, all_vars_hits, all_scen_hits = present_variable_options(hits, vars_k)

    # Ask user to pick a variable or enter a custom variable name
    selected_variable_meta = None
    if is_interactive:
        print("\nChoose a VARIABLE by number from the list above, or type a custom variable name (or press Enter to pick #1):")
        choice = input("VARIABLE choice: ").strip()
        if choice == "":
            if numbered_vars:
                selected_variable_meta = numbered_vars[0][2]
            else:
                print("No variable available to select.")
                return None
        else:
            # if numeric
            if choice.isdigit():
                n = int(choice) - 1
                if 0 <= n < len(numbered_vars):
                    selected_variable_meta = numbered_vars[n][2]
                else:
                    print("Number out of range. Exiting.")
                    return None
            else:
                # custom variable name: create a simple meta entry
                selected_variable_meta = {"type":"variable","id":choice,"text":choice,"meta":{"variable":choice,"description":""}}
                print(f"Using custom variable: {choice}")
    else:
        # non-interactive auto-select
        if numbered_vars:
            selected_variable_meta = numbered_vars[0][2]
            print(f"Non-interactive: auto-selected variable='{selected_variable_meta.get('id')}'")
        else:
            print("Non-interactive: no variable to select.")
            return None

    # Now retrieve scenario candidates conditioned on the selected variable
    scen_query = f"{selected_variable_meta.get('text')} {query}"
    try:
        scen_emb = emb_provider.embed_one(scen_query)
        s_ids, s_dists = retrieve_candidates(index, scen_emb, window_k)
    except Exception:
        s_ids, s_dists = [], []
    scen_hits = []
    for idx, dist in zip(s_ids, s_dists):
        if idx == -1:
            continue
        meta = metadata.get(str(int(idx)), None)
        if not meta:
            continue
        if meta.get("type") == "scenario":
            scen_hits.append((idx, dist, meta))

    scen_numbered, scen_alternatives = present_scenario_options(scen_hits, scen_k)

    # User chooses scenario
    selected_scenario_meta = None
    if is_interactive:
        if scen_numbered:
            choice = input("SCENARIO choice (number, or press Enter to pick #1): ").strip()
            if choice == "":
                selected_scenario_meta = scen_numbered[0][2]
            elif choice.isdigit():
                n = int(choice) - 1
                if 0 <= n < len(scen_numbered):
                    selected_scenario_meta = scen_numbered[n][2]
                else:
                    print("Number out of range. Exiting.")
                    return None
            else:
                # allow entering a scenario id which might match one of the alternatives
                txt = choice.strip()
                # check if input matches one of the alternative scenario ids
                matched = None
                for h in scen_alternatives:
                    if h[2].get("id") == txt:
                        matched = h[2]; break
                if matched:
                    selected_scenario_meta = matched
                    print(f"Selected alternative scenario: {matched.get('id')}")
                else:
                    # treat as custom scenario
                    selected_scenario_meta = {"type":"scenario","id":txt,"text":txt,"meta":{"scenario_id":txt,"text":txt}}
                    print(f"Using custom scenario: {txt}")
        else:
            # allow custom scenario text
            custom = input("No scenario candidates found. Type a custom scenario name (or blank to abort): ").strip()
            if not custom:
                print("No scenario chosen. Exiting.")
                return None
            selected_scenario_meta = {"type":"scenario","id":custom,"text":custom,"meta":{"scenario_id":custom,"text":custom}}
    else:
        if scen_numbered:
            selected_scenario_meta = scen_numbered[0][2]
            print(f"Non-interactive: auto-selected scenario='{selected_scenario_meta.get('id')}'")
        else:
            fallback = next((h for h in hits if h[2].get("type") == "scenario"), None)
            if fallback:
                selected_scenario_meta = fallback[2]
            else:
                print("Non-interactive: no scenario found.")
                return None

    # Region and timeframe
    if is_interactive:
        region = input("Enter region (e.g., 'Global', 'Europe', 'USA', or leave blank for 'Global'): ").strip()
        if not region:
            region = "Global"
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
        region = "Global"
        start_y, end_y = 2020, 2100

    record = {
        "variable": selected_variable_meta,
        "scenario": selected_scenario_meta,
        "region": region,
        "start_year": start_y,
        "end_year": end_y
    }
    out_path = "Confirmed_selection/confirmed_selection.json"
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
        interactive_flow(index, metadata, emb, query=args.query, window_k=args.window_k, vars_k=args.vars_k, scen_k=args.scen_k)
    except Exception as e:
        print(f"Unexpected error during search: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--index-dir", default="./vector_index", help="directory with faiss.index")
    parser.add_argument("--meta", default="./metadata.json", help="metadata json path")
    parser.add_argument("--window-k", default=128, type=int, help="search window size to collect candidates")
    parser.add_argument("--vars-k", default=8, type=int, help="number of variable results to show")
    parser.add_argument("--scen-k", default=8, type=int, help="number of scenario results to show")
    parser.add_argument("--query", default=None, help="(optional) query string to run non-interactively")
    args = parser.parse_args()
    main(args)