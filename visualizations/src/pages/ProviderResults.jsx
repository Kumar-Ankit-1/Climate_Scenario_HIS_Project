export default function ProviderResults({ results, onSelectProvider, onBack }) {
  const colors = {
    pageBg: "#f9fafb",
    cardBg: "rgba(15,23,42,0.75)",
    surface: "rgba(15,23,42,0.82)",
    accent: "#22c55e",
    accentSoft: "#bbf7d0",
    textMain: "#f9fafb",
    textMuted: "#9ca3af",
    borderSoft: "rgba(148,163,184,0.55)"
  };

  const pageStyle = {
    position: "fixed",
    inset: 0,
    background: colors.pageBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const containerStyle = {
    width: "min(960px, 100%)",
    borderRadius: 24,
    background:
      "linear-gradient(135deg, rgba(249,250,251,0.7), rgba(226,232,240,0.4))",
    boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
    border: "1px solid rgba(255,255,255,0.7)",
    backdropFilter: "blur(16px) saturate(160%)",
    WebkitBackdropFilter: "blur(16px) saturate(160%)",
    padding: "18px 18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14
  };

  const headerRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4
  };

  const titleBlockStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10
  };

  const badgePillStyle = {
    padding: "3px 10px",
    borderRadius: "999px",
    fontSize: 11,
    fontWeight: 500,
    background: "rgba(22,163,74,0.08)",
    color: "#15803d",
    border: "1px solid rgba(34,197,94,0.25)"
  };

  const backButtonStyle = {
    borderRadius: "999px",
    border: "1px solid rgba(148,163,184,0.7)",
    background: "rgba(255,255,255,0.85)",
    padding: "6px 12px",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    color: "#111827",
    transition:
      "background-color 0.12s ease, transform 0.08s ease, box-shadow 0.12s ease",
    boxShadow: "0 4px 10px rgba(148,163,184,0.35)"
  };

  const listStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 4,
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: 4
  };

  const itemBaseStyle = {
    borderRadius: 18,
    padding: "14px 16px 12px",
    cursor: "pointer",
    border: "1px solid rgba(148,163,184,0.4)",
    background: "rgba(15,23,42,0.85)",
    color: colors.textMain,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    transition:
      "transform 0.08s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease"
  };

  const itemTopStyle = {
    ...itemBaseStyle,
    border: `1px solid ${colors.accentSoft}`,
    background:
      "radial-gradient(circle at top left, rgba(34,197,94,0.22), rgba(15,23,42,0.92))",
    boxShadow: "0 14px 28px rgba(22,163,74,0.38)"
  };

  const itemHeaderRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  };

  const providerNameStyle = {
    fontSize: 16,
    fontWeight: 600,
    color: colors.textMain
  };

  const scorePillStyle = {
    borderRadius: "999px",
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(148,163,184,0.7)",
    color: colors.textMuted
  };

  const labelStyle = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: colors.textMuted
  };

  const textRowStyle = {
    fontSize: 13,
    color: colors.textMain,
    opacity: 0.92
  };

  const chipRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2
  };

  const chipStyle = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: "999px",
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(148,163,184,0.7)",
    color: colors.textMuted,
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  };

  const handleItemMouseEnter = (e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow =
      "0 10px 22px rgba(15,23,42,0.45)";
    e.currentTarget.style.borderColor = "rgba(226,232,240,0.9)";
  };

  const handleItemMouseLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.borderColor = "rgba(148,163,184,0.4)";
  };

  const handleTopItemMouseLeave = (e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 14px 28px rgba(22,163,74,0.38)";
    e.currentTarget.style.borderColor = colors.accentSoft;
  };

  const handleBackEnter = (e) => {
    e.currentTarget.style.background = "white";
    e.currentTarget.style.transform = "translateY(-1px)";
    e.currentTarget.style.boxShadow =
      "0 6px 14px rgba(148,163,184,0.45)";
  };

  const handleBackLeave = (e) => {
    e.currentTarget.style.background = "rgba(255,255,255,0.85)";
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow =
      "0 4px 10px rgba(148,163,184,0.35)";
  };

  const topProviderId = results?.[0]?.id;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRowStyle}>
          <div style={titleBlockStyle}>
            <button
              onClick={onBack}
              style={backButtonStyle}
              onMouseEnter={handleBackEnter}
              onMouseLeave={handleBackLeave}
            >
              <span>⬅</span>
              <span>Back</span>
            </button>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#0f172a"
                }}
              >
                Recommended data providers
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginTop: 2
                }}
              >
                Ranked by semantic match to your query.
              </div>
            </div>
          </div>

          {results?.length > 0 && (
            <div style={badgePillStyle}>Top match highlighted</div>
          )}
        </div>

        <div style={listStyle}>
          {results.map((item, i) => {
            const isTop = item.id === topProviderId;
            const style = isTop ? itemTopStyle : itemBaseStyle;
            const onLeave = isTop
              ? handleTopItemMouseLeave
              : handleItemMouseLeave;

            const topBadge = isTop ? (
              <span
                style={{
                  padding: "3px 9px",
                  borderRadius: "999px",
                  fontSize: 11,
                  fontWeight: 600,
                  background: "rgba(34,197,94,0.12)",
                  color: colors.accent,
                  border: "1px solid rgba(34,197,94,0.4)"
                }}
              >
                ★ Top match
              </span>
            ) : null;

            const topRank = `${i + 1}. ${item.provider}`;

            const scenarioPreview =
              item.scenarios.length > 3
                ? `${item.scenarios.slice(0, 3).join(", ")} +${
                    item.scenarios.length - 3
                  } more`
                : item.scenarios.join(", ");

            const variablePreview =
              item.variables.length > 3
                ? `${item.variables.slice(0, 3).join(", ")} +${
                    item.variables.length - 3
                  } more`
                : item.variables.join(", ");

            return (
              <div
                key={item.id ?? i}
                style={style}
                onClick={() => onSelectProvider(item.id)}
                onMouseEnter={handleItemMouseEnter}
                onMouseLeave={onLeave}
              >
                <div style={itemHeaderRowStyle}>
                  <div style={providerNameStyle}>{topRank}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {topBadge}
                    <span style={scorePillStyle}>
                      Score {item.score.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Variables</div>
                  <div style={textRowStyle}>{variablePreview}</div>
                </div>

                <div>
                  <div style={labelStyle}>Scenarios</div>
                  <div style={chipRowStyle}>
                    {item.scenarios.slice(0, 4).map((sc, idx) => (
                      <span key={idx} style={chipStyle} title={sc}>
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  Click to inspect datasets and timeseries.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
