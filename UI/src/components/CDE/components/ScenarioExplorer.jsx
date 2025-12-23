import { useState } from "react";
import { scenarioFamilies } from "../data/datasets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Eye, Info } from "lucide-react";
import { DatasetPreviewPanel } from "./DatasetPreviewPanel";
function ScenarioExplorer({ datasets }) {
  const [selectedFamily, setSelectedFamily] = useState("SSP2");
  const [previewDataset, setPreviewDataset] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const handlePreview = (dataset) => {
    setPreviewDataset(dataset);
    setIsPanelOpen(true);
  };
  const datasetsByFamily = datasets.reduce((acc, dataset) => {
    if (!acc[dataset.scenarioFamily]) {
      acc[dataset.scenarioFamily] = [];
    }
    acc[dataset.scenarioFamily].push(dataset);
    return acc;
  }, {});
  const familyDatasets = datasetsByFamily[selectedFamily] || [];
  return <>
    <div className="space-y-6">
      <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
        <CardHeader>
          <CardTitle>Scenario Families</CardTitle>
          <CardDescription className="text-slate-400">
            Explore different climate scenario families and understand the assumptions behind each dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFamily} onValueChange={setSelectedFamily}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto gap-2 bg-slate-900/50 border border-white/5 p-1">
              {scenarioFamilies.map((family) => {
                const count = datasetsByFamily[family.id]?.length || 0;
                return <TabsTrigger
                  key={family.id}
                  value={family.id}
                  className="flex flex-col items-start h-auto py-2 px-3 data-[state=active]:bg-indigo-500 data-[state=active]:text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-semibold">{family.id}</span>
                  <span className="text-xs opacity-70">{count} datasets</span>
                </TabsTrigger>;
              })}
            </TabsList>

            {scenarioFamilies.map((family) => <TabsContent key={family.id} value={family.id} className="space-y-6 mt-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Info className="w-24 h-24 text-indigo-400" />
                </div>
                <h3 className="text-indigo-200 text-lg font-semibold mb-2 relative z-10">{family.name}</h3>
                <p className="text-indigo-100/80 leading-relaxed relative z-10">{family.description}</p>
              </div>

              <div>
                <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-slate-400 uppercase tracking-wider">Available Datasets</span>
                  <span className="text-sm text-slate-500">({familyDatasets.length})</span>
                </h3>

                {familyDatasets.length > 0 ? <div className="grid gap-4">
                  {familyDatasets.map((dataset) => <Card key={dataset.id} className="bg-slate-900/40 backdrop-blur-sm border border-white/10 hover:bg-slate-900/60 transition-colors group">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                            {dataset.provider}: {dataset.name}
                          </CardTitle>
                          <CardDescription className="text-slate-400">{dataset.description}</CardDescription>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/5">{dataset.scenario}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Key Assumptions</h4>
                        <ul className="space-y-1">
                          {dataset.assumptions.map((assumption, i) => <li key={i} className="text-sm text-slate-300 list-disc ml-5 marker:text-indigo-500/50">
                            {assumption}
                          </li>)}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 rounded-lg p-3 border border-white/5">
                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Coverage</h4>
                          <div className="text-sm space-y-1">
                            <div className="text-slate-300">
                              <span className="text-slate-500">Time:</span>{" "}
                              <span className="font-medium text-slate-200">{dataset.coverage.timeRange.start}–{dataset.coverage.timeRange.end}</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-500">Sectors:</span>{" "}
                              <span className="font-medium text-slate-200">{dataset.coverage.sectors.length}</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-500">Regions:</span>{" "}
                              <span className="font-medium text-slate-200">{dataset.coverage.regions.length}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Data Quality</h4>
                          <div className="text-sm space-y-1">
                            <div className="text-slate-300">
                              <span className="text-slate-500">Sectoral detail:</span>{" "}
                              <span className="font-medium text-slate-200 capitalize">{dataset.dataQuality.sectoralDetail}</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-500">Regional detail:</span>{" "}
                              <span className="font-medium text-slate-200 capitalize">{dataset.dataQuality.regionalDetail}</span>
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-500">Resolution:</span>{" "}
                              <span className="font-medium text-slate-200">{dataset.dataQuality.temporalResolution}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Available Sectors</h4>
                        <div className="flex flex-wrap gap-2">
                          {dataset.coverage.sectors.map((sector) => <Badge key={sector} variant="secondary" className="bg-slate-700/50 text-slate-300 hover:bg-slate-700">{sector}</Badge>)}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Available Variables</h4>
                        <div className="flex flex-wrap gap-2">
                          {dataset.coverage.variables.map((variable) => <Badge key={variable} variant="outline" className="border-white/10 text-slate-400 bg-white/5">{variable}</Badge>)}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                          onClick={() => handlePreview(dataset)}
                        >
                          <Eye className="size-4 mr-2" />
                          View Full Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
                </div> : <div className="text-center py-16 text-slate-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p>No datasets available for this scenario family yet.</p>
                </div>}
              </div>
            </TabsContent>)}
          </Tabs>
        </CardContent>
      </Card>
    </div>

    <DatasetPreviewPanel
      dataset={previewDataset}
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
    />
  </>;
}
export {
  ScenarioExplorer
};
