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
      <Alert className="border-blue-200 bg-blue-50">
        <TrendingUp className="size-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Quick Decision Guide</AlertTitle>
        <AlertDescription className="text-blue-800 space-y-2">
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
            {!timeOverlap && <li className="text-amber-700">⚠️ No overlapping time periods - datasets cover different time ranges</li>}
          </ul>
        </AlertDescription>
      </Alert>

      {
    /* Key Differences Highlight */
  }
      <Card>
        <CardHeader>
          <CardTitle>Key Differences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Layers className="size-4" />
                <span className="text-sm">Scenario Approach</span>
              </div>
              {matches.map((match) => <div key={match.dataset.id} className="text-sm">
                  <div className="text-gray-900">{match.dataset.provider}</div>
                  <Badge variant="outline" className="text-xs">
                    {match.dataset.scenarioFamily}
                  </Badge>
                </div>)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="size-4" />
                <span className="text-sm">Time Span</span>
              </div>
              {matches.map((match) => <div key={match.dataset.id} className="text-sm text-gray-900">
                  {match.dataset.coverage.timeRange.end - match.dataset.coverage.timeRange.start} years
                  <div className="text-xs text-gray-500">
                    ({match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end})
                  </div>
                </div>)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="size-4" />
                <span className="text-sm">Geographic Coverage</span>
              </div>
              {matches.map((match) => <div key={match.dataset.id} className="text-sm text-gray-900">
                  {match.dataset.coverage.regions.length} regions
                  <div className="text-xs text-gray-500 capitalize">
                    {match.dataset.dataQuality.regionalDetail} detail
                  </div>
                </div>)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <TrendingUp className="size-4" />
                <span className="text-sm">Sectoral Coverage</span>
              </div>
              {matches.map((match) => <div key={match.dataset.id} className="text-sm text-gray-900">
                  {match.dataset.coverage.sectors.length} sectors
                  <div className="text-xs text-gray-500 capitalize">
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
      <Card>
        <CardHeader>
          <CardTitle>Overview Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-gray-700">Attribute</th>
                  {matches.map((match) => <th key={match.dataset.id} className="p-3 text-left">
                      <div className="space-y-1">
                        <div className="text-gray-900">{match.dataset.provider}</div>
                        <div className="text-gray-600">{match.dataset.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {match.dataset.scenarioFamily}
                        </Badge>
                      </div>
                    </th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 text-gray-700">Match Score</td>
                  {matches.map((match) => <td key={match.dataset.id} className="p-3">
                      <Badge
    className={match.matchScore >= 70 ? "bg-green-600" : match.matchScore >= 50 ? "bg-blue-600" : "bg-amber-600"}
  >
                        {match.matchScore}%
                      </Badge>
                    </td>)}
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-gray-700">Time Coverage</td>
                  {matches.map((match) => <td key={match.dataset.id} className="p-3 text-gray-900">
                      {match.dataset.coverage.timeRange.start}–{match.dataset.coverage.timeRange.end}
                    </td>)}
                </tr>

                <tr className="border-b bg-gray-50">
                  <td className="p-3 text-gray-700">Sectoral Detail</td>
                  {matches.map((match) => <td key={match.dataset.id} className="p-3">
                      <Badge
    variant={match.dataset.dataQuality.sectoralDetail === "high" ? "default" : match.dataset.dataQuality.sectoralDetail === "medium" ? "secondary" : "outline"}
    className="capitalize"
  >
                        {match.dataset.dataQuality.sectoralDetail}
                      </Badge>
                    </td>)}
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-gray-700">Regional Detail</td>
                  {matches.map((match) => <td key={match.dataset.id} className="p-3">
                      <Badge
    variant={match.dataset.dataQuality.regionalDetail === "high" ? "default" : match.dataset.dataQuality.regionalDetail === "medium" ? "secondary" : "outline"}
    className="capitalize"
  >
                        {match.dataset.dataQuality.regionalDetail}
                      </Badge>
                    </td>)}
                </tr>

                <tr className="border-b bg-gray-50">
                  <td className="p-3 text-gray-700">Temporal Resolution</td>
                  {matches.map((match) => <td key={match.dataset.id} className="p-3 text-gray-900">
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
      <Card>
        <CardHeader>
          <CardTitle>Scenario Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => <div key={match.dataset.id} className="border rounded-lg p-4">
                <h4 className="text-gray-900 mb-3">
                  {match.dataset.provider}: {match.dataset.scenario}
                </h4>
                <ul className="space-y-1">
                  {match.dataset.assumptions.map((assumption, i) => <li key={i} className="text-sm text-gray-600 list-disc ml-5">
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
      <Card>
        <CardHeader>
          <CardTitle>Sector Coverage Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-gray-700">Sector</th>
                  {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-gray-700">
                      {match.dataset.provider}
                    </th>)}
                </tr>
              </thead>
              <tbody>
                {allSectors.map((sector) => {
    const isQueried = query.sector === sector;
    const inAllDatasets = matches.every((m) => m.dataset.coverage.sectors.includes(sector));
    return <tr key={sector} className={`border-b ${isQueried ? "bg-blue-50" : ""}`}>
                      <td className="p-2 text-gray-900">
                        {sector}
                        {isQueried && <Badge variant="secondary" className="ml-2 text-xs">Your Query</Badge>}
                        {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs">In All</Badge>}
                      </td>
                      {matches.map((match) => {
      const hasSector = match.dataset.coverage.sectors.includes(sector);
      return <td key={match.dataset.id} className="p-2 text-center">
                            {hasSector ? <CheckCircle2
        className={`size-5 mx-auto ${isQueried ? "text-green-600" : "text-gray-400"}`}
      /> : <XCircle className="size-5 text-gray-300 mx-auto" />}
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
      <Card>
        <CardHeader>
          <CardTitle>Regional Coverage Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-gray-700">Region</th>
                  {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-gray-700">
                      {match.dataset.provider}
                    </th>)}
                </tr>
              </thead>
              <tbody>
                {allRegions.map((region) => {
    const isQueried = query.region === region;
    const inAllDatasets = matches.every((m) => m.dataset.coverage.regions.includes(region));
    return <tr key={region} className={`border-b ${isQueried ? "bg-blue-50" : ""}`}>
                      <td className="p-2 text-gray-900">
                        {region}
                        {isQueried && <Badge variant="secondary" className="ml-2 text-xs">Your Query</Badge>}
                        {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs">In All</Badge>}
                      </td>
                      {matches.map((match) => {
      const hasRegion = match.dataset.coverage.regions.includes(region);
      return <td key={match.dataset.id} className="p-2 text-center">
                            {hasRegion ? <CheckCircle2
        className={`size-5 mx-auto ${isQueried ? "text-green-600" : "text-gray-400"}`}
      /> : <XCircle className="size-5 text-gray-300 mx-auto" />}
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
      <Card>
        <CardHeader>
          <CardTitle>Variable Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-gray-700">Variable</th>
                  {matches.map((match) => <th key={match.dataset.id} className="p-2 text-center text-gray-700">
                      {match.dataset.provider}
                    </th>)}
                </tr>
              </thead>
              <tbody>
                {allVariables.map((variable) => {
    const isQueried = query.variables?.includes(variable);
    const inAllDatasets = matches.every((m) => m.dataset.coverage.variables.includes(variable));
    return <tr key={variable} className={`border-b ${isQueried ? "bg-blue-50" : ""}`}>
                      <td className="p-2 text-gray-900">
                        {variable}
                        {isQueried && <Badge variant="secondary" className="ml-2 text-xs">Your Query</Badge>}
                        {inAllDatasets && !isQueried && <Badge variant="outline" className="ml-2 text-xs">In All</Badge>}
                      </td>
                      {matches.map((match) => {
      const hasVariable = match.dataset.coverage.variables.includes(variable);
      return <td key={match.dataset.id} className="p-2 text-center">
                            {hasVariable ? <CheckCircle2
        className={`size-5 mx-auto ${isQueried ? "text-green-600" : "text-gray-400"}`}
      /> : <XCircle className="size-5 text-gray-300 mx-auto" />}
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
      <Card>
        <CardHeader>
          <CardTitle>Strengths & Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match) => <Card key={match.dataset.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {match.dataset.provider}: {match.dataset.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {match.strengths.length > 0 && <div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span>Strengths</span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {match.strengths.map((strength, i) => <li key={i} className="text-sm text-gray-600 list-disc">
                            {strength}
                          </li>)}
                      </ul>
                    </div>}

                  {match.limitations.length > 0 && <div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <MinusCircle className="size-4 text-amber-600" />
                        <span>Limitations</span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {match.limitations.map((limitation, i) => <li key={i} className="text-sm text-gray-600 list-disc">
                            {limitation}
                          </li>)}
                      </ul>
                    </div>}

                  {match.dataset.limitations.length > 0 && <div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                        <MinusCircle className="size-4 text-gray-600" />
                        <span>General Limitations</span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {match.dataset.limitations.map((limitation, i) => <li key={i} className="text-sm text-gray-600 list-disc">
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
      <Card>
        <CardHeader>
          <CardTitle>When to Use Each Dataset</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {matches.map((match) => <div key={match.dataset.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <h4 className="text-gray-900 mb-2">
                  {match.dataset.provider}: {match.dataset.name}
                </h4>
                <p className="text-sm text-gray-700 mb-2">{match.recommendation}</p>
                <div className="text-sm text-gray-600">
                  <strong>Best for:</strong>{" "}
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-900 mb-3">Final Recommendation</h3>
        <div className="space-y-3 text-sm text-blue-800">
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

          {!timeOverlap && <p className="text-amber-700">
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
