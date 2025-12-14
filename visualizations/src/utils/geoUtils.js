// src/utils/geoUtils.js
// small utilities to map country names -> ISO3 and aggregate values

// Example preloaded mapping — replace by loading mock_data/country_iso.csv or fetch from public folder
import isoList from "../../mock_data/country_iso.json"; // or use fetch to load CSV

// build a map: name(lowercase) -> iso3
const nameToIso = {};
isoList.forEach(r => {
  nameToIso[(r.country_name || r.name).trim().toLowerCase()] = r.iso3;
  if (r.alt_names) {
    r.alt_names.forEach(a => nameToIso[a.trim().toLowerCase()] = r.iso3);
  }
});

export function countryNameToIso3(name) {
  if (!name) return null;
  return nameToIso[name.trim().toLowerCase()] || null;
}

// Aggregate rows to country-year-variable level and return { iso3, year, value }
export function aggregateToCountryYear(data, { model=null, scenario=null, variable=null, year=null }) {
  // filter
  let rows = data.slice();
  if (model) rows = rows.filter(r => r.model === model);
  if (scenario) rows = rows.filter(r => r.scenario === scenario);
  if (variable) rows = rows.filter(r => r.variable === variable);
  if (year) rows = rows.filter(r => r.year === year);

  // ensure iso3 exists, attempt to map from region (country name)
  rows = rows.map(r => {
    const iso3 = r.region_iso3 || countryNameToIso3(r.region);
    return { ...r, iso3 };
  }).filter(r => r.iso3);

  // group by iso3 + year
  const map = {};
  rows.forEach(r => {
    const key = `${r.iso3}__${r.year}`;
    if (!map[key]) map[key] = { iso3: r.iso3, year: r.year, value: 0 };
    // use sum aggregation; you might want avg depending on variable
    map[key].value += (Number(r.value) || 0);
  });
  return Object.values(map);
}
