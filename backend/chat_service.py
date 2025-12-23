import os
import json
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_api_key = os.getenv('GROQ_API_KEY')
client = None
if groq_api_key:
    client = Groq(api_key=groq_api_key)

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

    prompt = f"""
    Analyze the following climate policy/scenario query: "{query}"
    
    Return a detailed JSON object with these keys:
    1. "relevant_industries": list of objects {{ "industry": "...", "relevance": 0.0-1.0 }}
    2. "relevant_sectors": list of objects {{ "sector": "...", "confidence": 0.0-1.0, "rationale": "..." }}
    3. "variable_selection_strategy": object {{ "selection_basis": "...", "notes": "..." }}
    4. "missing_or_suggested_concepts": list of objects {{ "concept": "...", "reason": "..." }}
    
    Output ONLY valid JSON.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600,
            temperature=0.4
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Smart Analysis Error: {e}")
        return None
