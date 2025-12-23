import React from 'react';

function SuggestionsList({ variables, scenarios, onSelectVariable, onSelectScenario }) {
  return (
    <div className="py-2 bg-slate-900 text-white rounded-xl overflow-hidden">
      {variables.length > 0 && (
        <div className="border-b border-white/10 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
          <h4 className="px-4 py-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">📊 Variables</h4>
          <ul className="m-0 p-0 list-none">
            {variables.slice(0, 5).map((variable, index) => (
              <li
                key={`var-${index}`}
                className="px-4 py-3 cursor-pointer hover:bg-white/5 border-l-2 border-transparent hover:border-indigo-500 transition-colors"
                onClick={() => onSelectVariable(variable)}
              >
                <div className="text-sm font-semibold text-gray-200 mb-0.5">{variable.name}</div>
                <div className="text-xs text-gray-400 leading-snug">{variable.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="border-b border-white/10 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0">
          <h4 className="px-4 py-2 text-xs font-bold text-pink-400 uppercase tracking-wider">🎯 Scenarios</h4>
          <ul className="m-0 p-0 list-none">
            {scenarios.slice(0, 5).map((scenario, index) => (
              <li
                key={`scenario-${index}`}
                className="px-4 py-3 cursor-pointer hover:bg-white/5 border-l-2 border-transparent hover:border-pink-500 transition-colors"
                onClick={() => onSelectScenario(scenario)}
              >
                <div className="text-sm font-semibold text-gray-200 mb-0.5">{scenario.name}</div>
                <div className="text-xs text-gray-400 leading-snug">{scenario.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SuggestionsList;
