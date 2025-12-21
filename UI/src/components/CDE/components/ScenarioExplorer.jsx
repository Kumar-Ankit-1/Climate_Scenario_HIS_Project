import { useState } from "react";
import { scenarioFamilies } from "../data/datasets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Eye } from "lucide-react";
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
      <Card>
        <CardHeader>
          <CardTitle>Scenario Families</CardTitle>
          <CardDescription>
            Explore different climate scenario families and understand the assumptions behind each dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFamily} onValueChange={setSelectedFamily}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto gap-2">
              {scenarioFamilies.map((family) => {
                const count = datasetsByFamily[family.id]?.length || 0;
                return <TabsTrigger
                  key={family.id}
                  value={family.id}
                  className="flex flex-col items-start h-auto py-2 px-3"
                >
                  <span className="text-sm">{family.id}</span>
                  <span className="text-xs text-gray-500">{count} datasets</span>
                </TabsTrigger>;
              })}
            </TabsList>

            {scenarioFamilies.map((family) => <TabsContent key={family.id} value={family.id} className="space-y-6 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-blue-900 mb-2">{family.name}</h3>
                <p className="text-blue-800">{family.description}</p>
              </div>

              <div>
                <h3 className="text-gray-900 mb-4">
                  Available Datasets ({familyDatasets.length})
                </h3>

                {familyDatasets.length > 0 ? <div className="grid gap-4">
                  {familyDatasets.map((dataset) => <Card key={dataset.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-gray-900">
                            {dataset.provider}: {dataset.name}
                          </CardTitle>
                          <CardDescription>{dataset.description}</CardDescription>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{dataset.scenario}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm text-gray-700 mb-2">Key Assumptions</h4>
                        <ul className="space-y-1">
                          {dataset.assumptions.map((assumption, i) => <li key={i} className="text-sm text-gray-600 list-disc ml-5">
                            {assumption}
                          </li>)}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm text-gray-700 mb-2">Coverage</h4>
                          <div className="text-sm space-y-1">
                            <div className="text-gray-600">
                              <span className="text-gray-500">Time:</span>{" "}
                              {dataset.coverage.timeRange.start}–{dataset.coverage.timeRange.end}
                            </div>
                            <div className="text-gray-600">
                              <span className="text-gray-500">Sectors:</span>{" "}
                              {dataset.coverage.sectors.length}
                            </div>
                            <div className="text-gray-600">
                              <span className="text-gray-500">Regions:</span>{" "}
                              {dataset.coverage.regions.length}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm text-gray-700 mb-2">Data Quality</h4>
                          <div className="text-sm space-y-1">
                            <div className="text-gray-600">
                              <span className="text-gray-500">Sectoral detail:</span>{" "}
                              <span className="capitalize">{dataset.dataQuality.sectoralDetail}</span>
                            </div>
                            <div className="text-gray-600">
                              <span className="text-gray-500">Regional detail:</span>{" "}
                              <span className="capitalize">{dataset.dataQuality.regionalDetail}</span>
                            </div>
                            <div className="text-gray-600">
                              <span className="text-gray-500">Resolution:</span>{" "}
                              {dataset.dataQuality.temporalResolution}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm text-gray-700 mb-2">Available Sectors</h4>
                        <div className="flex flex-wrap gap-2">
                          {dataset.coverage.sectors.map((sector) => <Badge key={sector} variant="secondary">{sector}</Badge>)}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm text-gray-700 mb-2">Available Variables</h4>
                        <div className="flex flex-wrap gap-2">
                          {dataset.coverage.variables.map((variable) => <Badge key={variable} variant="outline">{variable}</Badge>)}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(dataset)}
                        >
                          <Eye className="size-4 mr-2" />
                          View Full Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>)}
                </div> : <div className="text-center py-8 text-gray-500">
                  No datasets available for this scenario family
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
