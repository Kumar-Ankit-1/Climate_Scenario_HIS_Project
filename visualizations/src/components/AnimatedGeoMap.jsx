import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import { aggregateToCountryYear } from "../utils/geoUtils";

export default function AnimatedGeoMap({ data, model=null, scenario=null, variable=null }) {
  const years = useMemo(
    () => Array.from(new Set(data.map(d => d.year))).sort((a,b)=>a-b),
    [data]
  );

  const frames = years.map(y => {
    const rows = aggregateToCountryYear(data, { model, scenario, variable, year: y });
    return {
      name: String(y),
      data: [{
        type: "choropleth",
        locations: rows.map(r => r.iso3),
        z: rows.map(r => r.value),
        locationmode: "ISO-3",
        colorscale: "Viridis",
        marker: { line: { color: "rgba(0,0,0,0.2)", width: 0.2 } }
      }]
    };
  });

  const initRows = aggregateToCountryYear(data, {
    model, scenario, variable, year: years[0]
  });

  return (
    <div style={{ width: "100%", height: 420 }}>
      <Plot
        data={[
          {
            type: "choropleth",
            locations: initRows.map(r => r.iso3),
            z: initRows.map(r => r.value),
            locationmode: "ISO-3",
            colorscale: "Viridis"
          }
        ]}
        frames={frames}
        layout={{
          autosize: true,
          height: 380,
          margin: { t: 0, b: 0, l: 0, r: 0 },
          geo: { projection: { type: "natural earth" } },
          updatemenus: [{
            x: 0.1,
            y: 0,
            buttons: [
              {
                method: "animate",
                args: [null, { frame: { duration: 600 }, transition: { duration: 300 } }],
                label: "Play"
              }
            ]
          }],
          sliders: [{
            pad: { t: 20 },
            currentvalue: { prefix: "Year: " },
            steps: years.map(y => ({
              label: String(y),
              method: "animate",
              args: [[String(y)], { mode: "immediate" }]
            }))
          }]
        }}
        config={{ responsive: true }}
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
