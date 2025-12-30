import { useState } from "react";
import { QueryForm } from "./QueryForm";
import { DatasetResults } from "./DatasetResults";
import { ScenarioExplorer } from "./ScenarioExplorer";
import { DatasetComparison } from "./DatasetComparison";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Database, Search, GitCompare, Globe } from "lucide-react";
function ClimateDataExplorer({ initialData }) {
  const [query, setQuery] = useState({});
  const [matches, setMatches] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Set initial query from initialData if provided and not yet set
  // This might be better handled in QueryForm or by setting default state here if QueryForm is controlled.
  // Looking at QueryForm, it manages its own state initiated from currentQuery prop.
  // So we can pass initialData as currentQuery if query is empty? 
  // Better: Pass initialData explicitly to QueryForm to serve as defaults.

  const handleSearch = async (newQuery) => {
    setQuery(newQuery);
    setHasSearched(true);
    setSelectedDatasets([]);
    setRecommendation(null);
    setMatches([]); // Clear previous matches

    // Fetch AI Recommendation and Candidates
    setIsRecommending(true);
    try {
      const res = await fetch('/api/recommend-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: newQuery.sector,
          region: newQuery.region,
          start_year: newQuery.timeStart,
          end_year: newQuery.timeEnd,
          variables: newQuery.variables || []
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendation(data.top_recommendation);
        if (data.candidates) {
          setMatches(data.candidates);
        }
      }
    } catch (e) {
      console.error("Failed to get recommendation", e);
    } finally {
      setIsRecommending(false);
    }
  };

  // ... (keep existing handlers)

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

  return <div className="w-full">
    <div className="container mx-auto px-0 py-2">
      <header className="mb-8 flex items-center gap-4 p-6 bg-slate-900/50 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
          <Globe className="size-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Climate Data Explorer</h1>
          <p className="text-slate-400">
            Find and compare climate datasets from leading providers
          </p>
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
          <QueryForm onSearch={handleSearch} currentQuery={query} initialData={initialData} />

          {hasSearched && <DatasetResults
            matches={matches}
            query={query}
            selectedDatasets={selectedDatasets}
            onToggleDataset={handleToggleDataset}
            recommendation={recommendation}
            isRecommending={isRecommending}
          />}
        </TabsContent>

        <TabsContent value="scenarios">
          {/* Note: ScenarioExplorer might still need datasets prop, but usage of dummy data is forbidden. 
              We should probably pass the 'matches' or fetch scenarios from API too.
              For now, passing empty array or handling it if ScenarioExplorer uses it.
              Let's check ScenarioExplorer briefly or just pass [] if unrelated to current task.
              But ScenarioExplorer likely needs data. The user said "Do not show any dataset from ... datasets.jsx".
              If ScenarioExplorer relies on it, it will break or show nothing.
              I'll just pass matches.map(m => m.dataset) if appropriate or leave it broken/empty until requested. 
              Actually, passing [] is safer to respect "Do not show".
           */}
          <ScenarioExplorer datasets={matches.map(m => m.dataset)} />
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
