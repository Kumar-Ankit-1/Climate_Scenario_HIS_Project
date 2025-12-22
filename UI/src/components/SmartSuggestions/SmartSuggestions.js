import React, { useState } from 'react';
import { ArrowRight, Factory, Target, Building2, Sparkles, Lightbulb, ChevronLeft } from 'lucide-react';
import './SmartSuggestions.css';

const SmartSuggestions = ({ onBack }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = async (searchQuery = query) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setQuery(searchQuery);

        try {
            const response = await fetch('http://localhost:5001/api/parse-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (!response.ok) throw new Error('Failed to analyze query');

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAnalyze();
        }
    };

    const suggestions = [
        { text: "What happens if we ban coal power by 2030?" },
        { text: "Impact of global fleet electrification?" },
        { text: "Analyze agricultural emissions in Asia" },
        { text: "Scenario: 100% Renewable Energy in Europe" }
    ];

    return (
        <div className="ss-page-container">
            <button className="ss-back-button" onClick={onBack}>
                <ChevronLeft size={32} strokeWidth={2.5} /> Back
            </button>

            <div className="ss-content-wrapper">
                <div className="ss-header-section">
                    <h1 className="ss-greeting">
                        Hi there, <span className="ss-highlight">Climate Explorer</span>
                    </h1>
                    <h2 className="ss-sub-greeting">What would you like to know?</h2>
                    <p className="ss-instruction">
                        Use one of the most common prompts below or use your own to begin
                    </p>
                </div>

                {!results && !loading && (
                    <>
                        <div className="ss-prompt-grid">
                            {suggestions.map((item, idx) => (
                                <div key={idx} className="ss-prompt-card" onClick={() => handleAnalyze(item.text)}>
                                    <p>{item.text}</p>
                                    <span className="ss-prompt-icon">{item.icon}</span>
                                </div>
                            ))}
                        </div>

                    </>
                )}

                <div className="ss-input-container">


                    <textarea
                        className="ss-main-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder='Ask whatever you want...'
                    />

                    <div className="ss-input-footer">

                        <div className="ss-input-right">
                            <span className="ss-char-count">{query.length}/1000</span>
                            <button className="ss-send-btn" onClick={() => handleAnalyze()} disabled={loading}>
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="ss-loading">
                        <div className="spinner"></div>
                        <p>Analyzing your query...</p>
                    </div>
                )}

                {results && (
                    <div className="ss-results-container">
                        <div className="results-grid">
                            <div className="result-card featured-card">
                                <h3 className="card-title">
                                    <Factory size={22} className="card-icon" /> Industries & Strategy
                                </h3>
                                <div className="industry-tags">
                                    {results.relevant_industries?.map((ind, idx) => (
                                        <span key={idx} className="industry-tag">{ind.industry}</span>
                                    ))}
                                </div>
                                <div className="strategy-box">
                                    <div className="strategy-header">
                                        <Target size={18} /> <strong>Strategy Analysis</strong>
                                    </div>
                                    <p>{results.variable_selection_strategy?.selection_basis}</p>
                                    <p style={{ marginTop: '10px', fontSize: '0.85rem' }}>{results.variable_selection_strategy?.notes}</p>
                                </div>
                            </div>

                            <div className="result-card">
                                <h3 className="card-title">
                                    <Building2 size={20} className="card-icon" /> Relevant Sectors
                                </h3>
                                {results.relevant_sectors?.map((sector, idx) => (
                                    <div key={idx} className="sector-item">
                                        <div className="sector-header">
                                            <span className="sector-name">{sector.sector}</span>
                                            <span className="confidence-badge">{(sector.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <p className="rationale">{sector.rationale}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="result-card">
                                <h3 className="card-title">
                                    <Sparkles size={20} className="card-icon" /> Recommended Variables
                                </h3>
                                {results.missing_or_suggested_concepts?.map((concept, idx) => (
                                    <div key={idx} className="concept-item">
                                        <div className="concept-header">
                                            <Lightbulb size={16} className="concept-icon" />
                                            <span className="concept-name">{concept.concept}</span>
                                        </div>
                                        <span className="concept-reason">{concept.reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button className="ss-clear-btn" onClick={() => { setResults(null); setQuery(''); }}>Ask Another Question</button>
                    </div>
                )}

                {error && <div className="ss-error">{error}</div>}
            </div>
        </div>
    );
};

export default SmartSuggestions;
