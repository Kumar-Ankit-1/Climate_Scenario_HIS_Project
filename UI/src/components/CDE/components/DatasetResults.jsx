import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Eye } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useState } from "react";
import { DatasetPreviewPanel } from "./DatasetPreviewPanel";
function DatasetResults({ matches, query, selectedDatasets, onToggleDataset }) {
  const [previewDataset, setPreviewDataset] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const handlePreview = (dataset) => {
    setPreviewDataset(dataset);
    setIsPanelOpen(true);
  };
  if (matches.length === 0) {
    return <Alert>
      <AlertCircle className="size-4" />
      <AlertTitle>No datasets found</AlertTitle>
      <AlertDescription>
        No datasets match your current query. Try adjusting your search criteria.
      </AlertDescription>
    </Alert>;
  }
  const topMatch = matches[0];

  return <>
    <div className="space-y-6">
      {
        /* Recommendation Summary */
      }
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="size-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Recommendation</AlertTitle>
        <AlertDescription className="text-blue-800">
          <p className="mb-2">
            For your query ({query.sector && <span>{query.sector} sector</span>}
            {query.sector && query.region && ", "}
            {query.region && <span>{query.region}</span>}
            {(query.sector || query.region) && query.timeStart && query.timeEnd && ", "}
            {query.timeStart && query.timeEnd && <span>{query.timeStart}–{query.timeEnd}</span>}),
            we found <strong>{matches.length}</strong> available dataset{matches.length !== 1 ? "s" : ""}.
          </p>
          <p>
            <strong>{topMatch.dataset.provider}'s {topMatch.dataset.name}</strong> is the top match{" "}
            ({topMatch.matchScore >= 70 ? "excellent fit" : topMatch.matchScore >= 50 ? "good fit" : "partial fit"}).{" "}
            {topMatch.strengths.length > 0 && topMatch.strengths[0]}
            {topMatch.limitations.length > 0 && `, but ${topMatch.limitations[0].toLowerCase()}`}.
          </p>
        </AlertDescription>
      </Alert>

      {
        /* Results */
      }
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900">Available Datasets ({matches.length})</h2>
          {selectedDatasets.length > 0 && <Badge variant="secondary">
            {selectedDatasets.length} selected for comparison
          </Badge>}
        </div>

        <div className="space-y-4">
          {matches.map((match, index) => <Card
            key={match.dataset.id}
            className={`${index === 0 ? "border-blue-300 shadow-md" : ""} ${selectedDatasets.includes(match.dataset.id) ? "ring-2 ring-blue-500" : ""}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedDatasets.includes(match.dataset.id)}
                    onCheckedChange={() => onToggleDataset(match.dataset.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CardTitle className="text-gray-900">
                        {match.dataset.provider}: {match.dataset.name}
                      </CardTitle>
                      {index === 0 && <Badge className="bg-blue-600">Top Match</Badge>}
                    </div>
                    <CardDescription>{match.dataset.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{match.dataset.scenarioFamily}</Badge>
                      <Badge variant="outline">{match.dataset.scenario}</Badge>
                      <MatchScoreBadge score={match.matchScore} />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Coverage</div>
                  <div className="text-gray-900">
                    {match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Sectoral Detail</div>
                  <div className="text-gray-900 capitalize">
                    {match.dataset.dataQuality.sectoralDetail}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Temporal Resolution</div>
                  <div className="text-gray-900">
                    {match.dataset.dataQuality.temporalResolution}
                  </div>
                </div>
              </div>

              {match.strengths.length > 0 && <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span>Strengths</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.strengths.map((strength, i) => <li key={i} className="text-sm text-gray-600 list-disc">
                    {strength}
                  </li>)}
                </ul>
              </div>}

              {match.limitations.length > 0 && <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Limitations</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.limitations.map((limitation, i) => <li key={i} className="text-sm text-gray-600 list-disc">
                    {limitation}
                  </li>)}
                </ul>
              </div>}

              <div className="pt-2 border-t">
                <div className="text-sm text-gray-700 mb-2">Assessment</div>
                <p className="text-sm text-gray-900">{match.recommendation}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm"
                  onClick={() => handlePreview(match.dataset)}
                >
                  <Eye className="size-4 mr-2" />
                  Preview Details
                </Button>
                <Button
                  variant={selectedDatasets.includes(match.dataset.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleDataset(match.dataset.id)}
                >
                  {selectedDatasets.includes(match.dataset.id) ? "Selected" : "Select to Compare"}
                </Button>
              </div>
            </CardContent>
          </Card>)}
        </div>
      </div>
    </div>

    <DatasetPreviewPanel
      dataset={previewDataset}
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
    />
  </>;
}
function MatchScoreBadge({ score }) {
  if (score >= 70) {
    return <Badge className="bg-green-600">Excellent Match ({score}%)</Badge>;
  } else if (score >= 50) {
    return <Badge className="bg-blue-600">Good Match ({score}%)</Badge>;
  } else if (score >= 30) {
    return <Badge className="bg-amber-600">Partial Match ({score}%)</Badge>;
  } else if (score > 0) {
    return <Badge variant="secondary">Limited Match ({score}%)</Badge>;
  }
  return <Badge variant="outline">No Match</Badge>;
}
export {
  DatasetResults
};
