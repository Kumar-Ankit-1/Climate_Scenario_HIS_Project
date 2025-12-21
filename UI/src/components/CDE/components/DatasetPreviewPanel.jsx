import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Calendar, MapPin, Layers, TrendingUp, Database, ExternalLink, Download } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
function DatasetPreviewPanel({ dataset, isOpen, onClose }) {
  if (!dataset) return null;
  return <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{dataset.provider}: {dataset.name}</SheetTitle>
          <SheetDescription>{dataset.description}</SheetDescription>
          <div className="flex gap-2 pt-2">
            <Badge>{dataset.scenarioFamily}</Badge>
            <Badge variant="outline">{dataset.scenario}</Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <div className="space-y-6 mt-6">
            {
    /* Quick Stats */
  }
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Calendar className="size-4" />
                  <span className="text-sm">Time Coverage</span>
                </div>
                <div className="text-2xl text-blue-900">
                  {dataset.coverage.timeRange.start}–{dataset.coverage.timeRange.end}
                </div>
                <div className="text-sm text-blue-600">
                  {dataset.coverage.timeRange.end - dataset.coverage.timeRange.start} years
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Database className="size-4" />
                  <span className="text-sm">Data Quality</span>
                </div>
                <div className="text-2xl text-green-900 capitalize">
                  {dataset.dataQuality.sectoralDetail}
                </div>
                <div className="text-sm text-green-600">
                  Sectoral detail
                </div>
              </div>
            </div>

            {
    /* Scenario Information */
  }
            <div>
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <Layers className="size-5" />
                Scenario Assumptions
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {dataset.assumptions.map((assumption, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{assumption}</span>
                    </li>)}
                </ul>
              </div>
            </div>

            <Separator />

            {
    /* Coverage Details */
  }
            <div>
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="size-5" />
                Sectors Covered ({dataset.coverage.sectors.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {dataset.coverage.sectors.map((sector) => <Badge key={sector} variant="secondary">
                    {sector}
                  </Badge>)}
              </div>
            </div>

            <div>
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="size-5" />
                Regions Covered ({dataset.coverage.regions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {dataset.coverage.regions.map((region) => <Badge key={region} variant="outline">
                    {region}
                  </Badge>)}
              </div>
            </div>

            <div>
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <Database className="size-5" />
                Available Variables ({dataset.coverage.variables.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {dataset.coverage.variables.map((variable) => <Badge key={variable} variant="outline">
                    {variable}
                  </Badge>)}
              </div>
            </div>

            <Separator />

            {
    /* Data Quality Metrics */
  }
            <div>
              <h3 className="text-gray-900 mb-3">Data Quality Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sectoral Detail</span>
                  <Badge
    variant={dataset.dataQuality.sectoralDetail === "high" ? "default" : dataset.dataQuality.sectoralDetail === "medium" ? "secondary" : "outline"}
    className="capitalize"
  >
                    {dataset.dataQuality.sectoralDetail}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Regional Detail</span>
                  <Badge
    variant={dataset.dataQuality.regionalDetail === "high" ? "default" : dataset.dataQuality.regionalDetail === "medium" ? "secondary" : "outline"}
    className="capitalize"
  >
                    {dataset.dataQuality.regionalDetail}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Temporal Resolution</span>
                  <span className="text-sm text-gray-900">
                    {dataset.dataQuality.temporalResolution}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {
    /* Known Limitations */
  }
            {dataset.limitations.length > 0 && <div>
                <h3 className="text-gray-900 mb-3">Known Limitations</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {dataset.limitations.map((limitation, i) => <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="text-amber-600 mt-1">⚠</span>
                        <span>{limitation}</span>
                      </li>)}
                  </ul>
                </div>
              </div>}

            {
    /* Actions */
  }
            <div className="flex gap-3 pt-4 pb-6">
              <Button className="flex-1">
                <Download className="size-4 mr-2" />
                Access Dataset
              </Button>
              <Button variant="outline" className="flex-1">
                <ExternalLink className="size-4 mr-2" />
                Documentation
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>;
}
export {
  DatasetPreviewPanel
};
