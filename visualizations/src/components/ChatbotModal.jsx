import { useState, useEffect, useRef } from "react";

const STAGES = {
  QUERY: "query",
  VARIABLE: "variable",
  SCENARIO: "scenario",
  SCENARIO_CHOICE: "scenario_choice",
  SCENARIO_SEARCH: "scenario_search",
  REGION: "region",
  START_YEAR: "start_year",
  END_YEAR: "end_year",
  COMPLETE: "complete"
};

const MessageType = {
  ASSISTANT: "assistant",
  USER: "user"
};

export default function ChatbotModal({ isOpen, onClose, onComplete }) {
  const [stage, setStage] = useState(STAGES.QUERY);
  const [inputValue, setInputValue] = useState("");
  const [selectedVariable, setSelectedVariable] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [region, setRegion] = useState("Global");
  const [startYear, setStartYear] = useState("2020");
  const [endYear, setEndYear] = useState("2100");
  
  const [variables, setVariables] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [originalQuery, setOriginalQuery] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          type: MessageType.ASSISTANT,
          text: "Hi! I'm your climate data assistant. How can I help you find the right climate scenario data today?",
          timestamp: new Date()
        }
      ]);
      setStage(STAGES.QUERY);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setMessages([]);
      setInputValue("");
      setSelectedVariable(null);
      setSelectedScenario(null);
      setRegion("Global");
      setStartYear("2020");
      setEndYear("2100");
      setVariables([]);
      setScenarios([]);
      setOriginalQuery("");
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]);

  const addMessage = (type, text) => {
    setMessages(prev => [...prev, { type, text, timestamp: new Date() }]);
  };

  const fetchWithTimeout = async (url, options, timeout = 60000) => {
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. Please try again with a different query.");
      }
      throw error;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    addMessage(MessageType.USER, userMessage);
    setInputValue("");
    setLoading(true);

    try {
      if (stage === STAGES.QUERY) {
        setOriginalQuery(userMessage);
        addMessage(MessageType.ASSISTANT, "🤖 Parsing your query with AI...");

        const res = await fetchWithTimeout("http://localhost:8000/chatbot/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userMessage })
        }, 60000);

        if (!res.ok) throw new Error("Failed to process query");

        const data = await res.json();
        const vars = data.variables || [];
        setVariables(vars);
        
        if (vars.length > 0) {
          addMessage(
            MessageType.ASSISTANT,
            `✓ Found ${vars.length} variable${vars.length > 1 ? 's' : ''} matching your query.\n\nTop variable matches:\n${"=".repeat(50)}`
          );
          setStage(STAGES.VARIABLE);
        } else {
          addMessage(
            MessageType.ASSISTANT,
            "I couldn't find any variables matching your query. Could you try rephrasing or provide more details?"
          );
        }
      } else if (stage === STAGES.VARIABLE) {
        if (userMessage === "0") {
          addMessage(MessageType.ASSISTANT, "Enter new search keywords for variables:");
          setStage(STAGES.QUERY);
          setVariables([]);
          setLoading(false);
          return;
        }

        const numChoice = parseInt(userMessage);
        let selectedVar = null;

        if (!isNaN(numChoice) && numChoice > 0) {
          if (numChoice <= 8 && numChoice <= variables.length) {
            selectedVar = variables[numChoice - 1];
          } else if (numChoice > 8 && numChoice <= variables.length) {
            selectedVar = variables[numChoice - 1];
          }
        } else {
          selectedVar = variables.find(
            v => (v.id || v.text || v).toLowerCase() === userMessage.toLowerCase()
          );
        }

        if (selectedVar) {
          setSelectedVariable(selectedVar);
          const varText = selectedVar.id || selectedVar.text || selectedVar;
          addMessage(MessageType.ASSISTANT, `Selected: ${varText}`);
          addMessage(MessageType.ASSISTANT, "🤖 Searching for scenarios...");

          const res = await fetchWithTimeout("http://localhost:8000/chatbot/scenarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: originalQuery,
              variable: varText
            })
          }, 60000);

          if (!res.ok) throw new Error("Failed to fetch scenarios");

          const data = await res.json();
          const scens = data.scenarios || [];
          setScenarios(scens);

          if (scens.length > 0) {
            addMessage(
              MessageType.ASSISTANT,
              `Top scenario matches:\n${"=".repeat(50)}`
            );
            setStage(STAGES.SCENARIO);
          } else {
            addMessage(MessageType.ASSISTANT, "No scenarios found. Type '0' to search again or go back.");
          }
        } else {
          addMessage(MessageType.ASSISTANT, "Invalid selection. Please try again.");
        }
      } else if (stage === STAGES.SCENARIO) {
        if (userMessage === "0") {
          addMessage(MessageType.ASSISTANT, "Do you want to:\n1. Search for scenarios with new keywords\n2. Go back and change variable\n\nType 1 or 2:");
          setStage(STAGES.SCENARIO_CHOICE);
          setLoading(false);
          return;
        }

        const numChoice = parseInt(userMessage);
        let selectedScen = null;

        if (!isNaN(numChoice) && numChoice > 0) {
          if (numChoice <= scenarios.length) {
            selectedScen = scenarios[numChoice - 1];
          }
        } else {
          selectedScen = scenarios.find(
            s => (s.id || s.text || s).toLowerCase() === userMessage.toLowerCase()
          );
        }

        if (selectedScen) {
          setSelectedScenario(selectedScen);
          const scenText = selectedScen.id || selectedScen.text || selectedScen;
          addMessage(MessageType.ASSISTANT, `Selected: ${scenText}`);
          addMessage(MessageType.ASSISTANT, "Enter REGION (default: 'Global'):");
          setStage(STAGES.REGION);
        } else {
          addMessage(MessageType.ASSISTANT, "Invalid selection. Please try again or type '0' to search again.");
        }
      } else if (stage === STAGES.SCENARIO_CHOICE) {
        if (userMessage === "1") {
          addMessage(MessageType.ASSISTANT, "🔍 Enter new search keywords for scenarios:");
          setStage(STAGES.SCENARIO_SEARCH);
        } else if (userMessage === "2") {
          setSelectedVariable(null);
          setVariables([]);
          addMessage(MessageType.ASSISTANT, "Going back to variable selection...");
          addMessage(MessageType.ASSISTANT, `Top variable matches:\n${"=".repeat(50)}`);
          setStage(STAGES.VARIABLE);
        } else {
          addMessage(MessageType.ASSISTANT, "Please type 1 or 2.");
        }
      } else if (stage === STAGES.SCENARIO_SEARCH) {
        addMessage(MessageType.ASSISTANT, "🤖 Searching for scenarios...");
        const res = await fetchWithTimeout("http://localhost:8000/chatbot/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userMessage,
            variable: selectedVariable?.id || selectedVariable?.text || selectedVariable
          })
        }, 60000);

        if (!res.ok) throw new Error("Failed to fetch scenarios");

        const data = await res.json();
        const scens = data.scenarios || [];
        setScenarios(scens);

        if (scens.length > 0) {
          addMessage(MessageType.ASSISTANT, `Top scenario matches:\n${"=".repeat(50)}`);
          setStage(STAGES.SCENARIO);
        } else {
          addMessage(MessageType.ASSISTANT, "No scenarios found. Please try again.");
        }
      } else if (stage === STAGES.REGION) {
        setRegion(userMessage || "Global");
        addMessage(MessageType.ASSISTANT, `Region: ${userMessage || "Global"}`);
        addMessage(MessageType.ASSISTANT, "Start year (default 2020):");
        setStage(STAGES.START_YEAR);
      } else if (stage === STAGES.START_YEAR) {
        const year = userMessage.trim() || "2020";
        setStartYear(year);
        addMessage(MessageType.ASSISTANT, `Start year: ${year}`);
        addMessage(MessageType.ASSISTANT, "End year (default 2100):");
        setStage(STAGES.END_YEAR);
      } else if (stage === STAGES.END_YEAR) {
        const year = userMessage.trim() || "2100";
        setEndYear(year);
        addMessage(MessageType.ASSISTANT, `End year: ${year}`);
        addMessage(MessageType.ASSISTANT, "Generating your plot...");

        const res = await fetchWithTimeout("http://localhost:8000/chatbot/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variable: selectedVariable,
            scenario: selectedScenario,
            region: region,
            start_year: parseInt(startYear),
            end_year: parseInt(endYear)
          })
        }, 60000);

        const data = await res.json();
        if (data.success) {
          addMessage(MessageType.ASSISTANT, "✓ Plot generated successfully! Check the output folder.");
          setStage(STAGES.COMPLETE);
          if (onComplete) onComplete(data);
        } else {
          addMessage(MessageType.ASSISTANT, `Error: ${data.error || "Failed to generate plot"}`);
        }
      }
    } catch (err) {
      if (err.message.includes("timed out")) {
        addMessage(MessageType.ASSISTANT, `⏱️ ${err.message}`);
      } else {
        addMessage(MessageType.ASSISTANT, "Sorry, something went wrong. Please try again.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  const renderOptions = () => {
    if (stage === STAGES.VARIABLE && variables.length > 0) {
      const displayed = variables.slice(0, 8);
      const alternatives = variables.slice(8, 13);
      
      return (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {displayed.map((v, idx) => {
            const varText = v.id || v.text || v;
            return (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(String(idx + 1));
                  setTimeout(() => handleSend(), 100);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  background: "rgba(139, 92, 246, 0.15)",
                  color: "#e0e7ff",
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.6)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(139, 92, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(139, 92, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ flex: 1 }}>{varText}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
          {alternatives.length > 0 && (
            <>
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
                  Alternative options:
                </div>
                {alternatives.map((v, idx) => {
                  const varText = v.id || v.text || v;
                  return (
                    <button
                      key={idx + 8}
                      onClick={() => {
                        setInputValue(String(idx + 9));
                        setTimeout(() => handleSend(), 100);
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        background: "rgba(139, 92, 246, 0.1)",
                        color: "#cbd5e1",
                        fontSize: 13,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6" }}>{idx + 9}.</span>
                      <span style={{ flex: 1 }}>{varText}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <button
            onClick={() => {
              setInputValue("0");
              setTimeout(() => handleSend(), 100);
            }}
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#fca5a5",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
          >
            Type '0' to search again with different keywords
          </button>
        </div>
      );
    }
    if (stage === STAGES.SCENARIO && scenarios.length > 0) {
      const displayed = scenarios.slice(0, 8);
      const alternatives = scenarios.slice(8, 13);
      
      return (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {displayed.map((s, idx) => {
            const scenText = s.id || s.text || s;
            return (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(String(idx + 1));
                  setTimeout(() => handleSend(), 100);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  background: "rgba(139, 92, 246, 0.15)",
                  color: "#e0e7ff",
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 92, 246, 0.25)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.6)";
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(139, 92, 246, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(139, 92, 246, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(139, 92, 246, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ flex: 1 }}>{scenText}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
                  <path
                    d="M5 12h14M12 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
          {alternatives.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
                Alternative options:
              </div>
              {alternatives.map((s, idx) => {
                const scenText = s.id || s.text || s;
                return (
                  <button
                    key={idx + 8}
                    onClick={() => {
                      setInputValue(String(idx + 9));
                      setTimeout(() => handleSend(), 100);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      background: "rgba(139, 92, 246, 0.1)",
                      color: "#cbd5e1",
                      fontSize: 13,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6" }}>{idx + 9}.</span>
                    <span style={{ flex: 1 }}>{scenText}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={() => {
              setInputValue("0");
              setTimeout(() => handleSend(), 100);
            }}
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#fca5a5",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
          >
            Type '0' to search again with different keywords
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          height: "85vh",
          maxHeight: 700,
          background: "#1e293b",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "#8b5cf6",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Climate Data Assistant
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "rgba(255, 255, 255, 0.9)",
                marginTop: 2,
              }}
            >
              Powered by RAG
            </p>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#0f172a",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                flexDirection: msg.type === MessageType.USER ? "row-reverse" : "row",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: msg.type === MessageType.USER ? "#8b5cf6" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {msg.type === MessageType.USER ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="#8b5cf6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <div
                style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: msg.type === MessageType.USER ? "#8b5cf6" : "#334155",
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {msg.text}
                {msg.type === MessageType.ASSISTANT && renderOptions()}
              </div>
            </div>
          ))}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "#334155",
                  color: "#fff",
                  fontSize: 14,
                }}
              >
                <span style={{ display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }}>
                  Thinking...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            background: "#1e293b",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about climate data..."
            disabled={loading}
            style={{
              flex: 1,
              padding: "14px 18px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "#0f172a",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.5)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139, 92, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: loading || !inputValue.trim() 
                ? "rgba(139, 92, 246, 0.3)" 
                : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              border: "none",
              color: "#fff",
              cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              boxShadow: loading || !inputValue.trim()
                ? "none"
                : "0 4px 12px rgba(139, 92, 246, 0.4)",
            }}
            onMouseEnter={(e) => {
              if (!loading && inputValue.trim()) {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(139, 92, 246, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = loading || !inputValue.trim()
                ? "none"
                : "0 4px 12px rgba(139, 92, 246, 0.4)";
            }}
          >
            {loading ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="32"
                  strokeDashoffset="32"
                  opacity="0.3"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="32"
                  strokeDashoffset="24"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(139, 92, 246, 0.5), 0 0 0 0 rgba(139, 92, 246, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1001,
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1) rotate(90deg)";
          e.currentTarget.style.background = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.6), 0 0 0 4px rgba(139, 92, 246, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          e.currentTarget.style.background = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(139, 92, 246, 0.5), 0 0 0 0 rgba(139, 92, 246, 0.4)";
        }}
        title="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

