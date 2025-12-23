import React, { useState, useEffect } from "react";
import { ClimateDataExplorer } from "../CDE/components/ClimateDataExplorer";
import { ChevronLeft } from 'lucide-react';

function ManualProcess({ onBack }) {
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
        <div className="dark relative min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden isolate">
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

            <div className="relative z-10 h-full flex flex-col">
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

                <div className="flex-1 overflow-y-auto pt-4">
                    <div className="container mx-auto px-6 py-4 max-w-[90rem]">
                        {/* Main Content - ClimateDataExplorer has its own header */}
                        <ClimateDataExplorer />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ManualProcess;
