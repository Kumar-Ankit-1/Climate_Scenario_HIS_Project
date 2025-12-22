import React from 'react';
import { Rocket, Wrench, Brain, Map, BarChart3 } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onStart, onManual, onSmartSuggestions }) => {
    return (
        <div className="landing-page">
            <div className="bg-shape shape-1"></div>
            <div className="bg-shape shape-2"></div>
            <div className="bg-shape shape-3"></div>

            <div className="landing-content">
                <h1 className="hero-title">Climate Selection Buddy</h1>
                <p className="hero-subtitle">
                    Unlock AI-powered insights for climate scenario analysis.<br />
                    Explore regions, variables, and scenarios with intelligent guidance.
                </p>

                <div className="cta-group">
                    <button className="cta-button" onClick={onStart}>
                        Start Analysis <Rocket size={20} strokeWidth={2.5} />
                    </button>
                    <button className="cta-button cta-button-secondary" onClick={onManual}>
                        Manual Selection <Wrench size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="features-grid">
                    <div
                        className="feature-card"
                        onClick={onSmartSuggestions}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    >
                        <div className="feature-icon-wrapper">
                            <Brain size={48} color="#f472b6" strokeWidth={1.5} />
                        </div>
                        <h3>Smart Suggestions</h3>
                        <p>Type naturally and let our AI suggest the most relevant climate variables and scenarios for you.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <Map size={48} color="#60a5fa" strokeWidth={1.5} />
                        </div>
                        <h3>Guided Workflow</h3>
                        <p>A step-by-step wizard helps you define your region, time period, and scope effortlessly.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <BarChart3 size={48} color="#a78bfa" strokeWidth={1.5} />
                        </div>
                        <h3>Mission Control</h3>
                        <p>Visualize your selection in real-time with our dynamic dashboard before launching your analysis.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default LandingPage;
