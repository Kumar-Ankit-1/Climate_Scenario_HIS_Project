import os
import json
import argparse
import pandas as pd
from groq import Groq
import time
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from .env file
load_dotenv()

# Configuration Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'training_data')
CONFIG_FILE = os.path.join(DATA_DIR, 'sectors_config.json')
INPUT_FILE = os.path.join(DATA_DIR, 'variables_vector.csv')
OUTPUT_CSV = os.path.join(DATA_DIR, 'classified_variables.csv')
OUTPUT_JSON = os.path.join(DATA_DIR, 'classified_variables.json')

def load_config():
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable not set.")
    return Groq(api_key=api_key)

def get_db_engine():
    required_vars = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_NAME"]
    missing = [v for v in required_vars if not os.environ.get(v)]
    if missing:
        raise ValueError(f"Missing environment variables: {', '.join(missing)}")
    
    return create_engine(
        f"postgresql+psycopg2://{os.environ['DB_USER']}:"
        f"{os.environ['DB_PASSWORD']}@"
        f"{os.environ['DB_HOST']}:"
        f"{os.environ['DB_PORT']}/"
        f"{os.environ['DB_NAME']}"
    )

def construct_batch_prompt(batch_data, config):
    sectors = ", ".join(config['sectors'])
    
    # Format industries for prompt
    industries_text = ""
    for sector, inds in config.get('industries', {}).items():
        industries_text += f"{sector}: {', '.join(inds)}\n"

    variables_text = json.dumps(batch_data, indent=2)

    prompt = f"""You are a climate scenario data expert.

Given a list of variables from an integrated assessment model, assign the most appropriate semantic classification for EACH variable.

Use IPCC WGIII-aligned thinking.

Allowed sectors:
{sectors}

Allowed industries (guidance):
{industries_text}

Rules:
- Do not invent new sectors.
- If uncertain, lower confidence.
- Prefer interpretability over precision.
- industry field is optional but recommended if the variable clearly maps to one of the listed industries.

Input Variables:
{variables_text}

Return valid JSON ARRAY where each object corresponds to an input variable.
The output format for each item must be:
{{
  "variable": "VariableName",
  "sector": "SectorName",
  "industry": "IndustryName",
  "subsector": "SubsectorName",
  "confidence": 0.95,
  "rationale": "Explanation..."
}}

Ensure the output contains an entry for every input variable.
"""
    return prompt

def classify_batch(client, batch_data, config, retries=3):
    prompt = construct_batch_prompt(batch_data, config)
    
    for attempt in range(retries):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"},
            )
            response_content = chat_completion.choices[0].message.content
            
            # Expecting a wrapper object usually with Groq JSON mode, 
            # but sometimes it just returns the struct. 
            # Let's try to parse it. 
            # Ideally the prompt asks for an array, but JSON mode often wraps in a root object like {"items": [...] } 
            # if we don't explicitly enforce a schema.
            # Llama 3 often returns exactly what is asked.
            
            # Since response_format={"type": "json_object"} forces a valid JSON object, 
            # but we asked for an array, sometimes models wrap arrays in keys like 'result' or 'variables'.
            # We will try to parse and find the list.
            
            data = json.loads(response_content)
            
            # Helper to recursively find a list of dicts or objects that look like results
            def extract_results(obj):
                if isinstance(obj, list):
                    # If it's a list, check if elements are dicts or more lists
                    flattened = []
                    for item in obj:
                        if isinstance(item, dict):
                            flattened.append(item)
                        elif isinstance(item, list):
                            flattened.extend(extract_results(item))
                    return flattened
                elif isinstance(obj, dict):
                    # If it's a dict and has 'variable', it's likely a single result
                    if 'variable' in obj:
                        return [obj]
                    # Otherwise, check all values for lists
                    for value in obj.values():
                        res = extract_results(value)
                        if res:
                            return res
                return []

            results = extract_results(data)
            if results:
                return results
            
            print(f"Warning: Could not extract results from JSON structure: {response_content[:200]}...")
            return []

        except Exception as e:
            print(f"Error processing batch (Attempt {attempt+1}/{retries}): {e}")
            time.sleep(2 * (attempt + 1))  # Exponential backoff
    
    # If all retries fail, return error objects
    return [{
        "variable": item['variable'],
        "sector": "Error",
        "confidence": 0.0,
        "rationale": "Batch failed after retries."
    } for item in batch_data]

def main():
    parser = argparse.ArgumentParser(description="Classify climate variables.")
    parser.add_argument("--test-limit", type=int, default=0, help="Limit number of variables to process for testing.")
    parser.add_argument("--batch-size", type=int, default=40, help="Batch size for processing.")
    args = parser.parse_args()

    print("Loading configuration...")
    config = load_config()
    
    print(f"Loading data from {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE)
    except FileNotFoundError:
        print(f"Error: File not found at {INPUT_FILE}")
        return

    client = get_groq_client()
    
    results = []
    
    limit = args.test_limit if args.test_limit > 0 else len(df)
    df_subset = df.head(limit)
    
    print(f"Processing {limit} variables in batches of {args.batch_size}...")
    
    # Convert to dictionary list for easier batching
    records = df_subset.to_dict('records')
    
    total_processed = 0
    start_time = time.time()

    for i in range(0, len(records), args.batch_size):
        batch = records[i:i + args.batch_size]
        batch_input = [{"variable": r['variable'], "description": r.get('description', '')} for r in batch]
        
        print(f"Processing batch {i//args.batch_size + 1} ({len(batch)} items)...")
        
        batch_results = classify_batch(client, batch_input, config)
        
        # Map back to original records (simple join by variable name or index order)
        # We assume order is preserved or we can match by variable name
        
        # Create a map of results by variable, with defensive check for dict type
        result_map = {}
        for res in batch_results:
            if isinstance(res, dict):
                var_name = res.get('variable')
                if var_name:
                    result_map[var_name] = res
            else:
                print(f"Warning: Skipping non-dictionary result item: {res}")
        
        for record in batch:
            var_name = record['variable']
            if var_name in result_map:
                combined = {**record, **result_map[var_name]}
            else:
                combined = {**record, "sector": "Error", "rationale": "Missing from batch response"}
            results.append(combined)
            
        total_processed += len(batch)
        
        # Rate limiting - small sleep between batches
        time.sleep(1)

    elapsed_time = time.time() - start_time
    print(f"Processed {total_processed} variables in {elapsed_time:.2f} seconds.")

    # Save Results to DB
    results_df = pd.DataFrame(results)
    
    # Ensure columns order and filter for DB schema
    db_cols = ['variable', 'description', 'sector', 'industry', 'subsector', 'confidence', 'rationale']
    final_df = results_df[[c for c in db_cols if c in results_df.columns]].copy()
    
    # Add source field as in schema
    final_df['source'] = 'llm'

    print(f"Connecting to database...")
    try:
        engine = get_db_engine()
        print(f"Saving {len(final_df)} results to 'variable_semantics' table...")
        
        # Using multi-row insertion with conflict handling via temporary table or just replace/append
        # For simplicity and given the prompt "insert directly", we'll use append.
        # If we want upsert, we'd need a more complex SQLAlchemy approach.
        
        final_df.to_sql(
            "variable_semantics",
            engine,
            if_exists="append", # Or use a method that handles duplicates if needed
            index=False,
            method="multi",
            chunksize=1000
        )
        print("Database insertion complete!")
        
    except Exception as e:
        print(f"Error saving to database: {e}")
        print(f"Falling back to CSV saving at {OUTPUT_CSV}...")
        results_df.to_csv(OUTPUT_CSV, index=False)

    print(f"Saving JSON backup to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Done!")

if __name__ == "__main__":
    main()
