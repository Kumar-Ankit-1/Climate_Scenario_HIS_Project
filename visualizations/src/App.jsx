import { useEffect, useMemo, useState } from "react";

// Pages + components
import QueryPage from "./pages/QueryPage";

import DataLoader from "./components/DataLoader";
import ScenarioComparator from "./components/ScenarioComparator";
import CoverageHeatmap from "./components/CoverageHeatmap";
import TimeGranularityChart from "./components/TimeGranularityChart";
import MultiAxisChart from "./components/MultiAxisChart";
import MetadataInspector from "./components/MetadataInspector";
import ChoroplethMap from "./components/ChoroplethMap";
import AnimatedGeoMap from "./components/AnimatedGeoMap";

// helper
const FEATURE_LABELS = {
  variables: "Variable",
  regions: "Region",
  scenarios: "Scenario",
  models: "Model",
  temporal: "Time resolution"
};



// Custom Multi-Select Component
function MultiSelect({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => {
    onChange(options);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "10px",
            background: "rgba(255, 255, 255, 0.9)",
            color: "#334155",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
            e.currentTarget.style.background = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
            {options.length === 0
              ? "No data"
              : selected.length === 0
                ? "Select..."
                : selected.length === options.length
                  ? "All selected"
                  : `${selected.length} selected`}
          </span>
          <span style={{ marginLeft: 8, color: "#94a3b8", fontSize: 10 }}>
            {isOpen ? "▲" : "▼"}
          </span>
        </button>

        {isOpen && options.length > 0 && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 10
              }}
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 20,
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
                borderRadius: "10px",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                maxHeight: "250px",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                style={{
                  padding: "6px",
                  borderBottom: "1px solid rgba(241, 245, 249, 0.8)",
                  display: "flex",
                  gap: 6
                }}
              >
                <button
                  onClick={selectAll}
                  style={{
                    flex: 1,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.9)",
                    color: "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                  }}
                >
                  All
                </button>
                <button
                  onClick={clearAll}
                  style={{
                    flex: 1,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.9)",
                    color: "#475569",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                    e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
                  }}
                >
                  Clear
                </button>
              </div>
              <div style={{ overflowY: "auto", padding: "4px" }}>
                {options.map((option, idx) => {
                  const isSelected = selected.includes(option);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleOption(option)}
                      style={{
                        padding: "7px 10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: "6px",
                        transition: "all 0.15s ease",
                        fontSize: 13,
                        color: "#334155"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(248, 250, 252, 0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          border: isSelected ? "2px solid #6d28d9" : "2px solid #cbd5e1",
                          borderRadius: "3px",
                          background: isSelected ? "#6d28d9" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s ease"
                        }}
                      >
                        {isSelected && (
                          <span style={{ color: "#ffffff", fontSize: 10, fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {option}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Custom Filters Panel Component

function StyledFiltersPanel({ data, onFilter, query }) {
  const allModels = [...new Set(data.map(d => d.model))];
  const allScenarios = [...new Set(data.map(d => d.scenario))];
  const allVariables = [...new Set(data.map(d => d.variable))];
  const allRegions = [...new Set(data.map(d => d.region))];

  const [selectedModels, setSelectedModels] = useState(
    query?.models?.length ? query.models : allModels
  );
  const [selectedScenarios, setSelectedScenarios] = useState(
    query?.scenarios?.length ? query.scenarios : allScenarios
  );
  const [selectedVariables, setSelectedVariables] = useState(
    query?.variables?.length ? query.variables : allVariables
  );
  const [selectedRegions, setSelectedRegions] = useState(
    query?.regions?.length ? query.regions : allRegions
  );

  const applyFilters = () => {
    onFilter(
      data.filter(row =>
        selectedModels.includes(row.model) &&
        selectedScenarios.includes(row.scenario) &&
        selectedVariables.includes(row.variable) &&
        selectedRegions.includes(row.region)
      )
    );
  };

  // --------------------------------------------------
  // 5️⃣ Render
  // --------------------------------------------------
  return (
    <div>
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: 14,
          fontWeight: 700,
          color: "#0f172a",
          textTransform: "uppercase"
        }}
      >
        🎛️ Filters
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <MultiSelect
          label="Model"
          options={allModels}
          selected={selectedModels}
          onChange={setSelectedModels}
        />

        <MultiSelect
          label="Scenario"
          options={allScenarios}
          selected={selectedScenarios}
          onChange={setSelectedScenarios}
        />

        <MultiSelect
          label="Variable"
          options={allVariables}
          selected={selectedVariables}
          onChange={setSelectedVariables}
        />

        <MultiSelect
          label="Region"
          options={allRegions}
          selected={selectedRegions}
          onChange={setSelectedRegions}
        />
      </div>

      <button
        onClick={applyFilters}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px 20px",
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #4c1d95, #6d28d9)",
          color: "#ffffff",
          cursor: "pointer"
        }}
      >
        Apply Filters
      </button>
    </div>
  );
}

function Toast({ message, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: "14px 18px",
        borderRadius: 12,
        background: "linear-gradient(135deg, #ef4444, #b91c1c)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        animation: "toastIn 0.35s ease-out"
      }}
    >
      {message}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}


export default function App() {
  const [page, setPage] = useState("query");

  const [query, setQuery] = useState(null);                  // Parsed query
  const [providerResults, setProviderResults] = useState([]); // Ranked providers

  const [rawData, setRawData] = useState([]);               // Loaded rows
  const [filteredData, setFilteredData] = useState([]);

  // ---------------------------------------------------------
  // 1) Handle the submitted query from QueryPage
  // ---------------------------------------------------------
  const handleQuerySubmit = ({ parsedQuery, providers }) => {
    setQuery(parsedQuery);
    setProviderResults(providers);
    setPage("results");    // New page that lists recommended providers
  };

  // ---------------------------------------------------------
  // 2) Handle user clicking on a provider → Load filtered data
  // ---------------------------------------------------------
  const handleSelectProvider = async (provider) => {
    try {
      const res = await fetch("http://localhost:8000/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: provider.latest_file,   // <--- important
          variables: provider.variables,
          regions: provider.regions,
          scenarios: provider.scenarios,
          models: provider.models
        })
      });

      const raw = await res.text();
      console.log("RAW FILTER RESPONSE:", raw);   // <=== ADD THIS

      const data = JSON.parse(raw); // instead of res.json()

      setRawData(data);
      setFilteredData(data);
      setPage("dashboard");
    } catch (err) {
      console.error("Filter error:", err);
    }
  };


  // ---------------------------------------------------------
  // 3) JSX Rendering
  // ---------------------------------------------------------
  return (
    <div style={{ padding: 20, maxWidth: "100vw", overflowX: "hidden" }}>
      {page === "query" && (
  <div style={{ animation: "fadeIn 0.5s ease-out" }}>
    <QueryPage onSubmitQuery={handleQuerySubmit} />
  </div>
)}

      {/* -----------------------------------------------------
         RESULTS PAGE — shows recommended providers
      ----------------------------------------------------- */}
      {page === "results" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "linear-gradient(to bottom right, #f8fafc, #f1f5f9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          }}
        >
          <div
            style={{
              width: "min(1000px, 100%)",
              borderRadius: 16,
              background: "#ffffff",
              boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              border: "1px solid #e2e8f0",
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              overflow: "visible"
            }}
          >
            {/* header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  onClick={() => setPage("query")}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    padding: "8px 14px",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    color: "#475569",
                    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  <span>←</span>
                  <span>Back</span>
                </button>

                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "#0f172a",
                      letterSpacing: "-0.02em"
                    }}
                  >
                    Recommended data providers
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      marginTop: 4
                    }}
                  >
                    Ranked by semantic match to your query
                  </div>
                </div>
              </div>

              {providerResults.length > 0 && (
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0"
                  }}
                >
                  Top match highlighted
                </div>
              )}
            </div>

            {/* empty state */}
            {providerResults.length === 0 && (
              <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
                No providers matched your query.
              </p>
            )}

            {/* list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: "calc(100vh - 280px)",
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: 8
              }}
            >
              {providerResults.map((p, idx) => {
                const isTop = idx === 0;

                const baseItemStyle = {
                  borderRadius: 12,
                  padding: "20px",
                  cursor: "pointer",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  transition: "all 0.2s ease"
                };

                const itemStyle = isTop
                  ? {
                    ...baseItemStyle,
                    border: "1px solid #a5b4fc",
                    background: "linear-gradient(to bottom, #ffffff, #f5f3ff)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                    position: "relative"
                  }
                  : baseItemStyle;

                const headingColor = isTop ? "#4c1d95" : "#0f172a";
                const labelColor = isTop ? "#7c3aed" : "#64748b";
                const bodyColor = "#334155";

                const onMouseEnter = (e) => {
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
                  e.currentTarget.style.borderColor = isTop ? "#818cf8" : "#cbd5e1";
                  e.currentTarget.style.transform = "translateY(-2px)";
                };

                const onMouseLeave = (e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = isTop ? "#a5b4fc" : "#e2e8f0";
                  e.currentTarget.style.boxShadow = isTop
                    ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                    : "0 1px 2px 0 rgb(0 0 0 / 0.05)";
                };

                const itemHeaderRowStyle = {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16
                };

                const variablePreview =
                  p.variables.length > 3
                    ? `${p.variables.slice(0, 3).join(", ")} +${p.variables.length - 3} more`
                    : p.variables.join(", ");

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectProvider(p)}
                    style={itemStyle}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                  >
                    <div style={itemHeaderRowStyle}>
                      <div style={{ flex: 1 }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 18,
                            fontWeight: 600,
                            color: headingColor,
                            letterSpacing: "-0.01em"
                          }}
                        >
                          {idx + 1}. {p.provider_id}
                        </h2>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {isTop && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: 11,
                              fontWeight: 600,
                              background: "#dcfce7",
                              color: "#15803d",
                              border: "1px solid #86efac",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                          >
                            <span>★</span>
                            <span>Top match</span>
                          </span>
                        )}
                        <span
                          style={{
                            borderRadius: "6px",
                            padding: "6px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            background: isTop ? "#4c1d95" : "#0f172a",
                            color: "#ffffff",
                            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
                          }}
                        >
                          {p.score.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 600,
                          color: labelColor,
                          marginBottom: 6
                        }}
                      >
                        Variables
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: bodyColor,
                          lineHeight: 1.5
                        }}
                      >
                        {variablePreview}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: 600,
                          color: labelColor,
                          marginBottom: 8
                        }}
                      >
                        Scenarios
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6
                        }}
                      >
                        {p.scenarios.slice(0, 4).map((sc, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              fontSize: 12,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              color: "#475569",
                              fontWeight: 500,
                              maxWidth: "100%",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            title={sc}
                          >
                            {sc}
                          </span>
                        ))}
                        {p.scenarios.length > 4 && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              color: "#64748b",
                              fontWeight: 500
                            }}
                          >
                            +{p.scenarios.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {p.explanation && (
                      <div
                        style={{
                          borderTop: "1px solid #f1f5f9",
                          paddingTop: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          fontSize: 13
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontWeight: 600,
                            color: labelColor
                          }}
                        >
                          Why this matched
                        </div>

                        {/* MATCHED FEATURES */}
                        {Object.entries(p.explanation.matched || {}).map(([key, values]) => (
                          <div
                            key={key}
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              color: "#334155",
                              alignItems: "center"
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>
                              ✓ {FEATURE_LABELS[key] || key}:
                            </span>

                            {values.map((v, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: "#f1f5f9",
                                  padding: "4px 8px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 6,
                                  fontSize: 13
                                }}
                              >
                                {v.query} → {v.provider}
                                {typeof v.similarity === "number" && (
                                  <span style={{ color: "#64748b" }}>
                                    {" "}({Math.round(v.similarity * 100)}%)
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------
         DASHBOARD — filtered data only
      ----------------------------------------------------- */}
      {page === "dashboard" && (
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #fef3c7 100%)",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          }}
        >
          <div style={{
            maxWidth: "1600px",
            width: "100%",
            margin: "0 auto",
            padding: "24px",
            boxSizing: "border-box",
            overflowX: "hidden"
          }}>
            {/* Header Section */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(10px)",
                borderRadius: 16,
                padding: "20px 32px",
                marginBottom: 24,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.8)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <button
                  onClick={() => setPage("results")}
                  style={{
                    borderRadius: "12px",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    background: "rgba(255, 255, 255, 0.9)",
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    color: "#475569",
                    boxShadow: "0 2px 4px 0 rgb(0 0 0 / 0.05)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px 0 rgb(0 0 0 / 0.05)";
                  }}
                >
                  <span>←</span>
                  <span>Back to Providers</span>
                </button>

                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}
                  >
                    <span>🌍</span>
                    <span>Climate Dashboard</span>
                  </h1>
                </div>
              </div>

              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6d28d9"
                }}
              >
                {filteredData.length} records
              </div>
            </div>

            {rawData.length === 0 ? (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 16,
                  padding: "48px 32px",
                  textAlign: "center",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.8)"
                }}
              >
                <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>No data loaded.</p>
              </div>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)"
                , gap: 24
              }}>
                {/* LEFT SIDEBAR - Filters */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "20px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.8)",
                      position: "sticky",
                      top: 24
                    }}
                  >
                    <StyledFiltersPanel data={rawData} query={query} onFilter={setFilteredData} />
                  </div>
                </div>

                {/* RIGHT CONTENT - Charts Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Top Stats Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.8))",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "20px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>
                        TOTAL SCENARIOS
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
                        {[...new Set(filteredData.map(d => d.Scenario))].length}
                      </div>
                    </div>
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.8))",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "20px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>
                        VARIABLES
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
                        {[...new Set(filteredData.map(d => d.Variable))].length}
                      </div>
                    </div>
                    <div
                      style={{
                        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(249, 250, 251, 0.8))",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "20px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 8 }}>
                        REGIONS
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}>
                        {[...new Set(filteredData.map(d => d.Region))].length}
                      </div>
                    </div>
                  </div>

                  {/* Scenario Comparison - Full Width */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.8)"
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 20px 0",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.01em",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <span>📈</span>
                      <span>Scenario Comparison</span>
                    </h2>
                    <ScenarioComparator data={filteredData} />
                  </div>

                  {/* Two Column Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
                    {/* Coverage Heatmap */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "24px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 20px 0",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0f172a",
                          letterSpacing: "-0.01em",
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <span>🧭</span>
                        <span>Coverage Heatmap</span>
                      </h2>
                      <CoverageHeatmap data={filteredData} />
                    </div>

                    {/* Time Granularity */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "24px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 20px 0",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0f172a",
                          letterSpacing: "-0.01em",
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <span>⏱</span>
                        <span>Time Granularity</span>
                      </h2>
                      <TimeGranularityChart data={filteredData} />
                    </div>
                  </div>

                  {/* Metadata Inspector */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.8)"
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 20px 0",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.01em",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <span>🔎</span>
                      <span>Metadata Inspector</span>
                    </h2>
                    <MetadataInspector data={filteredData} />
                  </div>

                  {/* Multi-Axis Chart */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.8)",
                      backdropFilter: "blur(10px)",
                      borderRadius: 16,
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.8)"
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 20px 0",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.01em",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <span>📊</span>
                      <span>Multi-Axis Chart</span>
                    </h2>
                    <MultiAxisChart data={filteredData} />
                  </div>

                  {/* Maps Section - Two Column */}
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
                    {/* Choropleth Map */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "24px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 20px 0",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0f172a",
                          letterSpacing: "-0.01em",
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <span>🌐</span>
                        <span>Choropleth Map</span>
                      </h2>
                      <ChoroplethMap
                        data={filteredData}
                        model={null}
                        scenario={query?.scenarios?.[0]}
                        variable={query?.variables?.[0]}
                      />
                    </div>

                    {/* Animated Geo Map */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.8)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 16,
                        padding: "24px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)"
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 20px 0",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#0f172a",
                          letterSpacing: "-0.01em",
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <span>🎞</span>
                        <span>Animated Geo Map</span>
                      </h2>
                      <AnimatedGeoMap
                        data={filteredData}
                        model={null}
                        scenario={query?.scenarios?.[0]}
                        variable={query?.variables?.[0]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}