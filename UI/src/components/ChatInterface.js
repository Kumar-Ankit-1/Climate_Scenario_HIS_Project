import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import SuggestionsList from './SuggestionsList';
import SelectedItems from './SelectedItems';

const API_BASE_URL = 'http://localhost:5001/api';

function ChatInterface({ onBack }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState({ variables: [], scenarios: [] });
    const [selectedVariables, setSelectedVariables] = useState([]);
    const [selectedScenarios, setSelectedScenarios] = useState([]);
    const [contextData, setContextData] = useState({ region: null, start_date: null, end_date: null });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch suggestions as user types
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        // Clear previous timeout
        if (suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current);
        }

        // Set new timeout for debounced search
        if (value.length > 0) {
            setShowSuggestions(true);
            suggestionsTimeoutRef.current = setTimeout(() => {
                fetchSuggestions(value);
            }, 150);
        } else {
            setSuggestions({ variables: [], scenarios: [] });
            setShowSuggestions(false);
        }
    };

    const fetchSuggestions = async (query) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/suggestions`, {
                query: query
            });
            setSuggestions(response.data);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    };

    const handleSelectVariable = (variable) => {
        const varName = variable.name;
        if (!selectedVariables.includes(varName)) {
            setSelectedVariables([...selectedVariables, varName]);
        }
        setInput('');
        setSuggestions({ variables: [], scenarios: [] });
        setShowSuggestions(false);
    };

    const handleSelectScenario = (scenario) => {
        const scenarioName = scenario.name;
        if (!selectedScenarios.includes(scenarioName)) {
            setSelectedScenarios([...selectedScenarios, scenarioName]);
        }
        setInput('');
        setSuggestions({ variables: [], scenarios: [] });
        setShowSuggestions(false);
    };

    const handleRemoveVariable = (variable) => {
        setSelectedVariables(selectedVariables.filter(v => v !== variable));
    };

    const handleRemoveScenario = (scenario) => {
        setSelectedScenarios(selectedScenarios.filter(s => s !== scenario));
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!input.trim() && selectedVariables.length === 0 && selectedScenarios.length === 0) {
            return;
        }

        const userMessage = input.trim() || 'Analyze with selected variables and scenarios';
        const messageToSend = {
            role: 'user',
            content: userMessage
        };

        // Add user message to chat
        setMessages([...messages, messageToSend]);
        setInput('');
        setSuggestions({ variables: [], scenarios: [] });
        setShowSuggestions(false);
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/chat`, {
                message: userMessage,
                history: messages,
                selected_variables: selectedVariables,
                selected_scenarios: selectedScenarios
            });

            if (response.data.success) {
                const botMessage = {
                    role: 'assistant',
                    content: response.data.response
                };
                setMessages(prev => [...prev, botMessage]);

                // Sync Backend State
                if (response.data.context_data) {
                    setContextData(response.data.context_data);
                }

                // Handle dynamically added items
                if (response.data.added_variables && response.data.added_variables.length > 0) {
                    setSelectedVariables(prev => {
                        const newVars = [...prev];
                        response.data.added_variables.forEach(v => {
                            if (!newVars.includes(v)) newVars.push(v);
                        });
                        return newVars;
                    });
                }
                if (response.data.added_scenarios && response.data.added_scenarios.length > 0) {
                    setSelectedScenarios(prev => {
                        const newScens = [...prev];
                        response.data.added_scenarios.forEach(s => {
                            if (!newScens.includes(s)) newScens.push(s);
                        });
                        return newScens;
                    });
                }

            } else {
                const errorMessage = {
                    role: 'assistant',
                    content: 'Error: ' + (response.data.error || 'Failed to get response')
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'Error: Unable to connect to the server. Make sure the backend is running on port 5001.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setSelectedVariables([]);
        setSelectedScenarios([]);
        setInput('');
        setContextData({ region: null, start_date: null, end_date: null });
    };

    const handleResetFlow = async () => {
        try {
            await axios.post(`${API_BASE_URL}/reset`);
            setMessages([{
                role: 'assistant',
                content: "I've reset the selection process. Please enter the **Target Region** for analysis (e.g., North America, EU, Asia-Pacific)."
            }]);
            setSuggestions({ variables: [], scenarios: [] });
            setInput('');
            setSelectedVariables([]);
            setSelectedScenarios([]);
            setContextData({ region: null, start_date: null, end_date: null });
        } catch (error) {
            console.error('Error resetting flow:', error);
        }
    };

    return (
        <div className="chat-container-wrapper">
            <header className="app-header">
                {onBack && (
                    <button className="back-btn" onClick={onBack} title="Back to Home" style={{ position: 'absolute', left: '20px', background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>
                        ←
                    </button>
                )}
                <div className="header-content">
                    <h1>💬 Climate selection buddy</h1>
                    <p>Get AI-powered insights with Groq</p>
                </div>
                <button className="reset-btn" onClick={handleResetFlow} title="Restart Guided Flow">
                    🔄 Reset Flow
                </button>
            </header>

            <div className="app-container">
                <div className="main-content">
                    <div className="chat-area">
                        <div className="messages-container">
                            {messages.length === 0 && (
                                <div className="welcome-message">
                                    <h2>Welcome to Climate selection buddy</h2>
                                    <p>Select variables and scenarios, then ask questions to get AI-powered insights.</p>
                                    <ul>
                                        <li>Start typing to get suggestions for variables and scenarios</li>
                                        <li>Select up to 5 items for better context</li>
                                        <li>Ask any climate-related questions</li>
                                    </ul>
                                </div>
                            )}
                            {messages.map((message, index) => (
                                <ChatMessage key={index} message={message} />
                            ))}
                            {loading && (
                                <div className="message bot-message loading">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <InputArea
                            input={input}
                            onInputChange={handleInputChange}
                            onSendMessage={handleSendMessage}
                            loading={loading}
                            showSuggestions={showSuggestions && (suggestions.variables.length > 0 || suggestions.scenarios.length > 0)}
                            suggestionsComponent={
                                showSuggestions && (suggestions.variables.length > 0 || suggestions.scenarios.length > 0) ? (
                                    <SuggestionsList
                                        variables={suggestions.variables}
                                        scenarios={suggestions.scenarios}
                                        onSelectVariable={handleSelectVariable}
                                        onSelectScenario={handleSelectScenario}
                                    />
                                ) : null
                            }
                        />
                    </div>

                    <SelectedItems
                        variables={selectedVariables}
                        scenarios={selectedScenarios}
                        contextData={contextData}
                        onRemoveVariable={handleRemoveVariable}
                        onRemoveScenario={handleRemoveScenario}
                        onClear={handleClearChat}
                    />
                </div>
            </div>
        </div>
    );
}

export default ChatInterface;
