import requests
import json
import time

BASE_URL = "http://localhost:5001/api"

def test_flow():
    session_id = f"test_{int(time.time())}"
    
    # 1. Start/Add Region (To make it confirmable)
    print("1. Adding Region...")
    resp = requests.post(f"{BASE_URL}/chat", json={
        "message": "Analyze India",
        "session_id": session_id,
        "selected_variables": [],
        "selected_scenarios": []
    })
    print("Region Response:", resp.json())
    
    # 2. Add Variable
    print("\n2. Adding Variable...")
    # Using a term likely to match
    resp = requests.post(f"{BASE_URL}/chat", json={
        "message": "Add Temperature variable",
        "session_id": session_id,
        "selected_variables": [], # Simulating initial state
        "selected_scenarios": []
    })
    data = resp.json()
    print("Add Var Response:", data)
    added_vars = data.get("added_variables", [])
    print("Added Vars:", added_vars)
    
    # 3. Add Scenario (if my fix works)
    print("\n3. Adding Scenario...")
    resp = requests.post(f"{BASE_URL}/chat", json={
        "message": "Add IPR Policy scenario",
        "session_id": session_id,
        "selected_variables": added_vars, # Pass forward what we got
        "selected_scenarios": []
    })
    data = resp.json()
    print("Add Scen Response:", data)
    added_scens = data.get("added_scenarios", [])
    print("Added Scens:", added_scens)
    
    # 4. Dates (Required for completion)
    print("\n4. Setting Dates...")
    resp = requests.post(f"{BASE_URL}/chat", json={
        "message": "From 2020 to 2030",
        "session_id": session_id,
        "selected_variables": added_vars,
        "selected_scenarios": added_scens
    })
    print("Date Response:", resp.json())

    # 5. Confirm
    print("\n5. Confirming...")
    # CRITICAL: We must pass the accumulated selected lists
    final_vars = added_vars
    final_scens = added_scens
    resp = requests.post(f"{BASE_URL}/chat", json={
        "message": "Confirm",
        "session_id": session_id,
        "selected_variables": final_vars, 
        "selected_scenarios": final_scens
    })
    print("Confirm Response:", resp.json())
    
    # 6. Check File
    print("\n6. Checking File...")
    try:
        with open("backend/data/confirm_selection.json", "r") as f:
            content = json.load(f)
            print("File Content:", json.dumps(content, indent=2))
    except Exception as e:
        print("File check failed:", e)

if __name__ == "__main__":
    test_flow()
