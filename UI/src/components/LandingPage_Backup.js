import React, { useState, useEffect } from 'react';
import { Rocket, Wrench, Brain, Map, BarChart3, ArrowRight } from 'lucide-react';

const LandingPage = ({ onStart, onManual, onSmartSuggestions }) => {
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

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6 text-white isolate">
            {/* Interactive Background Glow */}
            <div
                className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`
                }}
            />

            {/* Ambient Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px] animate-pulse delay-1000" />

            <div className="relative z-10 max-w-5xl w-full text-center space-y-16">

                {/* Hero Section */}
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-indigo-300 mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        AI-Powered Climate Intelligence
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-400 drop-shadow-sm">
                        Climate Selection Buddy
                    </h1>

                    <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                        Unlock insights for climate scenario analysis. <br className="hidden md:block" />
                        Explore regions, variables, and scenarios with <span className="text-indigo-400 font-semibold">intelligent guidance</span>.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                        <button
                            onClick={onStart}
                            className="group relative px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/20 hover:border-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-indigo-500/20 backdrop-blur-md flex items-center gap-3 overflow-hidden"
                        >
                            <span className="relative z-10">Start Analysis</span>
                            <Rocket className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button
                            onClick={onManual}
                            className="group px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/20 hover:border-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-indigo-500/20 backdrop-blur-md flex items-center gap-3"
                        >
                            Manual Selection
                            <Wrench className="w-5 h-5 group-hover:rotate-12 transition-transform" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    {/* Smart Suggestions Card */}
                    <div
                        onClick={onSmartSuggestions}
                        className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/20 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 mb-6 inline-flex p-3 rounded-2xl bg-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform duration-300">
                            <Brain className="w-8 h-8" />
                        </div>

                        <h3 className="relative z-10 text-xl font-bold mb-3 group-hover:text-pink-300 transition-colors">Smart Suggestions</h3>
                        <p className="relative z-10 text-gray-400 leading-relaxed text-sm">
                            Type naturally and let our AI suggest the most relevant climate variables and scenarios for you.
                        </p>
                    </div>

                    {/* Guided Workflow Card */}
                    <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/20 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 mb-6 inline-flex p-3 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <Map className="w-8 h-8" />
                        </div>

                        <h3 className="relative z-10 text-xl font-bold mb-3 group-hover:text-blue-300 transition-colors">Guided Workflow</h3>
                        <p className="relative z-10 text-gray-400 leading-relaxed text-sm">
                            A step-by-step wizard helps you define your region, time period, and scope effortlessly.
                        </p>
                    </div>

                    {/* Mission Control Card */}
                    <div className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/20 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 mb-6 inline-flex p-3 rounded-2xl bg-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform duration-300">
                            <BarChart3 className="w-8 h-8" />
                        </div>

                        <h3 className="relative z-10 text-xl font-bold mb-3 group-hover:text-violet-300 transition-colors">Mission Control</h3>
                        <p className="relative z-10 text-gray-400 leading-relaxed text-sm">
                            Visualize your selection in real-time with our dynamic dashboard before launching your analysis.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
