import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Eye } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useState } from "react";
import { DatasetPreviewPanel } from "./DatasetPreviewPanel";
function DatasetResults({ matches, query, selectedDatasets, onToggleDataset, recommendation, isRecommending }) {
  const [previewDataset, setPreviewDataset] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const handlePreview = (dataset) => {
    setPreviewDataset(dataset);
    setIsPanelOpen(true);
  };
  if (matches.length === 0) {
    return <Alert className="bg-slate-900/50 border-white/10 text-white">
      <AlertCircle className="size-4" />
      <AlertTitle>No datasets found</AlertTitle>
      <AlertDescription className="text-slate-400">
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
      {
        /* Recommendation Summary */
      }
      {isRecommending && (
        <Alert className="border-indigo-500/20 bg-slate-900/90 text-indigo-200 backdrop-blur-xl animate-pulse">
          <Info className="size-4 text-indigo-400" />
          <AlertTitle className="text-indigo-100">Consulting AI Advisor...</AlertTitle>
          <AlertDescription className="text-indigo-200/80">
            Analyzing coverage metrics for variables and regions.
          </AlertDescription>
        </Alert>
      )}

      {!isRecommending && recommendation && (
        <Alert className="border-indigo-500/20 bg-slate-900/90 text-indigo-200 backdrop-blur-xl">
          <Info className="size-4 text-indigo-400" />
          <AlertTitle className="text-indigo-100 flex items-center gap-2">
            AI Recommendation: {recommendation.recommended_provider} - {recommendation.recommended_model}
          </AlertTitle>
          <AlertDescription className="text-indigo-200/80 mt-2">
            <p className="mb-2 text-sm leading-relaxed">{recommendation.reasoning}</p>

            {recommendation.strengths && recommendation.strengths.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="font-bold text-emerald-400">Strengths:</span> {recommendation.strengths.join(", ")}
              </div>
            )}
            {recommendation.limitations && recommendation.limitations.length > 0 && (
              <div className="mt-1 text-xs">
                <span className="font-bold text-amber-400">Limitations:</span> {recommendation.limitations.join(", ")}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isRecommending && !recommendation && matches.length > 0 && (
        <Alert className="border-blue-500/20 bg-slate-900/90 text-blue-200 backdrop-blur-xl">
          <Info className="size-4 text-blue-400" />
          <AlertTitle className="text-blue-100">Recommendation</AlertTitle>
          <AlertDescription className="text-blue-200/80">
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
              ({topMatch.matchScore >= 70 ? "excellent fit" : topMatch.matchScore >= 50 ? "good fit" : "partial fit"}).
            </p>
          </AlertDescription>
        </Alert>
      )}

      {
        /* Results */
      }
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-100 font-semibold text-lg">Available Datasets ({matches.length})</h2>
          {selectedDatasets.length > 0 && <Badge variant="secondary" className="bg-white/10 text-slate-200 hover:bg-white/20">
            {selectedDatasets.length} selected for comparison
          </Badge>}
        </div>

        <div className="space-y-4">
          {matches.map((match, index) => <Card
            key={match.dataset.id}
            className={`group relative overflow-hidden bg-slate-900/40 backdrop-blur-sm border-white/10 text-slate-200 transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 ${selectedDatasets.includes(match.dataset.id) ? "ring-1 ring-indigo-500 bg-indigo-500/10" : "hover:bg-slate-900/80"}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedDatasets.includes(match.dataset.id)}
                    onCheckedChange={() => onToggleDataset(match.dataset.id)}
                    className="mt-1 border-slate-500 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CardTitle className="text-slate-100 text-base font-bold">
                        {match.dataset.provider}: {match.dataset.name}
                      </CardTitle>
                      {index === 0 && <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white">Top Match</Badge>}
                    </div>
                    <CardDescription className="text-slate-400">{match.dataset.description}</CardDescription>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="border-white/20 text-slate-300">{match.dataset.scenarioFamily}</Badge>
                      <Badge variant="outline" className="border-white/20 text-slate-300">{match.dataset.scenario}</Badge>
                      <MatchScoreBadge score={match.matchScore} />
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-white/5 rounded-lg p-3 border border-white/5">
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Coverage</div>
                  <div className="text-slate-200 font-medium">
                    {match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Sectoral Detail</div>
                  <div className="text-slate-200 font-medium capitalize">
                    {match.dataset.dataQuality.sectoralDetail}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Temporal Resolution</div>
                  <div className="text-slate-200 font-medium">
                    {match.dataset.dataQuality.temporalResolution}
                  </div>
                </div>
              </div>

              {match.strengths.length > 0 && <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
                  <CheckCircle2 className="size-4" />
                  <span>Strengths</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.strengths.map((strength, i) => <li key={i} className="text-sm text-slate-300 list-disc marker:text-emerald-500/50">
                    {strength}
                  </li>)}
                </ul>
              </div>}

              {match.limitations.length > 0 && <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                  <AlertTriangle className="size-4" />
                  <span>Limitations</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.limitations.map((limitation, i) => <li key={i} className="text-sm text-slate-300 list-disc marker:text-amber-500/50">
                    {limitation}
                  </li>)}
                </ul>
              </div>}

              <div className="pt-2 border-t border-white/10">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Assessment</div>
                <p className="text-sm text-slate-300">{match.recommendation}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  onClick={() => handlePreview(match.dataset)}
                >
                  <Eye className="size-4 mr-2" />
                  Preview Details
                </Button>
                <Button
                  variant={selectedDatasets.includes(match.dataset.id) ? "default" : "outline"}
                  size="sm"
                  className={selectedDatasets.includes(match.dataset.id) ? "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent" : "border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"}
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
    return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50">Excellent Match ({score}%)</Badge>;
  } else if (score >= 50) {
    return <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/50">Good Match ({score}%)</Badge>;
  } else if (score >= 30) {
    return <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/50">Partial Match ({score}%)</Badge>;
  } else if (score > 0) {
    return <Badge variant="secondary" className="bg-slate-700 text-slate-300">Limited Match ({score}%)</Badge>;
  }
  return <Badge variant="outline" className="text-slate-500 border-slate-700">No Match</Badge>;
}
export {
  DatasetResults
};
