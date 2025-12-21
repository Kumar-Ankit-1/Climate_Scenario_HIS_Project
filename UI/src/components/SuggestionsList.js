import React from 'react';
import './SuggestionsList.css';

function SuggestionsList({ variables, scenarios, onSelectVariable, onSelectScenario }) {
  return (
    <div className="suggestions-list">
      {variables.length > 0 && (
        <div className="suggestions-group">
          <h4 className="suggestions-title">📊 Variables</h4>
          <ul className="suggestions-items">
            {variables.slice(0, 5).map((variable, index) => (
              <li
                key={`var-${index}`}
                className="suggestion-item variable-item"
                onClick={() => onSelectVariable(variable)}
              >
                <div className="suggestion-name">{variable.name}</div>
                <div className="suggestion-description">{variable.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scenarios.length > 0 && (
        <div className="suggestions-group">
          <h4 className="suggestions-title">🎯 Scenarios</h4>
          <ul className="suggestions-items">
            {scenarios.slice(0, 5).map((scenario, index) => (
              <li
                key={`scenario-${index}`}
                className="suggestion-item scenario-item"
                onClick={() => onSelectScenario(scenario)}
              >
                <div className="suggestion-name">{scenario.name}</div>
                <div className="suggestion-description">{scenario.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SuggestionsList;
