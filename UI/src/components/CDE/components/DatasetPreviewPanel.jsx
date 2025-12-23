import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Calendar, MapPin, Layers, TrendingUp, Database, ExternalLink, Download } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

function DatasetPreviewPanel({ dataset, isOpen, onClose }) {
  if (!dataset) return null;
  return <Sheet open={isOpen} onOpenChange={onClose}>
    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-slate-900 border-l border-white/10 rounded-l-2xl p-0">
      <div className="p-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl text-white pr-8">{dataset.provider}: {dataset.name}</SheetTitle>
          <SheetDescription className="text-slate-400">{dataset.description}</SheetDescription>
          <div className="flex gap-2 pt-2">
            <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{dataset.scenarioFamily}</Badge>
            <Badge variant="outline" className="border-white/20 text-slate-300">{dataset.scenario}</Badge>
          </div>
        </SheetHeader>
      </div>

      <ScrollArea className="h-[calc(100vh-180px)] px-6">
        <div className="space-y-6 mt-2">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Calendar className="size-4" />
                <span className="text-sm font-medium">Time Coverage</span>
              </div>
              <div className="text-2xl font-bold text-blue-300">
                {dataset.coverage.timeRange.start}–{dataset.coverage.timeRange.end}
              </div>
              <div className="text-sm text-blue-400/80">
                {dataset.coverage.timeRange.end - dataset.coverage.timeRange.start} years
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <Database className="size-4" />
                <span className="text-sm font-medium">Data Quality</span>
              </div>
              <div className="text-2xl font-bold text-green-300 capitalize">
                {dataset.dataQuality.sectoralDetail}
              </div>
              <div className="text-sm text-green-400/80">
                Sectoral detail
              </div>
            </div>
          </div>

          {/* Scenario Information */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              <Layers className="size-5 text-indigo-400" />
              Scenario Assumptions
            </h3>
            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
              <ul className="space-y-2">
                {dataset.assumptions.map((assumption, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 mt-1">•</span>
                  <span>{assumption}</span>
                </li>)}
              </ul>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Coverage Details */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="size-5 text-indigo-400" />
              Sectors Covered ({dataset.coverage.sectors.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {dataset.coverage.sectors.map((sector) => <Badge key={sector} className="bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700">
                {sector}
              </Badge>)}
            </div>
          </div>

          <div>
            <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              <MapPin className="size-5 text-indigo-400" />
              Regions Covered ({dataset.coverage.regions.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {dataset.coverage.regions.map((region) => <Badge key={region} variant="outline" className="border-white/20 text-slate-300">
                {region}
              </Badge>)}
            </div>
          </div>

          <div>
            <h3 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              <Database className="size-5 text-indigo-400" />
              Available Variables ({dataset.coverage.variables.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {dataset.coverage.variables.map((variable) => <Badge key={variable} variant="outline" className="border-white/20 text-slate-300">
                {variable}
              </Badge>)}
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Data Quality Metrics */}
          <div>
            <h3 className="text-slate-200 font-semibold mb-3">Data Quality Metrics</h3>
            <div className="space-y-3 bg-slate-800/50 border border-white/10 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Sectoral Detail</span>
                <Badge
                  className={`capitalize ${dataset.dataQuality.sectoralDetail === "high" ? "bg-green-500/20 text-green-300 border-green-500/30" : dataset.dataQuality.sectoralDetail === "medium" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}
                >
                  {dataset.dataQuality.sectoralDetail}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Regional Detail</span>
                <Badge
                  className={`capitalize ${dataset.dataQuality.regionalDetail === "high" ? "bg-green-500/20 text-green-300 border-green-500/30" : dataset.dataQuality.regionalDetail === "medium" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}
                >
                  {dataset.dataQuality.regionalDetail}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Temporal Resolution</span>
                <span className="text-sm text-slate-200">
                  {dataset.dataQuality.temporalResolution}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Known Limitations */}
          {dataset.limitations.length > 0 && <div>
            <h3 className="text-slate-200 font-semibold mb-3">Known Limitations</h3>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <ul className="space-y-2">
                {dataset.limitations.map((limitation, i) => <li key={i} className="flex items-start gap-2 text-sm text-amber-200">
                  <span className="text-amber-400 mt-1">⚠</span>
                  <span>{limitation}</span>
                </li>)}
              </ul>
            </div>
          </div>}

          {/* Actions */}
          <div className="flex gap-3 pt-4 pb-6">
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
              <Download className="size-4 mr-2" />
              Access Dataset
            </Button>
            <Button variant="outline" className="flex-1 border-white/20 text-slate-200 hover:bg-white/10 rounded-xl">
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
