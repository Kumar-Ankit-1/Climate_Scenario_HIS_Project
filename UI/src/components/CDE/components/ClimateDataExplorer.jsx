import { useState } from "react";
import { QueryForm } from "./QueryForm";
import { DatasetResults } from "./DatasetResults";
import { ScenarioExplorer } from "./ScenarioExplorer";
import { DatasetComparison } from "./DatasetComparison";
import { datasets } from "../data/datasets";
import { matchDatasets } from "../utils/dataset-matcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Database, Search, GitCompare, Globe } from "lucide-react";
function ClimateDataExplorer() {
  const [query, setQuery] = useState({});
  const [matches, setMatches] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const handleSearch = (newQuery) => {
    setQuery(newQuery);
    const results = matchDatasets(datasets, newQuery);
    setMatches(results);
    setHasSearched(true);
    setSelectedDatasets([]);
  };
  const handleToggleDataset = (datasetId) => {
    setSelectedDatasets((prev) => {
      if (prev.includes(datasetId)) {
        return prev.filter((id) => id !== datasetId);
      } else {
        return [...prev, datasetId];
      }
    });
  };
  const selectedMatches = matches.filter((m) => selectedDatasets.includes(m.dataset.id));
  return <div className="min-h-screen bg-white">
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Globe className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-blue-900">Climate Data Explorer</h1>
            <p className="text-gray-600">
              Find and compare climate datasets from leading providers
            </p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="size-4" />
            Search Datasets
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2">
            <Database className="size-4" />
            Explore Scenarios
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="flex items-center gap-2"
            disabled={selectedDatasets.length < 2}
          >
            <GitCompare className="size-4" />
            Compare ({selectedDatasets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <QueryForm onSearch={handleSearch} currentQuery={query} />

          {hasSearched && <DatasetResults
            matches={matches}
            query={query}
            selectedDatasets={selectedDatasets}
            onToggleDataset={handleToggleDataset}
          />}
        </TabsContent>

        <TabsContent value="scenarios">
          <ScenarioExplorer datasets={datasets} />
        </TabsContent>

        <TabsContent value="compare">
          {selectedMatches.length >= 2 ? <DatasetComparison matches={selectedMatches} query={query} /> : <div className="text-center py-12 text-gray-500">
            Select at least 2 datasets from the search results to compare
          </div>}
        </TabsContent>
      </Tabs>
    </div>
  </div>;
}
export {
  ClimateDataExplorer
};
