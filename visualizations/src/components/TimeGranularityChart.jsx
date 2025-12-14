import Plot from "react-plotly.js";

export default function TimeGranularityChart({ data }) {
  const providers = [...new Set(data.map((d) => d.model))];

  const yearCounts = providers.map(
    (p) => new Set(data.filter((d) => d.model === p).map((d) => d.year)).size
  );

  return (
    <Plot
      data={[
        {
          x: providers,
          y: yearCounts,
          type: "bar"
        }
      ]}
      layout={{
        title: "Time Granularity (Number of Years Available)",
        xaxis: { title: "Provider" },
        yaxis: { title: "Count of Years" }
      }}
      style={{ width: "100%", height: "400px" }}
    />
  );
}
