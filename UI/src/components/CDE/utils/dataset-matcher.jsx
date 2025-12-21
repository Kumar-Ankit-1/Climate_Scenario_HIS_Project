function matchDatasets(datasets, query) {
  const matches = [];
  for (const dataset of datasets) {
    let score = 0;
    const strengths = [];
    const limitations = [];
    if (query.sector) {
      const hasSector = dataset.coverage.sectors.includes(query.sector);
      if (hasSector) {
        score += 30;
        strengths.push(`Includes ${query.sector} sector data`);
        if (dataset.dataQuality.sectoralDetail === "high") {
          score += 10;
          strengths.push(`High sectoral detail for ${query.sector}`);
        } else if (dataset.dataQuality.sectoralDetail === "medium") {
          score += 5;
        } else if (dataset.dataQuality.sectoralDetail === "low" || dataset.dataQuality.sectoralDetail === "none") {
          limitations.push(`Limited sectoral detail for ${query.sector}`);
        }
      } else {
        limitations.push(`Does not include ${query.sector} sector`);
      }
    }
    if (query.region) {
      const hasRegion = dataset.coverage.regions.includes(query.region);
      if (hasRegion) {
        score += 25;
        strengths.push(`Covers ${query.region} region`);
        if (dataset.dataQuality.regionalDetail === "high") {
          score += 10;
          strengths.push(`High regional detail for ${query.region}`);
        }
      } else {
        limitations.push(`Does not cover ${query.region} region`);
      }
    }
    if (query.timeStart && query.timeEnd) {
      const datasetStart = dataset.coverage.timeRange.start;
      const datasetEnd = dataset.coverage.timeRange.end;
      if (datasetStart <= query.timeStart && datasetEnd >= query.timeEnd) {
        score += 20;
        strengths.push(`Fully covers time period ${query.timeStart}-${query.timeEnd}`);
      } else if (datasetStart <= query.timeEnd && datasetEnd >= query.timeStart) {
        score += 10;
        const overlap = `${Math.max(datasetStart, query.timeStart)}-${Math.min(datasetEnd, query.timeEnd)}`;
        limitations.push(`Partial time coverage: ${overlap}`);
      } else {
        limitations.push(`Does not cover requested time period ${query.timeStart}-${query.timeEnd}`);
      }
    }
    if (query.variables && query.variables.length > 0) {
      const matchedVars = query.variables.filter(
        (v) => dataset.coverage.variables.some((dv) => dv.toLowerCase().includes(v.toLowerCase()))
      );
      if (matchedVars.length === query.variables.length) {
        score += 15;
        strengths.push(`Includes all requested variables`);
      } else if (matchedVars.length > 0) {
        score += 5;
        const missing = query.variables.filter((v) => !matchedVars.includes(v));
        limitations.push(`Missing variables: ${missing.join(", ")}`);
      }
    }
    let recommendation = "";
    if (score >= 70) {
      recommendation = "Highly recommended - Excellent match for your query with comprehensive coverage";
    } else if (score >= 50) {
      recommendation = "Recommended - Good match with most criteria met";
    } else if (score >= 30) {
      recommendation = "Partially suitable - Some gaps in coverage may require supplementary data";
    } else if (score > 0) {
      recommendation = "Limited suitability - Significant gaps in coverage";
    } else {
      recommendation = "Not recommended - Does not meet query requirements";
    }
    matches.push({
      dataset,
      matchScore: score,
      strengths,
      limitations,
      recommendation
    });
  }
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
export {
  matchDatasets
};
