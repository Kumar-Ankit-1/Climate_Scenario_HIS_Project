import React from 'react';
import { Rocket, Globe, BarChart2, TrendingUp, X, Trash2 } from 'lucide-react';

function SelectedItems({ variables, scenarios, contextData, onRemoveVariable, onRemoveScenario, onClear, onCompare }) {
  const hasItems = variables.length > 0 || scenarios.length > 0;
  const region = contextData?.region || "Not Set";
  const startDate = (contextData?.start_date && contextData.start_date !== "Not Set") ? contextData.start_date : "---";
  const endDate = (contextData?.end_date && contextData.end_date !== "Not Set") ? contextData.end_date : "---";

  // Debug: Log whenever contextData changes
  console.log('[SelectedItems] contextData prop:', contextData);
  console.log('[SelectedItems] Parsed - Region:', region, 'Start:', startDate, 'End:', endDate);

  return (
    <div className="w-full lg:w-80 border-l border-white/10 bg-slate-900/95 backdrop-blur-xl h-full flex flex-col shadow-2xl font-sans flex-shrink-0">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-indigo-400">
          <Rocket className="w-5 h-5" />
          <h3 className="font-bold text-slate-100 text-lg tracking-tight">Mission Control</h3>
        </div>
        {hasItems && (
          <button
            onClick={onClear}
            className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Scope Card */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-slate-300">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-sm uppercase tracking-wider">Scope</span>
          </div>
          <div className="space-y-3 pl-1">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 font-medium mb-1">Target Region</label>
              <span className={`text-sm font-medium ${region !== "Not Set" ? 'text-white' : 'text-slate-500 italic'}`}>
                {region}
              </span>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 font-medium mb-1">Analysis Period</label>
              <span className="text-sm font-medium text-white tracking-tight">
                {startDate} <span className="text-slate-600 mx-1">—</span> {endDate}
              </span>
            </div>
          </div>
        </div>

        {/* Variables Section */}
        <div>
          <div className="flex items-center justify-between mb-3 text-slate-300">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <h4 className="font-semibold text-sm uppercase tracking-wider">Variables</h4>
            </div>
            <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{variables.length}</span>
          </div>

          {variables.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-4 text-center bg-white/5">
              <p className="text-xs text-slate-500 italic">No variables selected</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <div key={`var-${index}`} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg text-sm transition-all hover:bg-emerald-500/20">
                  <span className="font-medium truncate max-w-[140px]">{variable}</span>
                  <button
                    className="bg-transparent hover:bg-emerald-500/20 rounded-full p-0.5 transition-colors"
                    onClick={() => onRemoveVariable(variable)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios Section */}
        <div>
          <div className="flex items-center justify-between mb-3 text-slate-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-sm uppercase tracking-wider">Scenarios</h4>
            </div>
            <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{scenarios.length}</span>
          </div>

          {scenarios.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-4 text-center bg-white/5">
              <p className="text-xs text-slate-500 italic">No scenarios selected</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {scenarios.map((scenario, index) => (
                <div key={`scen-${index}`} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-sm transition-all hover:bg-indigo-500/20">
                  <span className="font-medium truncate max-w-[140px]">{scenario}</span>
                  <button
                    className="bg-transparent hover:bg-indigo-500/20 rounded-full p-0.5 transition-colors"
                    onClick={() => onRemoveScenario(scenario)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-5 border-t border-white/10 shrink-0">
        <button
          onClick={onCompare}
          disabled={!((variables.length + scenarios.length + (region !== "Not Set" ? 1 : 0)) >= 2)}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          <Rocket className="w-5 h-5" />
          Compare Scenarios
        </button>
      </div>
    </div>
  );
}

export default SelectedItems;
