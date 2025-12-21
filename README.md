# Financial Chatbot with Groq AI

A professional chatbot application that leverages Groq's fast AI engine with React UI and Flask backend. Features real-time auto-suggestions for variables and scenarios with smart matching.

## 🚀 Features

- **React Frontend** - Modern, responsive UI with real-time suggestions
- **Flask Backend** - RESTful API with Groq integration
- **Auto-Suggestions** - Get up to 5 suggestions as you type
- **Variable & Scenario Selection** - Easy-to-use interface for selecting analysis context
- **CSV-based Knowledge Base** - Two files for variables and scenarios
- **Professional UI/UX** - Clean, modern design with smooth animations
- **CORS Support** - Full cross-origin resource sharing enabled

## 📁 Directory Structure

```
chatbot/
├── UI/                          # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.js
│   │   │   ├── ChatMessage.css
│   │   │   ├── InputArea.js
│   │   │   ├── InputArea.css
│   │   │   ├── SuggestionsList.js
│   │   │   ├── SuggestionsList.css
│   │   │   ├── SelectedItems.js
│   │   │   └── SelectedItems.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── bot/                         # Flask Backend
│   ├── app.py                   # Main Flask application with Groq integration
│   └── utils.py                 # Utility functions
│
├── training_data/               # Knowledge Base
│   ├── variables_vector.csv     # Variable definitions and descriptions
│   └── scenario_vector.csv      # Scenario definitions and descriptions
│
├── .env                         # Environment variables (API keys)
├── .venv/                       # Python Virtual Environment
├── pyproject.toml               # Python project configuration
└── README.md                    # This file
```

## 🛠️ Prerequisites

- Python 3.10 or higher
- Node.js 14 or higher
- npm or yarn
- Groq API Key (free tier available at https://console.groq.com)

## ⚙️ Installation & Setup

### 1. Clone/Setup Project

```bash
cd /Users/kumarankit/Documents/chatbot
source .venv/bin/activate
```

### 2. Install Backend Dependencies

```bash
pip install openpyxl groq flask flask-cors python-dotenv pandas
```

### 3. Configure Environment Variables

The `.env` file is already configured with your Groq API key:

```env
GROQ_API_KEY=your_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
BACKEND_PORT=5001
FRONTEND_PORT=3000
```

**Note**: Never commit `.env` file to version control. It's already in the project but only for development.

### 4. Install Frontend Dependencies

```bash
cd UI
npm install
cd ..
```

## 🚀 Running the Application

### Start Backend (Terminal 1)

```bash
source .venv/bin/activate
cd bot
python app.py
```

The backend will run on `http://localhost:5001`

### Start Frontend (Terminal 2)

```bash
cd UI
npm start
```

The frontend will run on `http://localhost:3000`

## 📊 Using the Chatbot

1. **View Suggestions**: Start typing a variable name or scenario name
2. **Select Items**: Click on suggestions to add them to your selection
3. **Manage Selection**: See selected items in the right sidebar
4. **Ask Questions**: Type your question and send to get AI-powered insights
5. **View Context**: The AI uses your selected variables and scenarios for better responses

### Example Usage

1. Type "cred" → See "credit_score" suggestion
2. Type "risk" → See "low_risk_approval", "high_risk_denial" suggestions
3. Select multiple items
4. Ask: "What factors determine approval?" → Get contextual answers based on your selections

## 📁 CSV Files Structure

### variables_vector.csv
```
Variable Name          | Description
age                    | User's age in years
income                 | Annual income in USD
credit_score          | Credit score (300-850)
... (10 total variables)
```

### scenario_vector.csv
```
Scenario Name               | Description
low_risk_approval          | Applicant with good credit and stable income
student_loan_scenario      | Young applicant with student loans
... (10 total scenarios)
```

**To add more variables/scenarios**: Edit these CSV files directly, no code changes needed!

## 🔌 API Endpoints

### Backend Endpoints (Flask)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/suggestions` | POST | Get auto-suggestions for variables/scenarios |
| `/api/chat` | POST | Chat with Groq AI |
| `/api/variables` | GET | Get all variables |
| `/api/scenarios` | GET | Get all scenarios |

### Request/Response Examples

**Chat Request:**
```json
{
  "message": "What factors matter most?",
  "history": [],
  "selected_variables": ["credit_score", "income"],
  "selected_scenarios": ["low_risk_approval"]
}
```

**Suggestions Request:**
```json
{
  "query": "cred"
}
```

## 🎨 Customization

### Change AI Model
Edit [bot/app.py](bot/app.py#L68):
```python
model="mixtral-8x7b-32768"  # Change this to another Groq model
```

Available models: `mixtral-8x7b-32768`, `llama2-70b-4096`, `gemma-7b-it`

### Add More Variables/Scenarios
1. Open `training_data/variables.xlsx` or `training_data/scenarios.xlsx`
2. Add new rows with Name and Description
3. Save and restart the backend

### Update Suggestions Count
Edit [UI/src/App.js](UI/src/App.js#L93) and [bot/app.py](bot/app.py#L42):
```python
return matches[:5]  # Change 5 to desired number
```

## 🔐 Security Notes

- API keys are stored in `.env` - never commit this file
- Frontend communicates with backend via CORS (enabled)
- All user inputs are validated on the backend
- Groq API is called server-side only

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5001 is in use
lsof -i :5001
# Kill the process if needed
kill -9 <PID>
```

### Frontend can't connect to backend
- Ensure backend is running on port 5001
- Check CORS is enabled in [bot/app.py](bot/app.py#L11)
- Check browser console for errors

### Groq API errors
- Verify API key in `.env` file
- Check API key validity at https://console.groq.com
- Ensure you have API quota remaining

### CSV file not found
```bash
# Verify files exist
ls -la training_data/
# If missing, create them using the Python script in bot/
```

## 📝 Project Info

- **Created**: December 20, 2025
- **Backend**: Flask + Groq API
- **Frontend**: React 18
- **Database**: CSV files (.csv)
- **Python Version**: 3.10+
- **Node Version**: 14+

## 🔄 Workflow

1. User types in React UI
2. React sends query to Flask backend
3. Backend fetches suggestions from CSV files
4. User selects items and sends message
5. Backend sends to Groq API with context
6. Groq returns response
7. Flask sends back to React
8. React displays message in chat

## 📚 Resources

- [Groq Console](https://console.groq.com) - Get API keys
- [Groq Models](https://console.groq.com/docs/models) - Available models
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [OpenPyXL Docs](https://openpyxl.readthedocs.io/)

## 📞 Support

For issues with:
- **Groq API**: Visit https://console.groq.com/docs
- **Flask**: Check Flask documentation
- **React**: Visit https://react.dev
- **This project**: Review the code and configuration above

---

**Enjoy building with your Financial Chatbot! 🎉**
