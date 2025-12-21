import React from "react";
import { ClimateDataExplorer } from "../CDE/components/ClimateDataExplorer";
// css imported globally via index.css

function ManualProcess({ onBack }) {
    return (
        <div className="cde-wrapper" style={{ height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
            {/* Back Button Wrapper */}
            <div style={{ padding: "1rem", maxWidth: "80rem", margin: "0 auto" }}>
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 500,
                        padding: 0,
                        fontSize: "0.875rem"
                    }}
                >
                    ← Back to Home
                </button>
            </div>
            <ClimateDataExplorer />
        </div>
    );
}

export default ManualProcess;
