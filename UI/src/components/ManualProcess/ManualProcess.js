import React, { useState } from "react";
import "./ManualProcess.css";

/* ---------- Scenario data (all scenarios) ---------- */

const SCENARIO_DATA = {
    SSP1: {
        id: "SSP1",
        pillTitle: "SSP1",
        pillLabel: "1 dataset",
        highlightTitle: "SSP1 – Sustainability",
        highlightSubtitle: "Green road with low challenges",
        datasets: [
            {
                title: "IIASA: SSP1 Sustainability – Green Road",
                subtitle:
                    "Low challenges to mitigation and adaptation with rapid technological progress and sustainable development.",
                tag: "SSP1-2.6"
            },
        ],
    },
    SSP2: {
        id: "SSP2",
        pillTitle: "SSP2",
        pillLabel: "1 dataset",
        highlightTitle: "SSP2 – Middle of the Road",
        highlightSubtitle:
            "Socioeconomic trends follow historical patterns with moderate challenges.",
        datasets: [
            {
                title: "IIASA: SSP2 Baseline – Middle of the Road",
                subtitle:
                    "Continuation of historical development trends with moderate challenges to mitigation and adaptation.",
                tag: "SSP2-4.5"
            },
        ],
    },
    SSP3: {
        id: "SSP3",
        pillTitle: "SSP3",
        pillLabel: "1 dataset",
        highlightTitle: "SSP3 – Regional Rivalry",
        highlightSubtitle:
            "Fragmented world with high challenges to mitigation and adaptation.",
        datasets: [
            {
                title: "IIASA: SSP3 – Regional Rivalry",
                subtitle:
                    "A world of resurgent nationalism, limited cooperation, and slow economic development.",
                tag: "SSP3-7.0"
            },
        ],
    },
    SSP4: {
        id: "SSP4",
        pillTitle: "SSP4",
        pillLabel: "1 dataset",
        highlightTitle: "SSP4 – Inequality",
        highlightSubtitle:
            "Highly unequal world with strong disparities in mitigation and adaptation capacity.",
        datasets: [
            {
                title: "IIASA: SSP4 – Inequality",
                subtitle:
                    "A world of large social and regional inequalities in income, access, and adaptive capacity.",
                tag: "SSP4-6.0"
            },
        ],
    },
    SSP5: {
        id: "SSP5",
        pillTitle: "SSP5",
        pillLabel: "1 dataset",
        highlightTitle: "SSP5 – Fossil-fueled Development",
        highlightSubtitle:
            "Rapid, energy-intensive growth relying heavily on fossil fuels.",
        datasets: [
            {
                title: "IIASA: SSP5 – Fossil-fueled Development",
                subtitle:
                    "Focus on economic and technological growth driven by abundant fossil-fuel use.",
                tag: "SSP5-8.5"
            },
        ],
    },
    AR6: {
        id: "AR6",
        pillTitle: "AR6",
        pillLabel: "2 datasets",
        highlightTitle: "IPCC AR6 Scenarios",
        highlightSubtitle:
            "Ensemble of emissions pathways assessed in the IPCC Sixth Assessment Report.",
        datasets: [
            {
                title: "IPCC AR6 – Low Emissions Ensemble",
                subtitle:
                    "Collection of scenarios consistent with stringent mitigation and low warming outcomes.",
                tag: "AR6 Low"
            },
            {
                title: "IPCC AR6 – High Emissions Ensemble",
                subtitle:
                    "Scenarios with limited mitigation, sustained fossil-fuel use, and high climate risks.",
                tag: "AR6 High"
            },
        ],
    },
    IEA_NZE: {
        id: "IEA_NZE",
        pillTitle: "IEA NZE",
        pillLabel: "1 dataset",
        highlightTitle: "IEA NZE – Net Zero Emissions by 2050",
        highlightSubtitle:
            "Energy system transformation pathway consistent with global net-zero CO₂ emissions.",
        datasets: [
            {
                title: "IEA Net Zero Emissions 2050",
                subtitle:
                    "A roadmap for the global energy sector to reach net-zero CO₂ emissions by 2050.",
                tag: "IEA NZE 2050"
            },
        ],
    },
};

const SCENARIOS = Object.values(SCENARIO_DATA);

/* -------------------- Main Component -------------------- */
/* Renamed to ManualProcess and added onBack prop */

function ManualProcess({ onBack }) {
    const [activeTab, setActiveTab] = useState("search");
    const [activeScenario, setActiveScenario] = useState("SSP1");

    return (
        <div className="cde-app">
            <div className="cde-page">
                {/* Back Button */}
                <div className="cde-back-container">
                    <button className="cde-back-btn" onClick={onBack}>
                        ← Back to Home
                    </button>
                </div>

                {/* Header */}
                <header className="cde-header">
                    <div className="cde-logo-circle">
                        <span className="cde-logo-initials">CD</span>
                    </div>
                    <div>
                        <h1 className="cde-title">Climate Data Explorer</h1>
                        <p className="cde-subtitle">
                            Find and compare climate datasets from leading providers
                        </p>
                    </div>
                </header>

                {/* Tabs */}
                <nav className="cde-tabs">
                    <button
                        className={
                            "cde-tab " + (activeTab === "search" ? "cde-tab--active" : "")
                        }
                        onClick={() => setActiveTab("search")}
                    >
                        <span className="cde-tab-icon">🔍</span>
                        Search Datasets
                    </button>
                    <button
                        className={
                            "cde-tab " + (activeTab === "scenarios" ? "cde-tab--active" : "")
                        }
                        onClick={() => setActiveTab("scenarios")}
                    >
                        <span className="cde-tab-icon">📊</span>
                        Explore Scenarios
                    </button>
                    <button className="cde-tab cde-tab--disabled">
                        <span className="cde-tab-icon">🧬</span>
                        Compare (0)
                    </button>
                </nav>

                {/* Content */}
                <main className="cde-main">
                    {activeTab === "search" ? (
                        <SearchDatasetsPanel />
                    ) : (
                        <ExploreScenariosPanel
                            activeScenario={activeScenario}
                            setActiveScenario={setActiveScenario}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}

/* ------------- Search Datasets panel ------------- */

function SearchDatasetsPanel() {
    return (
        <section className="cde-card">
            <header className="cde-card-header">
                <h2>Define Your Query</h2>
                <p>
                    Specify your research parameters to find the most suitable climate
                    datasets
                </p>
            </header>

            <div className="cde-form-grid">
                <div className="cde-form-row">
                    <div className="cde-field">
                        <label>Sector</label>
                        <div className="cde-select">
                            <select defaultValue="">
                                <option value="" disabled>
                                    Select sector...
                                </option>
                                <option value="energy">Energy</option>
                                <option value="agriculture">Agriculture</option>
                                <option value="transport">Transport</option>
                            </select>
                            <span className="cde-select-arrow">▾</span>
                        </div>
                    </div>

                    <div className="cde-field">
                        <label>Region</label>
                        <div className="cde-select">
                            <select defaultValue="">
                                <option value="" disabled>
                                    Select region...
                                </option>
                                <option value="global">Global</option>
                                <option value="europe">Europe</option>
                                <option value="asia">Asia</option>
                            </select>
                            <span className="cde-select-arrow">▾</span>
                        </div>
                    </div>
                </div>

                <div className="cde-form-row">
                    <div className="cde-field">
                        <label>Start Year</label>
                        <input type="number" defaultValue="1975" />
                    </div>
                    <div className="cde-field">
                        <label>End Year</label>
                        <input type="number" placeholder="e.g. 2050" />
                    </div>
                </div>

                <div className="cde-form-row cde-form-row--full">
                    <div className="cde-field">
                        <label>Variables of Interest</label>
                        <div className="cde-variable-row">
                            <input
                                type="text"
                                placeholder="e.g. Emissions, Temperature..."
                            />
                            <button className="cde-button cde-button--ghost">Add</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cde-actions">
                <button className="cde-button cde-button--primary">
                    Search Datasets
                </button>
                <button className="cde-button cde-button--secondary">Reset</button>
            </div>
        </section>
    );
}

/* ------------- Explore Scenarios panel ------------- */

function ExploreScenariosPanel({ activeScenario, setActiveScenario }) {
    const scenario = SCENARIO_DATA[activeScenario];

    if (!scenario) return null;

    return (
        <>
            {/* Scenario families */}
            <section className="cde-card">
                <header className="cde-card-header">
                    <h2>Scenario Families</h2>
                    <p>
                        Explore different climate scenario families and understand the
                        assumptions behind each dataset
                    </p>
                </header>

                <div className="cde-scenarios-row">
                    {SCENARIOS.map((s) => (
                        <button
                            key={s.id}
                            className={
                                "cde-scenario-pill " +
                                (activeScenario === s.id ? "cde-scenario-pill--active" : "")
                            }
                            onClick={() => setActiveScenario(s.id)}
                        >
                            <span className="cde-scenario-pill-title">{s.pillTitle}</span>
                            <span className="cde-scenario-pill-meta">{s.pillLabel}</span>
                        </button>
                    ))}
                </div>

                <div className="cde-scenario-highlight">
                    <h3>{scenario.highlightTitle}</h3>
                    <p>{scenario.highlightSubtitle}</p>
                </div>
            </section>

            {/* Datasets list for selected scenario */}
            <section className="cde-card">
                <header className="cde-card-header cde-card-header--inline">
                    <h3>Available Datasets ({scenario.datasets.length})</h3>
                </header>

                {scenario.datasets.map((ds) => (
                    <article className="cde-dataset-card" key={ds.title}>
                        <div className="cde-dataset-main">
                            <h4>{ds.title}</h4>
                            <p className="cde-dataset-subtitle">{ds.subtitle}</p>

                            {ds.tag && (
                                <div className="cde-dataset-tag-row">
                                    <span className="cde-pill">{ds.tag}</span>
                                </div>
                            )}

                        </div>

                        <div className="cde-dataset-actions">
                            <button className="cde-button cde-button--secondary">
                                View Dataset
                            </button>
                            <button className="cde-button cde-button--ghost">
                                Add to Compare
                            </button>
                        </div>
                    </article>
                ))}
            </section>
        </>
    );
}

export default ManualProcess;
