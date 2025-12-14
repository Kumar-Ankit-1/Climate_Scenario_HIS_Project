import DataLoader from "../components/DataLoader";
import FiltersPanel from "../components/FiltersPanel";
import ScenarioComparator from "../components/ScenarioComparator";
import CoverageHeatmap from "../components/CoverageHeatmap";
import TimeGranularityChart from "../components/TimeGranularityChart";
import MultiAxisChart from "../components/MultiAxisChart";
import MetadataInspector from "../components/MetadataInspector";
import ChoroplethMap from "../components/ChoroplethMap";
import AnimatedGeoMap from "../components/AnimatedGeoMap";

export default function DashboardPage({
  rawData,
  filteredData,
  setFilteredData,
  onBack
}) {
  return (
    <div>
      <button onClick={onBack}>⬅ Back to Query</button>

      <h1>📊 Climate Scenario Dashboard</h1>

      <FiltersPanel data={rawData} onFilter={setFilteredData} />

      <h2>Scenario Comparison</h2>
      <ScenarioComparator data={filteredData} />

      <h2>Metadata</h2>
      <MetadataInspector data={filteredData} />

      <h2>Coverage Heatmap</h2>
      <CoverageHeatmap data={filteredData} />

      <h2>Time Granularity</h2>
      <TimeGranularityChart data={filteredData} />

      <h2>Variable Comparison</h2>
      <MultiAxisChart data={filteredData} />

      <h2>Choropleth</h2>
      <ChoroplethMap 
        data={filteredData} 
        model={"REMIND"} 
        scenario={"SSP2"} 
        variable={"Population"} 
      />

      <h2>Animated Map</h2>
      <AnimatedGeoMap 
        data={filteredData} 
        model={null} 
        scenario={"SSP2"} 
        variable={"GDP"} 
      />
    </div>
  );
}
