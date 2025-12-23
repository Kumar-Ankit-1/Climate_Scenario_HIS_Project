import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle2, XCircle, MinusCircle, TrendingUp, Calendar, MapPin, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
function DatasetComparison({ matches, query }) {
  if (matches.length < 2) {
    return null;
  }
  const allSectors = Array.from(
    new Set(matches.flatMap((m) => m.dataset.coverage.sectors))
  ).sort();
  const allRegions = Array.from(
    new Set(matches.flatMap((m) => m.dataset.coverage.regions))
  ).sort();
  const allVariables = Array.from(
    new Set(matches.flatMap((m) => m.dataset.coverage.variables))
  ).sort();
  const getSectorOverlap = () => {
    const sectorSets = matches.map((m) => new Set(m.dataset.coverage.sectors));
    const commonSectors2 = allSectors.filter(
      (sector) => sectorSets.every((set) => set.has(sector))
    );
    return commonSectors2;
  };
  const getTimeOverlap = () => {
    const starts = matches.map((m) => m.dataset.coverage.timeRange.start);
    const ends = matches.map((m) => m.dataset.coverage.timeRange.end);
    const overlapStart = Math.max(...starts);
    const overlapEnd = Math.min(...ends);
    return overlapStart <= overlapEnd ? { start: overlapStart, end: overlapEnd } : null;
  };
  const commonSectors = getSectorOverlap();
  const timeOverlap = getTimeOverlap();
  return <div className="space-y-6">
    {
      /* Decision Aid Summary */
    }
    <Alert className="border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
      <TrendingUp className="size-4 text-indigo-400" />
      <AlertTitle className="text-indigo-100">Quick Decision Guide</AlertTitle>
      <AlertDescription className="text-indigo-200/80 space-y-2">
        <p>Comparing {matches.length} datasets for your analysis:</p>
        <ul className="list-disc ml-5 space-y-1">
          {matches[0].matchScore > matches[1].matchScore + 20 && <li>
            <strong>{matches[0].dataset.provider}'s {matches[0].dataset.name}</strong> is clearly superior
            ({matches[0].matchScore}% vs {matches[1].matchScore}% match)
          </li>}
          {commonSectors.length > 0 && <li>{commonSectors.length} sectors available in all datasets: {commonSectors.slice(0, 3).join(", ")}
            {commonSectors.length > 3 && ` +${commonSectors.length - 3} more`}
          </li>}
          {timeOverlap && <li>Common time coverage: {timeOverlap.start}–{timeOverlap.end}</li>}
          {!timeOverlap && <li className="text-amber-400">⚠️ No overlapping time periods - datasets cover different time ranges</li>}
        </ul>
      </AlertDescription>
    </Alert>

    {
      /* Key Differences Highlight */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Key Differences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Layers className="size-4" />
              <span className="text-sm">Scenario Approach</span>
            </div>
            {matches.map((match) => <div key={match.dataset.id} className="text-sm">
              <div className="text-slate-200 font-semibold">{match.dataset.provider}</div>
              <Badge variant="outline" className="text-xs border-white/20 text-slate-300">
                {match.dataset.scenarioFamily}
              </Badge>
            </div>)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Calendar className="size-4" />
              <span className="text-sm">Time Span</span>
            </div>
            {matches.map((match) => <div key={match.dataset.id} className="text-sm text-slate-200">
              {match.dataset.coverage.timeRange.end - match.dataset.coverage.timeRange.start} years
              <div className="text-xs text-slate-500">
                ({match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end})
              </div>
            </div>)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <MapPin className="size-4" />
              <span className="text-sm">Geographic Coverage</span>
            </div>
            {matches.map((match) => <div key={match.dataset.id} className="text-sm text-slate-200">
              {match.dataset.coverage.regions.length} regions
              <div className="text-xs text-slate-500 capitalize">
                {match.dataset.dataQuality.regionalDetail} detail
              </div>
            </div>)}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <TrendingUp className="size-4" />
              <span className="text-sm">Sectoral Coverage</span>
            </div>
            {matches.map((match) => <div key={match.dataset.id} className="text-sm text-slate-200">
              {match.dataset.coverage.sectors.length} sectors
              <div className="text-xs text-slate-500 capitalize">
                {match.dataset.dataQuality.sectoralDetail} detail
              </div>
            </div>)}
          </div>
        </div>
      </CardContent>
    </Card>

    {
      /* Overview Table */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100 overflow-hidden">
      <CardHeader>
        <CardTitle>Overview Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 font-medium">Attribute</th>
                {matches.map((match) => <th key={match.dataset.id} className="p-3 text-left">
                  <div className="space-y-1">
                    <div className="text-slate-200 font-bold">{match.dataset.provider}</div>
                    <div className="text-slate-400 font-normal text-xs">{match.dataset.name}</div>
                    <Badge variant="outline" className="text-xs border-white/10 text-slate-300">
                      {match.dataset.scenarioFamily}
                    </Badge>
                  </div>
                </th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 bg-white/5">
                <td className="p-3 text-slate-300 font-medium">Match Score</td>
                {matches.map((match) => <td key={match.dataset.id} className="p-3">
                  <Badge
                    className={match.matchScore >= 70 ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : match.matchScore >= 50 ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"}
                  >
                    {match.matchScore}%
                  </Badge>
                </td>)}
              </tr>

              <tr className="border-b border-white/5">
                <td className="p-3 text-slate-300 font-medium">Time Coverage</td>
                {matches.map((match) => <td key={match.dataset.id} className="p-3 text-slate-200">
                  {match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end}
                </td>)}
              </tr>

              <tr className="border-b border-white/5 bg-white/5">
                <td className="p-3 text-slate-300 font-medium">Sectoral Detail</td>
                {matches.map((match) => <td key={match.dataset.id} className="p-3">
                  <Badge
                    variant={match.dataset.dataQuality.sectoralDetail === "high" ? "default" : match.dataset.dataQuality.sectoralDetail === "medium" ? "secondary" : "outline"}
                    className={`capitalize ${match.dataset.dataQuality.sectoralDetail === "high" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-slate-700/50 text-slate-300"}`}
                  >
                    {match.dataset.dataQuality.sectoralDetail}
                  </Badge>
                </td>)}
              </tr>

              <tr className="border-b border-white/5">
                <td className="p-3 text-slate-300 font-medium">Regional Detail</td>
                {matches.map((match) => <td key={match.dataset.id} className="p-3">
                  <Badge
                    variant={match.dataset.dataQuality.regionalDetail === "high" ? "default" : match.dataset.dataQuality.regionalDetail === "medium" ? "secondary" : "outline"}
                    className={`capitalize ${match.dataset.dataQuality.regionalDetail === "high" ? "bg-indigo-500 hover:bg-indigo-600" : "bg-slate-700/50 text-slate-300"}`}
                  >
                    {match.dataset.dataQuality.regionalDetail}
                  </Badge>
                </td>)}
              </tr>

              <tr className="border-b border-white/5 bg-white/5">
                <td className="p-3 text-slate-300 font-medium">Temporal Resolution</td>
                {matches.map((match) => <td key={match.dataset.id} className="p-3 text-slate-200">
                  {match.dataset.dataQuality.temporalResolution}
                </td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {
      /* Scenario Assumptions Comparison */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Scenario Assumptions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => <div key={match.dataset.id} className="border border-white/10 rounded-lg p-4 bg-white/5">
            <h4 className="text-slate-200 font-semibold mb-3">
              {match.dataset.provider}: {match.dataset.scenario}
            </h4>
            <ul className="space-y-1">
              {match.dataset.assumptions.map((assumption, i) => <li key={i} className="text-sm text-slate-400 list-disc ml-5 marker:text-indigo-400">
                {assumption}
              </li>)}
            </ul>
          </div>)}
        </div>
      </CardContent>
    </Card>

    {
      /* Sector Coverage */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Sector Coverage Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-2 text-slate-400 font-medium">Sector</th>
                {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-slate-400 font-medium">
                  {match.dataset.provider}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {allSectors.map((sector) => {
                const isQueried = query.sector === sector;
                const inAllDatasets = matches.every((m) => m.dataset.coverage.sectors.includes(sector));
                return <tr key={sector} className={`border-b border-white/5 ${isQueried ? "bg-indigo-500/10" : ""}`}>
                  <td className="p-2 text-slate-200">
                    {sector}
                    {isQueried && <Badge variant="secondary" className="ml-2 text-xs bg-indigo-500/20 text-indigo-300">Your Query</Badge>}
                    {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs border-emerald-500/20 text-emerald-400">In All</Badge>}
                  </td>
                  {matches.map((match) => {
                    const hasSector = match.dataset.coverage.sectors.includes(sector);
                    return <td key={match.dataset.id} className="p-2 text-center">
                      {hasSector ? <CheckCircle2
                        className={`size-5 mx-auto ${isQueried ? "text-emerald-400" : "text-slate-600"}`}
                      /> : <XCircle className="size-5 text-slate-700 mx-auto" />}
                    </td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {
      /* Regional Coverage */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Regional Coverage Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-2 text-slate-400 font-medium">Region</th>
                {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-slate-400 font-medium">
                  {match.dataset.provider}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {allRegions.map((region) => {
                const isQueried = query.region === region;
                const inAllDatasets = matches.every((m) => m.dataset.coverage.regions.includes(region));
                return <tr key={region} className={`border-b border-white/5 ${isQueried ? "bg-indigo-500/10" : ""}`}>
                  <td className="p-2 text-slate-200">
                    {region}
                    {isQueried && <Badge variant="secondary" className="ml-2 text-xs bg-indigo-500/20 text-indigo-300">Your Query</Badge>}
                    {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs border-emerald-500/20 text-emerald-400">In All</Badge>}
                  </td>
                  {matches.map((match) => {
                    const hasRegion = match.dataset.coverage.regions.includes(region);
                    return <td key={match.dataset.id} className="p-2 text-center">
                      {hasRegion ? <CheckCircle2
                        className={`size-5 mx-auto ${isQueried ? "text-emerald-400" : "text-slate-600"}`}
                      /> : <XCircle className="size-5 text-slate-700 mx-auto" />}
                    </td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {
      /* Variable Availability */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Variable Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-2 text-slate-400 font-medium">Variable</th>
                {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-slate-400 font-medium">
                  {match.dataset.provider}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {allVariables.map((variable) => {
                const isQueried = query.variables?.includes(variable);
                const inAllDatasets = matches.every((m) => m.dataset.coverage.variables.includes(variable));
                return <tr key={variable} className={`border-b border-white/5 ${isQueried ? "bg-indigo-500/10" : ""}`}>
                  <td className="p-2 text-slate-200">
                    {variable}
                    {isQueried && <Badge variant="secondary" className="ml-2 text-xs bg-indigo-500/20 text-indigo-300">Your Query</Badge>}
                    {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs border-emerald-500/20 text-emerald-400">In All</Badge>}
                  </td>
                  {matches.map((match) => {
                    const hasVariable = match.dataset.coverage.variables.includes(variable);
                    return <td key={match.dataset.id} className="p-2 text-center">
                      {hasVariable ? <CheckCircle2
                        className={`size-5 mx-auto ${isQueried ? "text-emerald-400" : "text-slate-600"}`}
                      /> : <XCircle className="size-5 text-slate-700 mx-auto" />}
                    </td>;
                  })}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {
      /* Strengths & Limitations */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>Strengths & Limitations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => <Card key={match.dataset.id} className="bg-white/5 border border-white/10">
            <CardHeader>
              <CardTitle className="text-base text-slate-200">
                {match.dataset.provider}: {match.dataset.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {match.strengths.length > 0 && <div>
                <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium mb-2">
                  <CheckCircle2 className="size-4" />
                  <span>Strengths</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.strengths.map((strength, i) => <li key={i} className="text-sm text-slate-400 list-disc marker:text-emerald-500/50">
                    {strength}
                  </li>)}
                </ul>
              </div>}

              {match.limitations.length > 0 && <div>
                <div className="flex items-center gap-2 text-sm text-amber-400 font-medium mb-2">
                  <MinusCircle className="size-4" />
                  <span>Limitations</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.limitations.map((limitation, i) => <li key={i} className="text-sm text-slate-400 list-disc marker:text-amber-500/50">
                    {limitation}
                  </li>)}
                </ul>
              </div>}

              {match.dataset.limitations.length > 0 && <div>
                <div className="flex items-center gap-2 text-sm text-slate-400 font-medium mb-2">
                  <MinusCircle className="size-4" />
                  <span>General Limitations</span>
                </div>
                <ul className="space-y-1 ml-6">
                  {match.dataset.limitations.map((limitation, i) => <li key={i} className="text-sm text-slate-500 list-disc marker:text-slate-600">
                    {limitation}
                  </li>)}
                </ul>
              </div>}
            </CardContent>
          </Card>)}
        </div>
      </CardContent>
    </Card>

    {
      /* Use Case Recommendations */
    }
    <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-slate-100">
      <CardHeader>
        <CardTitle>When to Use Each Dataset</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map((match) => <div key={match.dataset.id} className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-500/5 rounded-r">
            <h4 className="text-indigo-200 font-bold mb-2">
              {match.dataset.provider}: {match.dataset.name}
            </h4>
            <p className="text-sm text-slate-300 mb-2">{match.recommendation}</p>
            <div className="text-sm text-slate-400">
              <strong className="text-slate-200">Best for:</strong>{" "}
              {match.dataset.dataQuality.sectoralDetail === "high" && "Detailed sectoral analysis"}
              {match.dataset.dataQuality.sectoralDetail === "high" && match.dataset.dataQuality.regionalDetail === "high" && ", "}
              {match.dataset.dataQuality.regionalDetail === "high" && "Regional-specific studies"}
              {match.dataset.coverage.timeRange.end > 2080 && ", Long-term projections"}
            </div>
          </div>)}
        </div>
      </CardContent>
    </Card>

    {
      /* Final Recommendations */
    }
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-6">
      <h3 className="text-indigo-200 font-semibold mb-3">Final Recommendation</h3>
      <div className="space-y-3 text-sm text-indigo-100/80">
        {matches[0].matchScore >= 70 ? <p>
          <strong>Primary choice: {matches[0].dataset.provider}'s {matches[0].dataset.name}</strong> -
          This dataset provides the best overall match for your query with {matches[0].matchScore}% compatibility.
        </p> : <p>
          While <strong>{matches[0].dataset.provider}'s {matches[0].dataset.name}</strong> has the highest match score ({matches[0].matchScore}%),
          you may need to combine multiple datasets or adjust your requirements for optimal results.
        </p>}

        {matches.length > 1 && Math.abs(matches[0].matchScore - matches[1].matchScore) < 15 && <p>
          <strong>Note:</strong> {matches[1].dataset.provider}'s {matches[1].dataset.name} is a close alternative
          ({matches[1].matchScore}% match) and may be worth considering for cross-validation or sensitivity analysis.
        </p>}

        {!timeOverlap && <p className="text-amber-400">
          <strong>⚠️ Important:</strong> The selected datasets do not have overlapping time periods.
          Consider whether you need data from multiple time ranges or should focus on a specific period.
        </p>}
      </div>
    </div>
  </div>;
}
export {
  DatasetComparison
};
