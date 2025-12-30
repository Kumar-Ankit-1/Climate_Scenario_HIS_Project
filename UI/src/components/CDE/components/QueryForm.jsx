import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { sectors as defaultSectors, regions as defaultRegions } from "../data/datasets";
import { Search, X } from "lucide-react";
import { Badge } from "./ui/badge";

function QueryForm({ onSearch, currentQuery, initialData }) {
  // Use initialData if available, otherwise fallback to currentQuery or defaults
  const [sector, setSector] = useState(initialData?.sector || currentQuery.sector || "");
  const [region, setRegion] = useState(initialData?.region || currentQuery.region || "");
  const [timeStart, setTimeStart] = useState(initialData?.timeStart || currentQuery.timeStart?.toString() || "");
  const [timeEnd, setTimeEnd] = useState(initialData?.timeEnd || currentQuery.timeEnd?.toString() || "");
  const [variables, setVariables] = useState(initialData?.variables || currentQuery.variables || []);
  const [variableInput, setVariableInput] = useState("");

  // NEW: Autocomplete State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [availableSectors, setAvailableSectors] = useState(defaultSectors);
  const [availableRegions, setAvailableRegions] = useState(defaultRegions);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [sectorsRes, regionsRes] = await Promise.all([
          fetch('/api/metadata/sectors'),
          fetch('/api/metadata/regions')
        ]);

        if (sectorsRes.ok) {
          const data = await sectorsRes.json();
          if (data.sectors && data.sectors.length > 0) {
            setAvailableSectors(data.sectors);
          }
        }

        if (regionsRes.ok) {
          const data = await regionsRes.json();
          if (data.regions && data.regions.length > 0) {
            setAvailableRegions(data.regions);
          }
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    };

    fetchMetadata();
  }, []);

  // NEW: Debounce effect for autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (variableInput.trim().length >= 1) {
        try {
          const sectorParam = sector ? `&sector=${encodeURIComponent(sector)}` : '';
          const res = await fetch(`/api/autocomplete/variables?q=${encodeURIComponent(variableInput)}${sectorParam}`);
          if (res.ok) {
            const data = await res.json();
            setSuggestions(data);
            if (data.length > 0) setShowSuggestions(true);
          }
        } catch (error) {
          console.error("Autocomplete error:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [variableInput, sector]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const query = {};
    if (sector) query.sector = sector;
    if (region) query.region = region;
    if (timeStart) query.timeStart = parseInt(timeStart);
    if (timeEnd) query.timeEnd = parseInt(timeEnd);
    if (variables.length > 0) query.variables = variables;
    onSearch(query);
  };
  const handleAddVariable = () => {
    if (variableInput.trim() && !variables.includes(variableInput.trim())) {
      setVariables([...variables, variableInput.trim()]);
      setVariableInput("");
    }
  };
  const handleRemoveVariable = (variable) => {
    setVariables(variables.filter((v) => v !== variable));
  };
  const handleReset = () => {
    setSector("");
    setRegion("");
    setTimeStart("");
    setTimeEnd("");
    setVariables([]);
    setVariableInput("");
  };

  return <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 text-white">
    <CardHeader>
      <CardTitle>Define Your Query</CardTitle>
      <CardDescription>
        Specify your research parameters to find the most suitable climate datasets
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="sector">Sector</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger id="sector" className="bg-slate-900/50 border-white/10 text-white hover:bg-slate-800/50 data-[placeholder]:text-slate-400">
                <SelectValue placeholder="Select sector..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {availableSectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region" className="bg-slate-900/50 border-white/10 text-white hover:bg-slate-800/50 data-[placeholder]:text-slate-400">
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white h-[300px]">
                {availableRegions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeStart">Start Year</Label>
            <Input
              id="timeStart"
              type="number"
              placeholder="e.g. 2000"
              className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-500"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              min="1900"
              max="2100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeEnd">End Year</Label>
            <Input
              id="timeEnd"
              type="number"
              placeholder="e.g. 2050"
              className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-500"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              min="1900"
              max="2100"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="variables">Variables of Interest</Label>
          <div className="flex gap-2 relative z-50">
            <div className="relative flex-1">
              <Input
                id="variables"
                placeholder="e.g. Emissions, Temperature..."
                className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-500"
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVariable())}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full z-50 bg-slate-900 border border-white/10 rounded-md mt-1 shadow-xl max-h-60 overflow-y-auto ring-1 ring-white/10">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-indigo-500/20 cursor-pointer flex flex-col items-start transition-colors border-b border-white/5 last:border-0"
                      onClick={() => {
                        if (!variables.includes(s.variable)) {
                          setVariables([...variables, s.variable]);
                        }
                        setVariableInput("");
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="font-medium text-sm text-white">{s.variable}</span>
                      {s.description && (
                        <span className="text-xs text-slate-400 truncate w-full">{s.description}</span>
                      )}
                      {s.sector && (
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.sector}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="button" onClick={handleAddVariable} variant="outline" className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300">
              Add
            </Button>
          </div>
          {variables.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
            {variables.map((variable) => <Badge key={variable} variant="secondary" className="gap-1">
              {variable}
              <button
                type="button"
                onClick={() => handleRemoveVariable(variable)}
                className="ml-1 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>)}
          </div>}
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1 md:flex-initial">
            <Search className="size-4 mr-2" />
            Search Datasets
          </Button>
          <Button type="button" variant="outline" onClick={handleReset} className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300">
            Reset
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}
export {
  QueryForm
};
