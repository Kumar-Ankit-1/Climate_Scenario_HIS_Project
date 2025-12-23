from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from dotenv import load_dotenv
from pathlib import Path
import json
from datetime import datetime

# Add separate modules
import suggestions
import chat_service

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Global state store
session_states = {}

@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({"status": "ok", "message": "Financial Chatbot Backend (Optimized)"}), 200

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

    var_suggestions = suggestions.get_suggestions(query, suggestions.variables_list, use_llm=False)
    scenario_suggestions = suggestions.get_suggestions(query, suggestions.scenarios_list, use_llm=False)
    
    return jsonify({
        "variables": var_suggestions,
        "scenarios": scenario_suggestions,
        "query": query
    }), 200

# NEW: Restoring the endpoint expected by SmartSuggestions.js
@app.route('/api/parse-query', methods=['POST'])
def parse_query_intent():
    """Analyze complex query for Smart Suggestions UI"""
    data = request.json
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    result = chat_service.analyze_query_intent(query)
    
    if result:
        return jsonify(result), 200
    else:
        return jsonify({"error": "Analysis failed"}), 500

@app.route('/api/reset', methods=['POST'])
def reset_session():
    """Reset the current session state"""
    data = request.json
    session_id = data.get('session_id', "default_session")
    
    session_states[session_id] = {
        "step": "dynamic", 
        "data": {},
        "completed": False
    }
    return jsonify({"message": "Session reset", "status": "reset"}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint using optimized single-call service"""
    data = request.json
    user_message = data.get('message', '').strip()
    session_id = data.get('session_id')
    selected_variables = data.get('selected_variables', [])
    selected_scenarios = data.get('selected_scenarios', [])
    
    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400
    
    if not session_id:
        session_id = "temp_" + datetime.now().strftime("%Y%m%d%H%M%S")
        
    if session_id not in session_states:
        session_states[session_id] = {
            "step": "dynamic", 
            "data": {},
            "pending_updates": {},
            "completed": False
        }
    
    state = session_states[session_id]
    conversation_history = data.get('history', [])
    
    # 1. Process Message (Optimize: Single Call)
    result = chat_service.process_chat_message(
        state, 
        user_message, 
        conversation_history,
        suggestions.variables_list, 
        suggestions.scenarios_list
    )
    
    updates = result.get('updates', {})
    response_text = result.get('response', '')
    intent = result.get('intent', 'INFO')
    detected_vars = result.get('detected_variables', [])
    
    print(f"\n=== CHAT SERVICE RETURNED ===")
    print(f"Intent: {intent}")
    print(f"Updates: {updates}")
    print(f"Current State BEFORE applying: {state['data']}")
    
    # 2. Logic: Handle Overwrites vs Direct Updates
    if intent == "REQUEST_OVERWRITE":
        # Store updates as pending and ask user
        state["pending_updates"] = updates
        # Response text from LLM should already be asking "Do you want to switch to X?"
        
    elif intent == "CONFIRM_UPDATE":
        # Apply pending updates
        if state.get("pending_updates"):
            for k, v in state["pending_updates"].items():
                state["data"][k] = v
            state["pending_updates"] = {} # Clear
            response_text = "Update confirmed. " + response_text
        else:
             # Just normal confirm if no pending text
             if state['data'].get('region'):
                state["completed"] = True
                save_confirmation(state, selected_variables, selected_scenarios)
                response_text = "✅ **Configuration Confirmed!**\n\n[Open Comparison Tool](/compare)"

    elif intent == "CORRECTION":
        # Corrections should be applied immediately, bypassing permission checks
        print(f"Applying CORRECTION updates...")
        for k, v in updates.items():
            if k in ["region", "start_date", "end_date"]:
                print(f"  Setting {k} = {v}")
                state["data"][k] = v
        response_text = "✅ " + response_text

    else:
        # Standard INFO or direct update if safe
        # ALWAYS apply any updates returned by the LLM
        print(f"Applying {intent} updates...")
        for k, v in updates.items():
            if k in ["region", "start_date", "end_date"]:
                # Only update if value is meaningful
                if v is not None:
                    print(f"  Setting {k} = {v}")
                    state["data"][k] = v
    
    print(f"State AFTER applying updates: {state['data']}")
    
    # 3. Handle Variable/Scenario Detection
    added_vars = []
    added_scens = []
    
    for var_name in detected_vars:
        # Validate existence (Quick check only, no second-layer LLM)
        matches = suggestions.get_suggestions(var_name, suggestions.variables_list, max_suggestions=1, use_llm=False)
        if matches and matches[0]['score'] > 0.6:
            real_var_name = matches[0]['name']
            if real_var_name not in selected_variables:
                selected_variables.append(real_var_name)
                added_vars.append(real_var_name)
    
    # Process Detected Scenarios
    detected_scens_list = result.get('detected_scenarios', [])
    for scen_name in detected_scens_list:
        matches = suggestions.get_suggestions(scen_name, suggestions.scenarios_list, max_suggestions=1, use_llm=False)
        if matches and matches[0]['score'] > 0.6:
            real_scen_name = matches[0]['name']
            if real_scen_name not in selected_scenarios:
                selected_scenarios.append(real_scen_name)
                added_scens.append(real_scen_name)
    
    # 4. Handle RESET
    if intent == "RESET":
        session_states[session_id] = {"step": "dynamic", "data": {}, "pending_updates": {}, "completed": False}
        return jsonify({
            "response": "I've reset the selection process. Let's start over!",
            "success": True
        }), 200
    
    # 5. Handle Final Confirmation (explicit intent)
    if intent == "CONFIRM" and not state.get("pending_updates"):
         if state['data'].get('region'):
            state["completed"] = True
            save_confirmation(state, selected_variables, selected_scenarios)
            response_text = "✅ **Configuration Confirmed!**\n\n[Open Comparison Tool](/compare)" 

    # Normalize state data: Convert None to "Not Set" for frontend display
    normalized_data = {}
    for key in ["region", "start_date", "end_date"]:
        value = state["data"].get(key)
        if value is None or value == "None" or (isinstance(value, list) and len(value) == 0):
            normalized_data[key] = "Not Set"
        elif isinstance(value, list):
            normalized_data[key] = ", ".join(value)
        else:
            normalized_data[key] = str(value).strip() if value else "Not Set"
    
    print(f"\n=== RETURNING TO FRONTEND ===")
    print(f"Raw state: {state['data']}")
    print(f"Normalized context_data: {normalized_data}")
    print(f"Response: {response_text}\n")
    
    return jsonify({
        "response": response_text,
        "success": True,
        "added_variables": added_vars,
        "added_scenarios": added_scens,
        "context_data": normalized_data
    }), 200

def save_confirmation(state, variables, scenarios):
    output_file = Path(__file__).parent / "data" / "confirm_selection.json"
    final_data = {
        "configuration": state["data"],
        "variables": variables,
        "scenarios": scenarios,
        "confirmed_at": datetime.now().isoformat(),
        "status": "confirmed"
    }
    try:
        with open(output_file, 'w') as f:
            json.dump(final_data, f, indent=2)
    except Exception as e:
        print(f"Error saving confirmation: {e}")

if __name__ == '__main__':
    app.run(debug=False, port=5001, host='0.0.0.0', threaded=True)
