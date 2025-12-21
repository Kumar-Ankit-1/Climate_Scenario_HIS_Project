#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}Setting up Backend Environment...${NC}"

# Check Python interactively
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed.${NC}"
    exit 1
fi

# Activate Virtual Environment
if [ -d "$SCRIPT_DIR/.venv" ]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
else
    echo -e "${RED}Error: .venv not found. Run ./setup.sh first.${NC}"
    exit 1
fi

# Clean up Port 5001
echo "Checking port 5001..."
PID=$(lsof -t -i:5001)
if [ -n "$PID" ]; then
    echo -e "${YELLOW}Killing existing process on port 5001 (PID: $PID)...${NC}"
    kill -9 $PID
fi

# Start Backend
echo -e "${GREEN}Starting Flask Backend on port 5001...${NC}"
cd "$SCRIPT_DIR/bot"
python app.py
