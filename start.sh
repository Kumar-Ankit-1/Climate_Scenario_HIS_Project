#!/bin/bash

# Financial Chatbot - Quick Start Script
# This script starts both the backend and frontend

echo "🚀 Starting Financial Chatbot..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/.venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Start backend in the background
echo -e "${YELLOW}Starting backend on port 5001...${NC}"
# Kill any process running on port 5001
echo "Cleaning up port 5001..."
PID=$(lsof -t -i:5001)
if [ -n "$PID" ]; then
    kill -9 $PID
    echo "Killed process $PID on port 5001."
fi

source "$SCRIPT_DIR/.venv/bin/activate"
cd "$SCRIPT_DIR/backend"
echo "Starting Backend (Flask) on port 5001..."
python app.py > /tmp/chatbot_backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${YELLOW}Starting frontend on port 3000...${NC}"
cd "$SCRIPT_DIR/UI"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Chatbot is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📱 Frontend:  http://localhost:3000"
echo "🔧 Backend:   http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for user to interrupt
wait
