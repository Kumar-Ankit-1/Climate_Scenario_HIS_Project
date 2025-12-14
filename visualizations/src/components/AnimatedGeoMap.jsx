import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import { aggregateToCountryYear } from "../utils/geoUtils";

export default function AnimatedGeoMap({ data, model=null, scenario=null, variable=null }) {
  const years = useMemo(()=>Array.from(new Set(data.map(d=>d.year))).sort((a,b)=>a-b), [data]);

  // build frames
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

  // initial data (first year)
  const initRows = aggregateToCountryYear(data, { model, scenario, variable, year: years[0] || null });
  const initTrace = {
    type: "choropleth",
    locations: initRows.map(r => r.iso3),
    z: initRows.map(r => r.value),
    locationmode: "ISO-3",
    colorscale: "Viridis",
    marker: { line: { color: "rgba(0,0,0,0.2)", width: 0.2 } }
  };

  const layout = {
    title: `${variable || ""} over time`,
    geo: { projection: { type: "natural earth" } },
    updatemenus: [
      {
        y: 0.1, x: 0.1,
        buttons: [
          {
            method: "animate",
            args: [null, { fromcurrent: true, frame: {duration: 700, redraw: true}, transition: {duration: 300} }],
            label: "Play"
          },
          {
            method: "animate",
            args: [[null], {mode:"immediate", frame:{duration:0}, transition:{duration:0}}],
            label: "Pause"
          }
        ]
      }
    ],
    sliders: [{
      pad: { t: 30 },
      currentvalue: { prefix: "Year: " },
      steps: years.map(y => ({ label: String(y), method: "animate", args: [[String(y)], {mode: "immediate"}] }))
    }],
    margin: { t: 40, b: 20 },
    height: 520
  };

  return (
    <div style={{border:"1px solid #eee", padding:8, marginTop:12}}>
      <Plot
        data={[initTrace]}
        layout={layout}
        frames={frames}
        config={{ responsive: true }}
      />
    </div>
  );
}
