export default function MetadataInspector({ data }) {
  if (!data.length) return null;

  const models = [...new Set(data.map((x) => x.model))];
  const variables = [...new Set(data.map((x) => x.variable))];
  const scenarios = [...new Set(data.map((x) => x.scenario))];

  return (
    <div>
      <p><b>Models:</b> {models.join(", ")}</p>
      <p><b>Variables:</b> {variables.join(", ")}</p>
      <p><b>Scenarios:</b> {scenarios.join(", ")}</p>
    </div>
  );
}
