import { useState } from "react";

export default function FiltersPanel({ data, onFilter }) {
  const unique = (arr) => [...new Set(arr)];

  const models = unique(data.map((d) => d.model));
  const scenarios = unique(data.map((d) => d.scenario));
  const variables = unique(data.map((d) => d.variable));
  const regions = unique(data.map((d) => d.region));

  const [selectedModel, setSelectedModel] = useState("All");
  const [selectedScenario, setSelectedScenario] = useState("All");
  const [selectedVariable, setSelectedVariable] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");

  const applyFilters = () => {
    let filtered = [...data];

    if (selectedModel !== "All") {
      filtered = filtered.filter((d) => d.model === selectedModel);
    }

    if (selectedScenario !== "All") {
      filtered = filtered.filter((d) => d.scenario === selectedScenario);
    }

    if (selectedVariable !== "All") {
      filtered = filtered.filter((d) => d.variable === selectedVariable);
    }

    if (selectedRegion !== "All") {
      filtered = filtered.filter((d) => d.region === selectedRegion);
    }

    onFilter(filtered);
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Filters</h3>

      <select onChange={(e) => setSelectedModel(e.target.value)}>
        <option>All</option>
        {models.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <select onChange={(e) => setSelectedScenario(e.target.value)}>
        <option>All</option>
        {scenarios.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <select onChange={(e) => setSelectedVariable(e.target.value)}>
        <option>All</option>
        {variables.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>

      <select onChange={(e) => setSelectedRegion(e.target.value)}>
        <option>All</option>
        {regions.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <button onClick={applyFilters}>Apply</button>
    </div>
  );
}
