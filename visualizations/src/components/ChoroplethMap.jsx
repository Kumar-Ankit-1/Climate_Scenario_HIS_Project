import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import { aggregateToCountryYear } from "../utils/geoUtils";

export default function ChoroplethMap({ data, model=null, scenario=null, variable=null }) {
  const years = useMemo(() => {
    const ys = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b);
    return ys;
  }, [data]);

  const [year, setYear] = useState(years.length ? years[0] : null);

  const countryRows = useMemo(() => {
    if (!year) return [];
    return aggregateToCountryYear(data, { model, scenario, variable, year });
  }, [data, model, scenario, variable, year]);

  // build arrays for Plotly choropleth
  const locations = countryRows.map(r => r.iso3);
  const z = countryRows.map(r => r.value);

  return (
    <div style={{border:"1px solid #eee", padding:8, marginTop:12}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h4>Choropleth — {variable || "variable"} — Year: {year}</h4>
        <div>
          <select value={year || ""} onChange={(e)=>setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
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
            colorbar: { title: variable || "value" },
            hovertemplate: "<b>%{location}</b><br>Value: %{z}<extra></extra>"
          }
        ]}
        layout={{
          geo: { projection: { type: "natural earth" } },
          margin: { t: 20, b: 0 },
          height: 450
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}
