// src/components/MatchResults.jsx
export default function MatchResults({ results, onProviderSelect }) {
  if (!results || results.length === 0) {
    return <p>No matches found.</p>;
  }

  return (
    <div style={{ marginTop: 30 }}>
      <h2>🔎 Best Matches</h2>

      {results.map((item, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ddd",
            padding: 15,
            borderRadius: 6,
            marginBottom: 15,
            background: "#fafafa"
          }}
        >
          <h3>
            {i === 0 ? "⭐ Best Match: " : ""}
            {item.provider}
          </h3>

          <p><b>Score:</b> {item.score.toFixed(2)}</p>
          <p><b>Variables:</b> {item.variables.join(", ")}</p>
          <p><b>Scenarios:</b> {item.scenarios.join(", ")}</p>
          <p><b>Regions:</b> {item.regions.join(", ")}</p>
          <p><b>Granularity:</b> {item.granularity}</p>

          <button
            style={{ marginTop: 10, padding: "8px 15px", cursor: "pointer" }}
            onClick={() =>
              onProviderSelect(item.file, item.provider)
            }
          >
            Load This Dataset →
          </button>
        </div>
      ))}
    </div>
  );
}
