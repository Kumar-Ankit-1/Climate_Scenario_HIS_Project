#!/bin/bash

# Financial Chatbot - Setup Script
# This script sets up both backend and frontend dependencies

echo "🔧 Setting up Financial Chatbot..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Setup Python Virtual Environment and Install Dependencies
echo -e "${BLUE}Step 1: Setting up Python environment...${NC}"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

echo -e "${BLUE}Step 2: Installing Python dependencies...${NC}"
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# 2. Setup React Frontend
echo -e "${BLUE}Step 3: Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/UI"

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install -q
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi
echo ""

# 3. Verify CSV files
echo -e "${BLUE}Step 4: Verifying training data...${NC}"
cd "$SCRIPT_DIR"

if [ -f "training_data/variables_vector.csv" ] && [ -f "training_data/scenario_vector.csv" ]; then
    echo -e "${GREEN}✓ CSV files found${NC}"
else
    echo "⚠️  CSV files not found. Please ensure they exist in training_data/"
fi
echo ""

# 4. Check .env file
echo -e "${BLUE}Step 5: Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    if grep -q "GROQ_API_KEY" .env; then
        echo -e "${GREEN}✓ .env file configured${NC}"
    else
        echo "⚠️  GROQ_API_KEY not found in .env"
    fi
else
    echo "⚠️  .env file not found"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📖 Next steps:"
echo "1. Review the README.md for detailed instructions"
echo "2. Run './start.sh' to start the application"
echo "3. Or start manually:"
echo "   - Backend:  source .venv/bin/activate && python bot/app.py (Port 5001)"
echo "   - Frontend: cd UI && npm start"
echo ""
