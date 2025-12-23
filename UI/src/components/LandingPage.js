import React, { useState, useRef, useEffect } from 'react';
import { Rocket, Wrench, Brain, Map, BarChart3, ArrowRight, Sparkles } from 'lucide-react';

const LandingPage = ({ onStart, onManual, onSmartSuggestions }) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const requestRef = useRef();

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (requestRef.current) return;
            requestRef.current = requestAnimationFrame(() => {
                setMousePosition({ x: e.clientX, y: e.clientY });
                requestRef.current = null;
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Spotlight effect helper
    // Spotlight effect helper
    const SpotlightCard = ({ children, className = "", onClick }) => {
        const divRef = useRef(null);

        const handleMouseMove = (e) => {
            if (!divRef.current) return;
            const rect = divRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            divRef.current.style.setProperty('--x', `${x}px`);
            divRef.current.style.setProperty('--y', `${y}px`);
        };

        return (
            <div
                ref={divRef}
                onClick={onClick}
                onMouseMove={handleMouseMove}
                className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl transition-all duration-300 group ${className}`}
            >
                <div className="relative h-full z-10">{children}</div>
                <div
                    className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30"
                    style={{
                        background: `radial-gradient(600px circle at var(--x) var(--y), rgba(255, 255, 255, 0.08), transparent 40%)`,
                    }}
                />
            </div>
        );
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center p-6 text-white isolate selection:bg-indigo-500/30">
            {/* Dynamic Background */}
            {/* Dynamic Background - Optimized with Transform (GPU) */}
            <div
                className="pointer-events-none fixed top-0 left-0 w-[600px] h-[600px] rounded-full z-0 opacity-40 blur-[80px]"
                style={{
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)',
                    transform: `translate3d(${mousePosition.x - 300}px, ${mousePosition.y - 300}px, 0)`,
                    transition: 'transform 0.1s ease-out'
                }}
            />
            <div className="fixed inset-0 z-[-1]">
                <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-indigo-600/20 rounded-full blur-[120px] animate-[pulse_6s_infinite]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-[pulse_7s_infinite] delay-1000" />
                <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left Column: Hero Text & Main Actions */}
                <div className="space-y-10 text-left order-2 lg:order-1 animate-in fade-in slide-in-from-left-8 duration-700">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-indigo-300 mb-4 cursor-default hover:bg-white/10 transition-colors">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        AI-Powered Climate Analytics
                    </div>

                    {/* Headline */}
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                            <span className="block text-white">Master Your</span>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                                Climate Strategy
                            </span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
                            Navigate complex scenarios with our intelligent assistant.
                            From raw data to actionable insights in seconds.
                        </p>
                    </div>

                    {/* Buttons - Redesigned */}
                    <div className="flex flex-col sm:flex-row gap-5">
                        <button
                            onClick={onStart}
                            className="group relative px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-indigo-500/25 flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <Rocket className="w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                            <span>Start Analysis</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        </button>

                        <button
                            onClick={onManual}
                            className="group relative px-8 py-5 bg-slate-800/50 hover:bg-slate-800 text-slate-200 border border-white/5 hover:border-white/10 rounded-2xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md flex items-center justify-center gap-3"
                        >
                            <Wrench className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:rotate-45 transition-all duration-300" />
                            <span>Manual Mode</span>
                        </button>
                    </div>

                    {/* Trust/Stats text */}
                    <div className="pt-4 flex items-center gap-6 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_3s_infinite]" />
                            <span className="relative flex h-2 w-2 absolute -ml-4">
                                <span className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            </span>
                            <span>Live Data Connected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-[pulse_3s_infinite]" />
                            <span className="relative flex h-2 w-2 absolute -ml-4">
                                <span className="animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            </span>
                            <span>IPCC Scenarios</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Feature Grid / Visuals */}
                <div className="order-1 lg:order-2 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">

                    {/* Feature 1: Smart Suggestions (Large) */}
                    <SpotlightCard
                        onClick={onSmartSuggestions}
                        className="md:col-span-2 p-8 cursor-pointer group border-indigo-500/20 hover:border-indigo-500/50"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300 text-indigo-400" />
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Brain className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">AI-Driven Suggestions</h3>
                        <p className="text-slate-400">
                            Unsure where to start? Our AI analyzes your intent to suggest the perfect variable & scenario mix.
                        </p>
                    </SpotlightCard>

                    {/* Feature 2: Workflow */}
                    <SpotlightCard className="p-8 group hover:bg-slate-800/60">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:rotate-3 transition-transform">
                            <Map className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mb-1">Guided Flows</h3>
                        <p className="text-sm text-slate-500">Step-by-step wizardry for complex selections.</p>
                    </SpotlightCard>

                    {/* Feature 3: Dashboard */}
                    <SpotlightCard className="p-8 group hover:bg-slate-800/60">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4 group-hover:-rotate-3 transition-transform">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 mb-1">Visual Scope</h3>
                        <p className="text-sm text-slate-500">Real-time dashboard scope visualization.</p>
                    </SpotlightCard>

                </div>
            </div>
        </div>
    );
};

export default LandingPage;
