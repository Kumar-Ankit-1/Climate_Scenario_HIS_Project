function SelectedItems({ variables, scenarios, contextData, onRemoveVariable, onRemoveScenario, onClear }) {
  const hasItems = variables.length > 0 || scenarios.length > 0;
  const region = contextData?.region || "Not Set";
  const startDate = contextData?.start_date || "---";
  const endDate = contextData?.end_date || "---";

  return (
    <div className="selected-items-sidebar">
      <div className="sidebar-header">
        <h3>🚀 Mission Control</h3>
        {hasItems && (
          <button className="clear-button" onClick={onClear} title="Clear all">
            ✕ Clear
          </button>
        )}
      </div>

      <div className="sidebar-content">
        {/* Scope Card */}
        <div className="info-card scope-card">
          <div className="card-header">
            <span className="icon">🌍</span>
            <span className="title">Scope</span>
          </div>
          <div className="card-row">
            <label>Region:</label>
            <span className="value highlight">{region}</span>
          </div>
          <div className="card-row">
            <label>Period:</label>
            <span className="value">{startDate} — {endDate}</span>
          </div>
        </div>

        <div className="divider"></div>

        {/* Variables Section */}
        <div className="items-section">
          <div className="section-header">
            <span className="icon">📊</span>
            <h4>Variables <span className="count">{variables.length}</span></h4>
          </div>

          {variables.length === 0 ? (
            <p className="empty-hint">Type to add...</p>
          ) : (
            <div className="chips-grid">
              {variables.map((variable, index) => (
                <div key={`var-${index}`} className="chip variable-chip">
                  <span>{variable}</span>
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveVariable(variable)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios Section */}
        <div className="items-section">
          <div className="section-header">
            <span className="icon">📈</span>
            <h4>Scenarios <span className="count">{scenarios.length}</span></h4>
          </div>

          {scenarios.length === 0 ? (
            <p className="empty-hint">Type to add...</p>
          ) : (
            <div className="chips-grid">
              {scenarios.map((scenario, index) => (
                <div key={`scen-${index}`} className="chip scenario-chip">
                  <span>{scenario}</span>
                  <button
                    className="remove-btn"
                    onClick={() => onRemoveScenario(scenario)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SelectedItems;
