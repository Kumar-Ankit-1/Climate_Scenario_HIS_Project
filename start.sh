#!/bin/bash

# Climate Chatbot Master Start Script
# Handles setup, environment checks, and parallel execution of Frontend and Backend

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   Climate Selection Buddy Launcher    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Environment Checks
echo -e "\n${GREEN}[1/4] Checking Environment...${NC}"

# Check Python (Require 3.9+)
if command -v python3 &>/dev/null; then
    PY_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    echo "Using Python $PY_VERSION"
else
    echo -e "${RED}Error: Python 3 is not installed.${NC}"
    exit 1
fi

# Check Node (Require 16+)
if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v)
    echo "Using Node $NODE_VERSION"
else
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

# 2. Backend Setup
echo -e "\n${GREEN}[2/4] Setting up Backend...${NC}"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate
echo "Virtual environment activated."



if [ ! -f ".env" ]; then
    echo -e "${RED}Warning: .env file missing in root. Copying .env.example if exists or create one.${NC}"
fi

# 3. Frontend Setup
echo -e "\n${GREEN}[3/4] Setting up Frontend...${NC}"
cd UI
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (first run only)..."
    npm install
fi
cd ..

# 4. Launch Services
echo -e "\n${GREEN}[4/4] Launching Services...${NC}"

# Function to kill child processes on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down services...${NC}"
    # Just in case vars are not set yet
    if [ -n "$BACKEND_PID" ]; then kill $BACKEND_PID 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID 2>/dev/null; fi
    exit
}

trap cleanup SIGINT

# Kill existing processes on ports
if lsof -t -i:5001 > /dev/null; then
    echo "Killing existing backend on port 5001..."
    lsof -t -i:5001 | xargs kill -9
fi

if lsof -t -i:3000 > /dev/null; then
    echo "Killing existing frontend on port 3000..."
    lsof -t -i:3000 | xargs kill -9
fi

# Make sure installs are visible (Unmask pip errors)
echo "Installing requirements..."
pip install -r requirements.txt

# Start Backend
echo "Starting Flask Backend (Port 5001)..."
python backend/app.py > backend.log 2>&1 &
BACKEND_PID=$!
sleep 2 # basic wait

# Start Frontend
echo "Starting React Frontend..."
cd UI
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Services are running!${NC}"
echo -e "Backend Logs: tail -f backend.log"
echo -e "Frontend Logs: tail -f frontend.log"
echo -e "Press ${RED}Ctrl+C${NC} to stop."

wait
