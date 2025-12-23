import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { sectors, regions } from "../data/datasets";
import { Search, X } from "lucide-react";
import { Badge } from "./ui/badge";
function QueryForm({ onSearch, currentQuery }) {
  const [sector, setSector] = useState(currentQuery.sector || "");
  const [region, setRegion] = useState(currentQuery.region || "");
  const [timeStart, setTimeStart] = useState(currentQuery.timeStart?.toString() || "");
  const [timeEnd, setTimeEnd] = useState(currentQuery.timeEnd?.toString() || "");
  const [variables, setVariables] = useState(currentQuery.variables || []);
  const [variableInput, setVariableInput] = useState("");
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
                {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region" className="bg-slate-900/50 border-white/10 text-white hover:bg-slate-800/50 data-[placeholder]:text-slate-400">
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
          <div className="flex gap-2">
            <Input
              id="variables"
              placeholder="e.g. Emissions, Temperature..."
              className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-500"
              value={variableInput}
              onChange={(e) => setVariableInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddVariable())}
            />
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
