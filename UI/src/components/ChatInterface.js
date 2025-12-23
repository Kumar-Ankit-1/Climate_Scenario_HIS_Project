import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, ChevronLeft, Globe } from 'lucide-react';
import ChatMessage from './ChatMessage';
import InputArea from './InputArea';
import SuggestionsList from './SuggestionsList';
import SelectedItems from './SelectedItems';

const API_BASE_URL = '/api';

function ChatInterface({ onBack, onCompare }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState({ variables: [], scenarios: [] });
    const [selectedVariables, setSelectedVariables] = useState([]);
    const [selectedScenarios, setSelectedScenarios] = useState([]);
    const [contextData, setContextData] = useState({ region: null, start_date: null, end_date: null });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const suggestionsTimeoutRef = useRef(null);
    // Generate unique session ID on mount
    const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substr(2, 9));
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null); // Ref for the scroll container

    // Auto-scroll to bottom
    const scrollToBottom = (behavior = 'smooth') => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            // Use scrollTo for more control than scrollIntoView which can shift the whole page
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: behavior
            });
        }
    };

    React.useLayoutEffect(() => {
        // Auto-scroll on new messages
        scrollToBottom('smooth');
    }, [messages, loading]);

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
            // Non-blocking error, don't show to user unless critical
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

        // Add user message to chat immediately using functional update
        setMessages(prev => [...prev, messageToSend]);
        setInput('');
        setSuggestions({ variables: [], scenarios: [] });
        setShowSuggestions(false);
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/chat`, {
                message: userMessage,
                history: messages,
                selected_variables: selectedVariables,
                selected_scenarios: selectedScenarios,
                session_id: sessionId
            });

            if (response.data.success) {
                const botMessage = {
                    role: 'assistant',
                    content: response.data.response
                };
                setMessages(prev => [...prev, botMessage]);

                // Sync Backend State
                if (response.data.context_data) {
                    console.log('[ChatInterface] Received context_data:', response.data.context_data);
                    setContextData(prev => ({
                        ...prev,
                        ...response.data.context_data
                    }));
                    console.log('[ChatInterface] Updated contextData state');
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
                content: `Error: Unable to connect to the server (${error.message}). Checking /api/health...`
            };
            setMessages(prev => [...prev, errorMessage]);

            // Try health check to give better feedback
            try {
                await axios.get('/api/health');
                setMessages(prev => [...prev, { role: 'assistant', content: 'Update: Server is reachable. Retrying...' }]);
            } catch (hError) {
                // Ignore health check error
            }
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
            await axios.post(`${API_BASE_URL}/reset`, { session_id: sessionId });
            setMessages([]); // Clear messages to go back to start screen
            setSuggestions({ variables: [], scenarios: [] });
            setInput('');
            setSelectedVariables([]);
            setSelectedScenarios([]);
            setContextData({ region: null, start_date: null, end_date: null });
            setIsMobileMenuOpen(false); // Close mobile menu on reset
        } catch (error) {
            console.error('Error resetting flow:', error);
        }
    };



    return (
        <div className="relative flex h-screen bg-slate-950 text-white font-sans overflow-hidden isolate">
            {/* Ambient Background Blobs - Simplified */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />


            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative w-full min-w-0 z-10 bg-transparent">
                {/* Header */}
                <header className="h-16 border-b border-white/10 bg-slate-950/50 backdrop-blur-md flex items-center px-6 justify-between shrink-0 z-50">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/20 group mr-2"
                                title="Back to Home"
                            >
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                            </button>
                        )}
                        <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-indigo-400">
                                <Globe className="w-5 h-5" strokeWidth={2} />
                            </div>
                            Climate Selection Buddy
                            <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">Beta</span>
                        </h1>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden p-2 text-indigo-400 hover:bg-white/5 rounded-md transition-colors"
                    >
                        <span className="sr-only">Toggle menu</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </header>

                {/* View Container */}
                <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">

                    {/* Scrollable Area */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth px-4 py-8 min-h-0">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-full">
                                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-white">
                                        Hi there, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Climate Explorer</span>
                                    </h1>
                                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-400 mb-4 drop-shadow-sm">
                                        What would you like to know?
                                    </h2>
                                    <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                                        Select variables, scenarios, or type a custom query to begin your analysis.
                                    </p>
                                </div>

                                {/* Input Box in Empty State - Centered */}
                                <div className="w-full max-w-3xl mx-auto relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                                    <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/10 group focus-within:border-indigo-500/50 transition-colors overflow-hidden">
                                        <textarea
                                            value={input}
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                if (e.target.value.length > 1000) {
                                                    setInput(e.target.value.slice(0, 1000));
                                                }
                                            }}
                                            placeholder="Type variable, scenario, or question..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage(e);
                                                }
                                            }}
                                            className="w-full h-16 px-5 py-4 resize-none outline-none text-lg text-white placeholder:text-slate-500 font-medium bg-transparent"
                                        />
                                        <div className="flex items-center justify-between px-5 pb-3">
                                            <span className="text-xs text-slate-500 font-bold">{input.length}/1000</span>
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!input.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Suggestions Dropdown - Opens BELOW input */}
                                    {showSuggestions && (suggestions.variables.length > 0 || suggestions.scenarios.length > 0) && (
                                        <div className="mt-3 bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-xl z-50 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">
                                            <SuggestionsList
                                                variables={suggestions.variables}
                                                scenarios={suggestions.scenarios}
                                                onSelectVariable={handleSelectVariable}
                                                onSelectScenario={handleSelectScenario}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-6 w-full pb-6">
                                {messages.map((message, index) => (
                                    <ChatMessage key={index} message={message} />
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 p-4 text-slate-400 text-sm animate-pulse">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        Thinking...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Input Area Wrapper - Only shown when there are messages */}
                    {messages.length > 0 && (
                        <div className="shrink-0 p-4 border-t border-white/10 bg-slate-950/80 backdrop-blur-md mt-auto z-20">
                            <div className="max-w-3xl mx-auto relative">
                                <InputArea
                                    input={input}
                                    onInputChange={handleInputChange}
                                    onSendMessage={handleSendMessage}
                                    onReset={handleResetFlow}
                                    loading={loading}
                                    showSuggestions={showSuggestions && (suggestions.variables.length > 0 || suggestions.scenarios.length > 0)}
                                    suggestionsComponent={
                                        showSuggestions && (suggestions.variables.length > 0 || suggestions.scenarios.length > 0) ? (
                                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900/90 backdrop-blur-xl shadow-xl border border-white/10 rounded-lg max-h-60 overflow-y-auto z-10 custom-scrollbar">
                                                <SuggestionsList
                                                    variables={suggestions.variables}
                                                    scenarios={suggestions.scenarios}
                                                    onSelectVariable={handleSelectVariable}
                                                    onSelectScenario={handleSelectScenario}
                                                />
                                            </div>
                                        ) : null
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Persistent Right Sidebar (Desktop) / Drawer (Mobile) */}
            <div className={`
                fixed inset-y-0 right-0 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
                lg:translate-x-0 lg:static lg:shadow-none lg:z-auto
            `}>
                <div className="h-full flex flex-col relative">
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <SelectedItems
                        variables={selectedVariables}
                        scenarios={selectedScenarios}
                        contextData={contextData}
                        onRemoveVariable={handleRemoveVariable}
                        onRemoveScenario={handleRemoveScenario}
                        onClear={handleClearChat}
                        onCompare={onCompare}
                    />
                </div>
            </div>

            {/* Mobile Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}

export default ChatInterface;

