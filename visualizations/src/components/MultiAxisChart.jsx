import Plot from "react-plotly.js";

export default function MultiAxisChart({ data }) {
  if (data.length === 0) return null;

  const var1 = [...new Set(data.map((d) => d.variable))][0];
  const var2 = [...new Set(data.map((d) => d.variable))][1];

  const d1 = data.filter((d) => d.variable === var1);
  const d2 = data.filter((d) => d.variable === var2);

  return (
    <Plot
      data={[
        {
          x: d1.map((r) => r.year),
          y: d1.map((r) => r.value),
          name: var1,
          mode: "lines",
          yaxis: "y1"
        },
        {
          x: d2.map((r) => r.year),
          y: d2.map((r) => r.value),
          name: var2,
          mode: "lines",
          yaxis: "y2"
        }
      ]}
      layout={{
        title: "Multi-Axis Variable Comparison",
        xaxis: { title: "Year" },
        yaxis: { title: var1, side: "left" },
        yaxis2: {
          title: var2,
          overlaying: "y",
          side: "right"
        }
      }}
      style={{ width: "100%", }}
      useResizeHandler
    />
  );
}
