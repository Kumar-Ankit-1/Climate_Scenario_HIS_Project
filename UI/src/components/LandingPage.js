import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onStart, onManual }) => {
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

                <div className="cta-group" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button className="cta-button" onClick={onStart}>
                        Start Analysis 🚀
                    </button>
                    <button className="cta-button cta-button-secondary" onClick={onManual} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255,255,255,0.5)', color: 'white' }}>
                        Manual Selection 🛠️
                    </button>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <span className="feature-icon">🧠</span>
                        <h3>Smart Suggestions</h3>
                        <p>Type naturally and let our AI suggest the most relevant climate variables and scenarios for you.</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">🗺️</span>
                        <h3>Guided Workflow</h3>
                        <p>A step-by-step wizard helps you define your region, time period, and scope effortlessly.</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">📊</span>
                        <h3>Mission Control</h3>
                        <p>Visualize your selection in real-time with our dynamic dashboard before launching your analysis.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
