import Plot from "react-plotly.js";
import { useMemo } from "react";

export default function ScenarioComparator({ data }) {
  const traces = useMemo(() => {
    const grouped = {};

    data.forEach(d => {
      const key = `${d.scenario}-${d.variable}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(d);
    });

    return Object.entries(grouped).map(([key, rows]) => ({
      type: "scattergl",           // 🔥 WebGL
      mode: "lines",
      name: key,
      x: rows.map(r => r.year),
      y: rows.map(r => Number(r.value))
    }));
  }, [data]);   // recompute ONLY when data changes

  return (
    <Plot
      data={traces}
      layout={{
        autosize: true,
        margin: { l: 40, r: 20, t: 40, b: 40 }
      }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
    />
  );
}
