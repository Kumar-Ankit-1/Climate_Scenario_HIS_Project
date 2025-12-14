import Plot from "react-plotly.js";

export default function CoverageHeatmap({ data }) {
  if (data.length === 0) return null;

  const providers = [...new Set(data.map((d) => d.model))];
  const variables = [...new Set(data.map((d) => d.variable))];

  const z = providers.map((p) =>
    variables.map((v) =>
      data.some((d) => d.model === p && d.variable === v) ? 1 : 0
    )
  );

  return (
    <Plot
      data={[
        {
          z,
          x: variables,
          y: providers,
          type: "heatmap",
          colorscale: [
            [0, "rgb(220,220,220)"],
            [1, "rgb(0,150,0)"]
          ]
        }
      ]}
      layout={{
        title: "Coverage Heatmap",
        autosize: true
      }}
      style={{ width: "100%", height: "400px" }}
    />
  );
}
