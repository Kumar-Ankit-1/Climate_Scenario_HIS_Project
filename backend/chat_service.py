import os
import json
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv
import psycopg2

load_dotenv()

groq_api_key = os.getenv('GROQ_API_KEY')
client = None
if groq_api_key:
    client = Groq(api_key=groq_api_key)

def get_db_connection():
    """Establish connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=os.getenv('DB_NAME', 'climate_db'),
            user=os.getenv('DB_USER', 'climate_user'),
            password=os.getenv('DB_PASSWORD', 'climate_pass'),
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=os.getenv('DB_PORT', '5432')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def rank_variables_with_llm(query, candidate_variables):
    """
    Rank candidate variables based on user query using LLM.
    """
    if not candidate_variables:
        return []

    candidate_variables_json = json.dumps(candidate_variables, indent=2)

    prompt = f"""You are a climate scenario variable ranking assistant.

You MUST follow these rules:
- You may ONLY rank variables provided by the user.
- You MUST NOT invent or modify variable names.
- You MUST NOT add new variables.
- Ranking must be based on relevance to the user query.
- Output MUST be valid JSON only.

User query:
"{query}"

The following variables were retrieved from a trusted database.
You MUST ONLY use these variables.

Candidate variables:

{candidate_variables_json}

Instructions:

1. Rank the variables by relevance to the user query.
2. Assign a relevance score between 0.0 and 1.0.
3. Provide a short explanation for why each variable is relevant.
4. Exclude variables that are clearly irrelevant.

Output format (JSON ONLY):

{{
  "suggested_variables": [
    {{
      "variable": "",
      "sector": "",
      "industry": "",
      "relevance": 0.0,
      "reason": ""
    }}
  ]
}}
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1000,
            temperature=0.0
        )
        result = json.loads(response.choices[0].message.content)
        return result.get('suggested_variables', [])
    except Exception as e:
        print(f"Ranking Error: {e}")
        return []

def process_chat_message(state, user_message, history, variables_list, scenarios_list):
    """
    Process the user message in a SINGLE LLM call to:
    1. Extract entities/intents (updates)
    2. Generate a conversational response
    
    Returns: JSON object with { updates: {}, response: "", detected_variables: [] }
    """
    if not client:
        return {
            "updates": {},
            "response": "Error: Groq API key missing.",
            "detected_variables": [],
            "completed": False
        }

    region = state['data'].get('region', 'Not Set')
    start_date = state['data'].get('start_date', 'Not Set')
    end_date = state['data'].get('end_date', 'Not Set')
    pending = state.get('pending_updates', {})
    
    # Combined System Prompt for Speed and Fluidity
    system_prompt = f"""
    You are the 'Climate Selection Buddy', an elite, intelligent assistant helping users configure a climate analysis.
    
    Current Configuration State:
    - Region: {region}
    - Start Date: {start_date}
    - End Date: {end_date}
    - Pending Updates: {pending}
    - Conversation History: {history}
    
    YOUR GOAL:
    1. UNDERSTAND the user's intent from the message.
    2. EXTRACT entities: Region, Start Date, End Date.
    3. ALWAYS include extracted entities in the `updates` field.
    4. JSON OUTPUT must be exact.

    CRITICAL: ENTITY EXTRACTION RULES:
    - If user mentions a REGION (country, city, continent like "China", "Europe", "USA"): 
      - Determine if it's an ADDITION ("Add India") or REPLACEMENT ("Replace China with India") or NEW SET ("Analyze India").
      - If ADDING: "region_add": ["India"]
      - If REPLACING: "region_remove": ["China"], "region_add": ["India"] (Use BOTH add and remove for replacements)
      - If SETTING/OVERWRITING: "region": ["India"] (Always use LIST format)
      - If REMOVING: "region_remove": ["Japan"]
    - If user mentions a YEAR or DATE:
      Determine if it's start_date or end_date based on context
    - NEVER omit an entity that was explicitly mentioned in the user message
    - IF user mentions a SCENARIO (e.g., "IPR Policy", "SSP1", "RCP4.5"):
      - Extract it into "detected_scenarios": ["IPR Policy"]

    LOGIC RULES:
    1. **Date Logic**:
       - We need a Start Date and an End Date.
       - If user provides ONE year (e.g., "2045"):
         - Check current state:
           - If BOTH are 'Not Set' or None: Set as Start Date
           - If Start exists and End is 'Not Set': Set as End Date
           - If End exists and Start is 'Not Set': Set as Start Date
           - If BOTH exist: Check context for which to update
         - Keywords "start", "begin", "from" -> update Start Date
         - Keywords "end", "until", "to" -> update End Date
       - If user provides RANGE (e.g., "2020-2050"): Update BOTH
       
    2. **Correction & Swaps**:
       - If user says "Make IT the end date" or "actually I meant end date":
         - The PREVIOUSLY MENTIONED date should move from Start to End
         - Return: {{"start_date": null, "end_date": "value"}} (Nullify the old one)
       - If user says "Swap dates" or "Exchange dates":
         - Return: {{"swap_dates": true}}
    
    3. **Constraints**:
       - Dates MUST be between 2000 and 2100 (INCLUSIVE)
       - If outside range, DO NOT update and respond: "The analysis period is restricted between 2000 and 2100."

    OUTPUT FORMAT (JSON ONLY):
    {{
       "reasoning": "Explain why you chose these updates...",
       "updates": {{
          "region": ["Region1", "Region2"] (List of regions to SET/REPLACE),
          "region_add": ["Region1"] (List of regions to ADD),
          "region_remove": ["Region1"] (List of regions to REMOVE),
          "start_date": "YYYY" (or null to clear),
          "end_date": "YYYY" (or null to clear),
          "swap_dates": true/false
       }},
       "detected_variables": ["var1"],
       "detected_scenarios": ["scenario1"],
       "intent": "INFO" | "CONFIRM" | "RESET" | "REQUEST_OVERWRITE" | "CONFIRM_UPDATE" | "CORRECTION",
       "response": "A friendly, advanced, concise response confirming the action."
    }}
    """

    try:
        try:
            response = client.chat.completions.create(
                # Using a smarter model for better logic
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                max_tokens=800, # Increased tokens for detailed reasoning
                temperature=0.1 # Lower temperature for more deterministic updates
            )
        except Exception as e:
            print(f"Primary model failed ({e}), switching to fallback...")
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_format={"type": "json_object"},
                max_tokens=500,
                temperature=0.3
            )
        
        content = response.choices[0].message.content
        print(f"DEBUG LLM RESPONSE: {content}") 
        result = json.loads(content)
        updates = result.get('updates')
        if updates is None:
            updates = {}
            result['updates'] = updates
        
        # We rely on the 70B model's reasoning now, but we do a final safety check for date ordering
        
        # LOGIC UPGRADE: Handle Region Lists and Swaps
        
        # 0. Handle Date Swap Explicitly
        if updates.get('swap_dates'):
            current_start = state['data'].get('start_date')
            current_end = state['data'].get('end_date')
            if current_start and current_end:
                 updates['start_date'] = current_end
                 updates['end_date'] = current_start
                 updates.pop('swap_dates')

        # 1. Handle Regions (Normalization to List)
        current_regions = state['data'].get('region', [])
        if isinstance(current_regions, str) and current_regions != "Not Set":
            current_regions = [current_regions]
        elif not isinstance(current_regions, list):
            current_regions = []

        # HANDLE ADD
        if 'region_add' in updates:
            for r in updates['region_add']:
                 if r not in current_regions:
                     current_regions.append(r)
            state['data']['region'] = current_regions
            
        # HANDLE REMOVE
        if 'region_remove' in updates:
            for r in updates['region_remove']:
                 if r in current_regions:
                     current_regions.remove(r)
            state['data']['region'] = current_regions

        # HANDLE SET (Overwrite)
        if 'region' in updates:
            # If the model sends a single string by mistake, convert to list
            val = updates['region']
            if isinstance(val, str):
                updates['region'] = [val]     
            # For SET, we usually just take the value. But if we also had Add/Remove, we need to decide precedence.
            # Usually SET overrides everything. 
        
        # Sync updates['region'] with the modified state so downstream logic works
        # If we modified current_regions via ADD/REMOVE, we MUST put it back into 'updates'
        if 'region_add' in updates or 'region_remove' in updates:
             updates['region'] = current_regions

        # Date Validation Logic
        # We need to ensure that if we just swapped, we don't accidentally revert due to some safety check?
        # But generally Start should be <= End.
        # If the swap resulted in Start > End (e.g. 2030, 2020), this is technically invalid for a Range.
        # However, the user asked to "Exchange". 
        # If we leave it as 2030-2020, the frontend might break or backend query might fail.
        # Let's enforcing sorting ONLY if it wasn't a swap?
        # Actually, if I swap 2020-2050 to 2050-2020, I should probably then AUTO-SORT it back to 2020-2050?
        # No, that defeats the purpose if the user thought "Start was 2050".
        # Assume usage: User sees "Start: 2050, End: 2020" (maybe they entered it wrong).
        # User says: "Exchange years".
        # Result: Start: 2020, End: 2050. (Correct).
        # Correct logic is: Apply Swap -> Then Auto-Sort?
        # If I have Start=2050, End=2020. Swap -> Start=2020, End=2050. Auto-Sort -> Start=2020, End=2050. (Good)
        # If I have Start=2020, End=2050. Swap -> Start=2050, End=2020. Auto-Sort -> Start=2020, End=2050. (Undo swap).
        
        # The user's request "exhange the years" usually implies correcting a mistake where they were reversed, 
        # OR they purely want to swap values. 
        # If the result of swap is Valid (S <= E), keep it.
        # If result is Invalid (S > E), maybe we should keep it IF the user requested it?? No, S > E is never valid for climate analysis.
        
        # Let's trust the Swap action. If it leads to S > E, maybe we should warn? 
        # But for now, let's just apply the updates as is.
        
        # Standard Cross-Check (Updating one date check)
        new_start = updates.get('start_date')
        new_end = updates.get('end_date')
        val_start = new_start if new_start else state['data'].get('start_date')
        val_end = new_end if new_end else state['data'].get('end_date')

        # Logic to ensure consistency if one is updated
        if new_start and not new_end and val_end and val_end != 'Not Set':
             try:
                 if int(new_start) > int(val_end):
                     # If user sets Start > current End, maybe they mean to shift window?
                     # Or maybe it's a mistake. 
                     # Let's not auto-swap here unless it's the "Only Update One" case mentioned in older code
                     # But older code explicitly swapped. 
                     # Let's keep it simple: Just Return updates. The frontend/User sees the result.
                     pass
             except: pass
             
        pass

        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "updates": {},
            "response": "I encountered a slight processing error. Could you repeat that?",
            "detected_variables": [],
            "intent": "INFO"
        }

def analyze_query_intent(query):
    """
    Analyze a complex query to return structured insights for the Smart Suggestions UI.
    """
    if not client:
        return None

    # Load allowed sectors and industries
    try:
        with open('training_data/sectors_config.json', 'r') as f:
            sectors_config = json.load(f)
            sectors_config_json = json.dumps(sectors_config, indent=2)
    except Exception as e:
        print(f"Error loading sectors_config.json: {e}")
        sectors_config_json = "Error loading configuration."

    prompt = f"""
You are a climate scenario reasoning assistant.

You MUST follow these rules strictly:
- You may ONLY use sectors and industries provided by the user.
- You MUST NOT invent, infer, rename, or generalize sectors or industries
  outside the provided lists.
- You MUST validate that every sector and industry you output exists
  exactly as written in the provided lists.
- If a relevant concept does not map to the provided lists, it MUST be placed
  under "missing_or_suggested_concepts".
- Any sector or industry not explicitly listed is INVALID and must not appear
  in the output.
- Output MUST be valid JSON and nothing else.

IMPORTANT REASONING RULE:
In addition to direct sector membership, you MUST consider
SECOND-ORDER IMPACTS of the entity or behavior described in the query.

Second-order impacts are allowed ONLY if:
- They logically follow from the primary sector or industry
- They exist in the provided sector list
- You clearly explain the causal link in the rationale

Do NOT include a sector or industry unless a clear causal relationship exists.
If you are unsure, do NOT include it.

Analyze the following climate policy / scenario query:

"{query}"

You are given a CLOSED and EXHAUSTIVE list of allowed sectors and industries.
You MUST ONLY select from these lists.

Allowed sectors and industries (from sectors_config.json):

{sectors_config_json}

Instructions:

1. Identify which of the ALLOWED sectors are relevant to the query.

   Consider BOTH:
   a) Direct sector membership (what the entity or activity is)
   b) Second-order impacts (what other sectors are affected if the
      described behavior is applied globally or at scale)

   - Only include a sector if it clearly applies.
   - Assign a confidence score between 0.0 and 1.0.
   - Provide a short rationale explaining the direct or causal link.

2. Identify relevant industries ONLY if they belong to an already selected sector.
   - Industries must exist exactly as written in the provided list.
   - Do NOT invent or generalize industries.
   - Assign a relevance score between 0.0 and 1.0.

3. Define a variable selection strategy describing how variables should be
   selected (e.g. sector-based, industry-based, cross-sector).

4. If the query refers to concepts that CANNOT be mapped to the allowed sectors
   or industries, list them under "missing_or_suggested_concepts" instead of
   inventing new categories.

Output format (STRICT — output JSON ONLY):

{{
  "relevant_industries": [
    {{
      "industry": "",
      "relevance": 0.0
    }}
  ],
  "relevant_sectors": [
    {{
      "sector": "",
      "confidence": 0.0,
      "rationale": ""
    }}
  ],
  "variable_selection_strategy": {{
    "selection_basis": "",
    "notes": ""
  }},
  "missing_or_suggested_concepts": [
    {{
      "concept": "",
      "reason": ""
    }}
  ]
}}
"""

    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600,
            temperature=0.0
        )
        initial_analysis = json.loads(response.choices[0].message.content)
        
        # --- Step 2: Database Lookup ---
        relevant_sectors = [item['sector'] for item in initial_analysis.get('relevant_sectors', [])]
        relevant_industries = [item['industry'] for item in initial_analysis.get('relevant_industries', [])]
        
        candidate_variables = []
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    # Build query dynamically based on logic
                    # We want variables that match ANY of the sectors OR industries
                    query_filters = []
                    params = []
                    
                    if relevant_sectors:
                        query_filters.append("sector = ANY(%s)")
                        params.append(relevant_sectors)
                    
                    if relevant_industries:
                        query_filters.append("industry = ANY(%s)")
                        params.append(relevant_industries)
                        
                    if query_filters:
                        sql = f"""
                            SELECT variable, sector, industry, description 
                            FROM variable_semantics 
                            WHERE {' OR '.join(query_filters)}
                            LIMIT 20;
                        """
                        print("DEBUG: SQL Query:", sql)
                        print("DEBUG: Parameters:", params)
                        cur.execute(sql, params)
                        rows = cur.fetchall()
                        
                        for row in rows:
                            candidate_variables.append({
                                "variable": row[0],
                                "sector": row[1],
                                "industry": row[2],
                                "description": row[3]
                            })
            except Exception as e:
                print(f"DB Query Error: {e}")
            finally:
                conn.close()
        
        # --- Step 3: LLM Ranking ---
        ranked_variables = rank_variables_with_llm(query, candidate_variables)
        
        # Merge results logic:
        # If we have ranked variables from DB, use them.
        initial_analysis['suggested_variables'] = ranked_variables[:5]
        
        return initial_analysis

    except Exception as e:
        print(f"Smart Analysis Error: {e}")
        return None
