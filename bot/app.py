from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import difflib
import pandas as pd
import os
from dotenv import load_dotenv
from pathlib import Path
import json
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Initialize Groq client
groq_api_key = os.getenv('GROQ_API_KEY')
if not groq_api_key:
    raise ValueError("GROQ_API_KEY not found in environment variables")

client = Groq(api_key=groq_api_key)

# Load CSV data
DATA_DIR = Path(__file__).parent.parent / "training_data"
variables_df = pd.read_csv(DATA_DIR / "variables_vector.csv")
scenarios_df = pd.read_csv(DATA_DIR / "scenario_vector.csv")

# Convert to dictionaries for easier lookup
variables_list = variables_df.to_dict('records')
scenarios_list = scenarios_df.to_dict('records')



def get_semantic_suggestions(query: str, data_list: list, max_suggestions: int = 5) -> list:
    """
    Use Groq to find semantically relevant suggestions when simple matching fails.
    """
    try:
        # Prepare a summarized list of items for the LLM context
        # We limit to name and description to save tokens
        items_summary = []
        for item in data_list:
            name = item.get('name', 'Unknown')
            desc = item.get('description', '')
            items_summary.append(f"{name}: {desc}")
        
        # Super optimization: Only send names to keeping it fast and cheap
        names_list = [item.get('name', '') for item in data_list]
        
        prompt = f"""
        I have a list of financial/climate variables/scenarios: {names_list[:200]}... (truncated for brevity)
        
        The user searched for: "{query}" through a variable/scenario database.
        
        Return a JSON array of up to {max_suggestions} strings from the provided list (or hypothetical relevant ones if exact match missing but keep it strict to the domain) that are most semantically relevant to "{query}".
        Example: User types "Icecream", you might return ["manufacturing", "consumer_goods", "retail_sales"] if they exist or are relevant.
        
        Return ONLY valid JSON array of strings.
        """
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        # Extract JSON list from text (handle potential markdown formatting)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        suggested_names = json.loads(content.strip())
        
        # Map back to full objects
        matches = []
        for name in suggested_names:
            # Find original object
            for item in data_list:
                if item.get('name') == name:
                    matches.append(item)
                    break
            # If we hallucinated a name not in list, maybe skip or add as 'suggestion'
        
        return matches[:max_suggestions]
        
    except Exception as e:
        print(f"Semantic Search Error: {e}")
        return []

def get_suggestions(query: str, data_list: list, max_suggestions: int = 5) -> list:
    """
    Get suggestions using robust field detection and fuzzy/token matching.
    Falls back to semantic search if no matches found.
    """
    if not query:
        return []

    query_lower = query.lower()
    matches = []

    for item in data_list:
        # Find a likely name field
        name = ""
        desc = ""
        for k, v in item.items():
            kl = k.lower()
            if kl in ("variable", "variable name", "name", "scenario", "scenario name", "title"):
                name = str(v)
                break
        if not name:
            # fallback: pick first field that looks like a title
            for k, v in item.items():
                if "name" in k.lower() or "variable" in k.lower() or "scenario" in k.lower():
                    name = str(v)
                    break
        if not name:
            try:
                name = str(next(iter(item.values())))
            except Exception:
                name = ""

        # description field detection
        for k in ("description", "Description", "desc", "details", "Scenario Name"):
            if k in item:
                desc = str(item.get(k, ""))
                break

        # Attach normalized name to item for later use
        item['name'] = name
        item['description'] = desc

        name_lower = name.lower()

        # Simple normalization / stemming
        def normalize_token(t: str) -> str:
            t = t.lower()
            t = ''.join([c for c in t if c.isalnum() or c.isspace()])
            for suffix in ("ing", "ment", "tion", "s", "es", "ly"):
                if len(t) > len(suffix) + 2 and t.endswith(suffix):
                    t = t[: -len(suffix)]
                    break
            return t

        qtokens = [normalize_token(t) for t in ''.join([c if c.isalnum() else ' ' for c in query_lower]).split() if t]
        ntokens = [normalize_token(t) for t in ''.join([c if c.isalnum() else ' ' for c in name_lower]).split() if t]

        # scoring
        score = 0.0
        if query_lower in name_lower:
            score = 1.0
        else:
            if qtokens and all(any(qt == nt for nt in ntokens) for qt in qtokens):
                score = 0.95
            else:
                try:
                    ratio = difflib.SequenceMatcher(None, query_lower, name_lower).ratio()
                except Exception:
                    ratio = 0.0
                score = ratio

        if score > 0.4:
            matches.append({
                "name": name,
                "description": desc,
                "score": score
            })

    # Sort by match score
    matches.sort(key=lambda x: x["score"], reverse=True)
    top_matches = matches[:max_suggestions]
    
    # Fallback to Semantic Search if few results
    if len(top_matches) < 2 and len(data_list) > 0:
        # No good matches, try semantic
        print(f"Low matches for '{query}', trying semantic search...")
        semantic_matches = get_semantic_suggestions(query, data_list, max_suggestions)
        
        # Deduplicate
        existing_names = {m['name'] for m in top_matches}
        for sm in semantic_matches:
            if sm.get('name') not in existing_names:
                top_matches.append({
                    "name": sm.get('name'),
                    "description": sm.get('description'),
                    "score": 0.8 # arbitrary score for semantic match
                })
    
    return top_matches[:max_suggestions]


@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({"status": "ok", "message": "Financial Chatbot Backend"}), 200


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Chatbot backend is running"}), 200


@app.route('/api/suggestions', methods=['POST'])
def get_auto_suggestions():
    """Get suggestions for variables and scenarios based on input"""
    data = request.json
    query = data.get('query', '').strip()
    
    if len(query) == 0:
        return jsonify({
            "variables": [],
            "scenarios": [],
            "query": query
        }), 200

    var_suggestions = get_suggestions(query, variables_list)
    scenario_suggestions = get_suggestions(query, scenarios_list)
    
    return jsonify({
        "variables": var_suggestions,
        "scenarios": scenario_suggestions,
        "query": query
    }), 200


# Global state store
session_states = {}

def get_session_id(request_data):
    return "default_session"

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Reset the current session state"""
    session_id = "default_session"
    session_states[session_id] = {
        "step": "region", 
        "data": {},
        "completed": False
    }
    return jsonify({"message": "Session reset", "status": "reset"}), 200

def parse_intent_with_groq(state, message):
    """
    Use Groq to understand user intent during the flow.
    Returns JSON: { "intent": "NEXT"|"MODIFY"|"RESET"|"CONFIRM", "field": "...", "value": "..." }
    """
    # Deterministic Override for common modification patterns
    # "Change region to X", "Set start date to Y"
    lower_msg = message.lower()
    
    # Strict Confirm Check (Global or Review step specific)
    # Log the input for debugging visibility in terminal
    print(f"[DEBUG] Processing Message: '{message}' | Current Step: {state.get('step')}", file=sys.stderr)
    
    clean_msg = lower_msg.strip(" .,!")
    if clean_msg in ["confirm", "yes", "done", "finish", "proceed", "looks good", "ok"]:
        print(f"[DEBUG] Deterministic Intent Detected: CONFIRM", file=sys.stderr)
        return {"intent": "CONFIRM"}

    if "change" in lower_msg or "set" in lower_msg:
        import re
        # Pattern: change/set (region|start date|end date) to (value)
        match = re.search(r'(?:change|set)\s+(region|start\s*date|end\s*date)\s+to\s+(.+)', lower_msg, re.IGNORECASE)
        if match:
            field_raw = match.group(1).lower().replace(" ", "_") # normalize start date -> start_date
            value = match.group(2).strip()
            # Special case cleanup
            if field_raw == "startdate": field_raw = "start_date"
            if field_raw == "enddate": field_raw = "end_date"
            
            print(f"[DEBUG] Deterministic Intent Detected: MODIFY {field_raw} -> {value}", file=sys.stderr)
            return {"intent": "MODIFY", "field": field_raw, "value": value.title() if field_raw == "region" else value.upper()}  # Basic casing

    prompt = f"""
    You are an intent classification engine for a chatbot wizard.
    The current step is: "{state['step']}".
    The user says: "{message}".
    
    Determine the JSON output:
    1. If the user is providing the answer for the current step (e.g. providing a region, date, or confirming), output: {{"intent": "NEXT", "value": "extracted_value"}}
    2. If the user wants to CHANGE a previous value (region, start_date, end_date), output: {{"intent": "MODIFY", "field": "field_name", "value": "new_value"}}
    3. If the user wants to RESET or RESTART, output: {{"intent": "RESET"}}
    4. If the user says "confirm", "yes", "proceed" in the review step, output: {{"intent": "CONFIRM"}}
    
    Examples:
    - Step: region, User: "North America" -> {{"intent": "NEXT", "value": "North America"}}
    - Step: start_date, User: "2020" -> {{"intent": "NEXT", "value": "2020"}}
    - Step: start_date, User: "Change region to China" -> {{"intent": "MODIFY", "field": "region", "value": "China"}}
    - Step: start_date, User: "Change region to CHN" -> {{"intent": "MODIFY", "field": "region", "value": "CHN"}}
    - Step: review, User: "Actually, start in 2015" -> {{"intent": "MODIFY", "field": "start_date", "value": "2015"}}
    - Step: review, User: "confirm" -> {{"intent": "CONFIRM"}}
    
    Ensure dates are normalized to YYYY-MM-DD if possible.
    """
    
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1
        )
        content = response.choices[0].message.content
        # Robust JSON extraction
        json_str = content.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]
        
        # Cleanup potential extra text outside braces
        start = json_str.find('{')
        end = json_str.rfind('}')
        if start != -1 and end != -1:
            json_str = json_str[start:end+1]
        
        parsed = json.loads(json_str)
        # print(f"DEBUG LLM Intent: {parsed}")
        return parsed
    except Exception as e:
        print(f"Intent Parsing Error: {e}")
        return {"intent": "NEXT", "value": message}
    

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint that uses Groq API with Guided Flow"""
    data = request.json
    user_message = data.get('message', '').strip()
    conversation_history = data.get('history', [])
    selected_variables = data.get('selected_variables', [])
    selected_scenarios = data.get('selected_scenarios', [])
    
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400
    
    # Session Management
    session_id = "default_session"
    if session_id not in session_states:
        session_states[session_id] = {
            "step": "region", 
            "data": {},
            "completed": False
        }
    
    state = session_states[session_id]
    
    # If flow is completed, standard chat behavior for now
    if state["completed"]:
        return run_standard_chat(user_message, conversation_history, selected_variables, selected_scenarios, state["data"])

    # Intelligent Guided Flow Logic
    response_text = ""
    
    # Parse Intent
    parsed = parse_intent_with_groq(state, user_message)
    intent = parsed.get("intent", "NEXT")
    value = parsed.get("value", user_message)
    field = parsed.get("field")
    
    # Handle Global Intents
    if intent == "RESET":
        reset_session()
        return jsonify({
            "response": "I've reset the selection process. Please enter the **Target Region** for analysis.",
            "success": True
        }), 200

    if intent == "MODIFY":
        if field and field in ["region", "start_date", "end_date"]:
            state["data"][field] = value
            
            # If we changed something, we should probably stay in review or go to review to see the change
            # But the user might be mid-flow. 
            # If step is review, update the response text immediately.
            
            response_text = f"✅ Updated **{field}** to **{value}**.\n\n"
        else:
            response_text = "I understood you want to change something, but I wasn't sure which field. Please be specific (e.g., 'Change region to Europe').\n\n"
    
    step = state["step"]
    
    # Step Transition Logic (Skip if MODIFY, as we already updated data)
    
    if step == "region":
        if intent == "NEXT":
            state["data"]["region"] = value
            state["step"] = "start_date"
            response_text = f"Region set to **{value}**. \nNow, please enter the **Start Date** for the analysis period.\n\n_Suggested: 2010, 2015, 2020_"
        elif intent == "MODIFY":
             if state['data'].get("region"):
                 # Re-prompt for next step if just modifying
                 # Actually, if they modified region, we should probably just confirm it and remind of current step
                 pass 

    elif step == "start_date":
        if intent == "NEXT":
            # Validation: Simple check if it looks like a year or date
            # Allow YYYY or YYYY-MM-DD
            import re
            if re.match(r'^\d{4}(?:-\d{2}-\d{2})?$', value):
                state["data"]["start_date"] = value
                state["step"] = "end_date"
                response_text = f"Start Date set to **{value}**. \nPlease enter the **End Date** for the analysis period.\n\n_Suggested: 2030, 2050, 2100_"
            else:
                 response_text = f"❌ '**{value}**' doesn't look like a valid year.\nPlease enter a valid year (e.g., 2020) or date (YYYY-MM-DD)."
                 
        elif intent == "MODIFY":
             pass
            
    elif step == "end_date":
        if intent == "NEXT":
            import re
            if re.match(r'^\d{4}(?:-\d{2}-\d{2})?$', value):
                 state["data"]["end_date"] = value
                 state["step"] = "review"
            else:
                 response_text = f"❌ '**{value}**' doesn't look like a valid year.\nPlease enter a valid year (e.g., 2050) or date (YYYY-MM-DD)."
        elif intent == "MODIFY":
            state["step"] = "review" # Force review if modifying end date
            
    # Review Logic
    added_vars = []
    added_scens = []
    
    if state["step"] == "review":
        if intent == "CONFIRM":
            state["completed"] = True
            
            output_file = Path(__file__).parent.parent / "confirm_selection.json"
            final_data = {
                "configuration": state["data"],
                "variables": selected_variables,
                "scenarios": selected_scenarios,
                "confirmed_at": datetime.now().isoformat(),
                "status": "confirmed"
            }
            try:
                with open(output_file, 'w') as f:
                    json.dump(final_data, f, indent=2)
                response_text = "✅ **Configuration Confirmed and Saved!** \n\nYou can now ask questions about your specific scenario and data."
            except Exception as e:
                response_text = f"❌ Error saving configuration: {str(e)}"
        else:
            # Check for variable/scenario additions via chat
            if intent == "NEXT":
                # Try to find a match
                var_matches = get_suggestions(user_message, variables_list)
                scen_matches = get_suggestions(user_message, scenarios_list)
                
                # If we have a very strong match or semantic match
                # Logic: If top match score is high, add it.
                if var_matches and var_matches[0]['score'] >= 0.5:
                     top_var = var_matches[0]['name']
                     if top_var not in selected_variables:
                         selected_variables.append(top_var)
                         added_vars.append(top_var)
                         response_text += f"✅ Added **{top_var}** to variables.\n"
                
                if scen_matches and scen_matches[0]['score'] >= 0.5:
                     top_scen = scen_matches[0]['name']
                     if top_scen not in selected_scenarios:
                         selected_scenarios.append(top_scen)
                         added_scens.append(top_scen)
                         response_text += f"✅ Added **{top_scen}** to scenarios.\n"

            # Display Review Summary
            reg = state['data'].get('region', 'Not Set')
            sd = state['data'].get('start_date', 'Not Set')
            ed = state['data'].get('end_date', 'Not Set')
            
            vars_str = ", ".join(selected_variables) if selected_variables else "None"
            scens_str = ", ".join(selected_scenarios) if selected_scenarios else "None"
            
            summary = (
                f"Region: **{reg}**\n"
                f"Period: **{sd}** to **{ed}**\n"
                f"Variables: {vars_str}\n"
                f"Scenarios: {scens_str}"
            )
            
            instruction = "\n\nType **'confirm'** to save and complete the flow, or tell me what to change."
            
            if intent == "MODIFY":
                response_text += f"Updated Review:\n{summary}{instruction}"
            elif intent == "NEXT":
                 if not added_vars and not added_scens:
                     response_text = f"Thanks! Please verify:\n\n{summary}{instruction}"
                 else:
                     response_text += f"\nUpdated Review:\n{summary}{instruction}"
            elif not response_text:
                 response_text = f"Please verify:\n\n{summary}{instruction}"

    return jsonify({
        "response": response_text,
        "success": True,
        "added_variables": added_vars,
        "added_scenarios": added_scens,
        "context_data": state["data"]
    }), 200

def run_standard_chat(user_message, history, variables, scenarios, context_data):
    """Standard Groq Chat"""
    context = ""
    if variables:
        context += "\nSelected Variables: " + ", ".join(variables)
    if scenarios:
        context += "\nSelected Scenarios: " + ", ".join(scenarios)
    if context_data:
        context += f"\nCONFIRMED CONTEXT - Region: {context_data.get('region')}, " \
                   f"Date Range: {context_data.get('start_date')} to {context_data.get('end_date')}"
    
    messages = []
    
    system_message = """You are a professional chatbot assistant helping users with financial decisions. 
You have access to a database of variables and scenarios. 
Provide clear, concise, and helpful responses."""
    
    if context:
        system_message += f"\n\nCurrent Context:{context}"
    
    for msg in history:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", "")
        })
    
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
            system=system_message
        )
        
        bot_response = response.choices[0].message.content
        return jsonify({
            "response": bot_response,
            "success": True
        }), 200
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "success": False
        }), 500


@app.route('/api/variables', methods=['GET'])
def get_variables():
    """Get all available variables"""
    return jsonify({
        "variables": variables_list
    }), 200


@app.route('/api/scenarios', methods=['GET'])
def get_scenarios():
    """Get all available scenarios"""
    return jsonify({
        "scenarios": scenarios_list
    }), 200


if __name__ == '__main__':
    # Run on port 5001 to avoid conflict with system services using port 5000.
    # Threaded mode prevents long-running `/api/chat` calls from blocking
    # quick endpoints such as `/api/suggestions` used by the UI.
    app.run(debug=False, port=5001, host='0.0.0.0', threaded=True)
