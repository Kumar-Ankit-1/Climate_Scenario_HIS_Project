# Climate Selection Buddy (Beta)

A high-performance, AI-driven assistant for climate policy analysis and scenario configuration.

## Features
- **AI-Powered Analysis**: Instant natural language processing for complex climate queries.
- **Smart Suggestions**: Auto-detects variables and scenarios based on intent.
- **Interactive UI**: GPU-accelerated visualizations and responsive design.
- **Live Comparison**: "Compare Scenarios" tool for deep dives (Manual Mode).

## Prerequisites
- **Python**: 3.9+
- **Node.js**: 16+
- **Groq API Key**: Required for the LLM backend.

## Quick Start

1. **Clone & Setup**
   ```bash
   git clone <repo>
   cd chatbot
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```ini
   GROQ_API_KEY=your_api_key_here
   ```

3. **Launch**
   We have a unified launcher that handles everything (venv, dependencies, frontend, backend):
   ```bash
   ./start.sh
   ```

## Project Structure
- `backend/`: Flask API with modular `chat_service.py` and `suggestions.py`.
- `UI/`: React + TailwindCSS frontend.
- `db/`: Database migrations and schema.
- `etl/`: Data processing scripts.
- `training_data/`: Vector embeddings for variables/scenarios.

## Troubleshooting
- **Laggy UI?**: The latest update uses GPU acceleration. Ensure hardware acceleration is enabled in your browser.
- **Backend Error?**: Check `backend.log`. Ensure your Groq API key is valid.

## License
Private / Proprietary
