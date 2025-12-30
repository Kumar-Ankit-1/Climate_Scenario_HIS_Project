import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Factory, Target, Building2, Sparkles, Lightbulb, ChevronLeft, RotateCcw, Database } from 'lucide-react';

const SmartSuggestions = ({ onBack, onShowDataProviders }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const handleAnalyze = async (searchQuery = query) => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setQuery(searchQuery);

        try {
            const response = await fetch('/api/parse-query', {
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
        { text: "What happens if we ban coal power by 2030?", icon: "⚡" },
        { text: "Impact of global fleet electrification?", icon: "🚗" },
        { text: "Analyze agricultural emissions in Asia", icon: "🌾" },
        { text: "Scenario: 100% Renewable Energy in Europe", icon: "🇪🇺" }
    ];

    // Refs for connecting lines
    const containerRef = useRef(null);
    const industriesRef = useRef(null);
    const sectorsRef = useRef(null);
    const variablesRef = useRef(null);
    const buttonRef = useRef(null);
    const [connectorPaths, setConnectorPaths] = useState([]);

    useEffect(() => {
        const updatePaths = () => {
            if (!containerRef.current || !buttonRef.current || !industriesRef.current || !sectorsRef.current || !variablesRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const buttonRect = buttonRef.current.getBoundingClientRect();

            const cards = [industriesRef.current, sectorsRef.current, variablesRef.current];
            const paths = cards.map(card => {
                const cardRect = card.getBoundingClientRect();

                // Start from bottom center of card
                const startX = cardRect.left + cardRect.width / 2 - containerRect.left;
                const startY = cardRect.bottom - containerRect.top;

                // End at top center of button
                const endX = buttonRect.left + buttonRect.width / 2 - containerRect.left;
                const endY = buttonRect.top - containerRect.top;

                // Control points for a nice S-curve
                const cp1X = startX;
                const cp1Y = startY + (endY - startY) * 0.5;
                const cp2X = endX;
                const cp2Y = endY - (endY - startY) * 0.5;

                return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
            });

            setConnectorPaths(paths);
        };

        // Update on mount and resize
        updatePaths();
        window.addEventListener('resize', updatePaths);
        // Also update after a short delay to ensure layout is stable
        const timeout = setTimeout(updatePaths, 100);

        return () => {
            window.removeEventListener('resize', updatePaths);
            clearTimeout(timeout);
        };
    }, [results]);

    return (
        <div className="relative min-h-screen w-full bg-slate-950 text-white font-sans overflow-x-hidden isolate">
            {/* Interactive Background Glow */}
            <div
                className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`
                }}
            />
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000 pointer-events-none" />

            <div className="relative z-10 container mx-auto px-6 py-8 md:py-12 max-w-5xl">
                {/* Floating Back Button */}
                <div className="absolute top-6 left-6 z-50">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md rounded-full transition-all border border-white/10 hover:border-white/20 group"
                        title="Back to Home"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="text-center space-y-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                        Hi there, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">Climate Explorer</span>
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-bold text-indigo-300">What would you like to know?</h2>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Use one of the most common prompts below or use your own to begin
                    </p>
                </div>

                {!results && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        {suggestions.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleAnalyze(item.text)}
                                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm flex justify-between items-center"
                            >
                                <p className="font-medium text-slate-200 group-hover:text-white transition-colors">{item.text}</p>
                                <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">{item.icon}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative w-full max-w-4xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-1.5 border border-white/10 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask whatever you want..."
                            className="w-full h-32 p-6 bg-transparent border-none outline-none text-lg text-white placeholder:text-slate-500 resize-none rounded-2xl"
                        />
                        <div className="flex justify-between items-center px-4 pb-2">
                            <span className="text-xs font-bold text-slate-600 pl-2">{query.length}/1000</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setResults(null); setQuery(''); }}
                                    className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                                    title="Reset"
                                >
                                    <RotateCcw size={20} />
                                </button>
                                <button
                                    onClick={() => handleAnalyze()}
                                    disabled={loading || !query.trim()}
                                    className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-12 animate-pulse">
                        <div className="inline-block w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 font-medium">Analyzing your query...</p>
                    </div>
                )}

                {results && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative" ref={containerRef}>

                        {/* SVG Connectors Layer (Visible only on lg screens) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block overflow-visible">
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgba(99, 102, 241, 0.1)" />
                                    <stop offset="50%" stopColor="rgba(99, 102, 241, 0.4)" />
                                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0.1)" />
                                </linearGradient>
                            </defs>
                            {connectorPaths.map((path, i) => (
                                <path
                                    key={i}
                                    d={path}
                                    fill="none"
                                    stroke="url(#lineGradient)"
                                    strokeWidth="2"
                                    className="animate-[pulse_3s_infinite]"
                                />
                            ))}
                        </svg>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {/* Industries Card */}
                            <div ref={industriesRef} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 lg:col-span-1 shadow-xl">
                                <h3 className="flex items-center gap-2 text-xl font-bold text-indigo-400 mb-6">
                                    <Factory size={22} /> Industries & Strategy
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {results.relevant_industries?.map((ind, idx) => (
                                        <span key={idx} className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                                            {ind.industry}
                                        </span>
                                    ))}
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2 text-slate-200 font-bold mb-2">
                                        <Target size={18} className="text-pink-400" /> Strategy Analysis
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{results.variable_selection_strategy?.selection_basis}</p>
                                    <p className="text-slate-500 text-xs italic border-t border-white/5 pt-2">{results.variable_selection_strategy?.notes}</p>
                                </div>
                            </div>

                            {/* Sectors Card */}
                            <div ref={sectorsRef} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                                <h3 className="flex items-center gap-2 text-xl font-bold text-blue-400 mb-6">
                                    <Building2 size={20} /> Relevant Sectors
                                </h3>
                                <div className="space-y-4">
                                    {results.relevant_sectors?.map((sector, idx) => (
                                        <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-slate-200">{sector.sector}</span>
                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                                    {(sector.confidence * 100).toFixed(0)}% Match
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400">{sector.rationale}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Variables Card */}
                            <div ref={variablesRef} className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 shadow-xl">
                                <h3 className="flex items-center gap-2 text-xl font-bold text-purple-400 mb-6">
                                    <Sparkles size={20} /> Recommended Variables
                                </h3>
                                <div className="space-y-4">
                                    {(results.suggested_variables || results.missing_or_suggested_concepts)?.slice(0, 5).map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex gap-2 min-w-0">
                                                    <Lightbulb size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                                                    <span className="font-bold text-slate-200 text-sm break-words leading-tight">
                                                        {item.variable || item.concept}
                                                    </span>
                                                </div>
                                                {item.relevance && (
                                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                                                        {(item.relevance * 100).toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed pl-6">
                                                {item.reason}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 relative z-10">
                            <button
                                ref={buttonRef}
                                onClick={() => {
                                    if (onShowDataProviders && results) {
                                        const sector = results.relevant_sectors?.[0]?.sector;
                                        const variables = results.suggested_variables?.map(v => v.variable).filter(Boolean);
                                        onShowDataProviders({
                                            sector,
                                            variables
                                        });
                                    }
                                }}
                                className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-indigo-500/25 flex items-center gap-3 overflow-hidden"
                            >
                                <Database className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                <span>Show Data Providers</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="max-w-md mx-auto mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-center text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartSuggestions;
