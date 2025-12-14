import Papa from "papaparse";
import { useState } from "react";

export default function DataLoader({ onLoad }) {
  const [fileName, setFileName] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data.filter(
          (r) =>
            r.model &&
            r.scenario &&
            r.variable &&
            r.year !== undefined &&
            r.value !== undefined
        );

        onLoad(rows);
      }
    });
  };

  return (
    <div>
      <input type="file" onChange={handleFile} />
      {fileName && <p>Loaded: {fileName}</p>}
    </div>
  );
}
