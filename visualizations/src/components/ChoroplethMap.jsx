import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import { aggregateToCountryYear } from "../utils/geoUtils";

export default function ChoroplethMap({ data, model=null, scenario=null, variable=null }) {
  const years = useMemo(() => {
    return Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
  }, [data]);

  const [year, setYear] = useState(years[0] ?? null);

  const countryRows = useMemo(() => {
    if (!year) return [];
    return aggregateToCountryYear(data, { model, scenario, variable, year });
  }, [data, model, scenario, variable, year]);

  const locations = countryRows.map(r => r.iso3);
  const z = countryRows.map(r => r.value);

  return (
    <div style={{ width: "100%", height: 420 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 8 }}>
        <strong>{variable || "Variable"} — {year}</strong>
        <select value={year ?? ""} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <Plot
        data={[
          {
            type: "choropleth",
            locations,
            z,
            locationmode: "ISO-3",
            colorscale: "Viridis",
            marker: { line: { color: "rgba(0,0,0,0.2)", width: 0.2 } },
            colorbar: { title: variable || "Value" },
            hovertemplate: "<b>%{location}</b><br>%{z}<extra></extra>"
          }
        ]}
        layout={{
          autosize: true,
          height: 380,
          margin: { t: 0, b: 0, l: 0, r: 0 },
          geo: {
            projection: { type: "natural earth" },
            showframe: false,
            showcoastlines: true
          }
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
console.log("AGG ROWS", {
  variable,
  scenario,
  model,
  year,
  rows: countryRows
});
