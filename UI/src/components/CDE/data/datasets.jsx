const datasets = [
  {
    id: "iiasa-ssp2-1",
    provider: "IIASA",
    name: "SSP2 Baseline - Middle of the Road",
    scenarioFamily: "SSP2",
    scenario: "SSP2-Baseline",
    description: "Medium challenges to mitigation and adaptation with moderate technological progress and economic development.",
    coverage: {
      sectors: ["Energy", "Industry", "Agriculture", "Transport", "Buildings", "Waste"],
      regions: ["Global", "Europe", "North America", "Asia", "Africa", "South America", "Oceania"],
      timeRange: { start: 1990, end: 2100 },
      variables: ["Emissions", "Temperature", "GDP", "Population", "Energy demand", "Land use"]
    },
    dataQuality: {
      sectoralDetail: "high",
      regionalDetail: "high",
      temporalResolution: "5-year intervals"
    },
    assumptions: [
      "Moderate population growth",
      "Medium economic development",
      "Gradual technological improvement",
      "Current policy trends continue"
    ],
    limitations: [
      "Assumes no major policy shifts",
      "Limited representation of extreme events"
    ]
  },
  {
    id: "iiasa-ssp1-1",
    provider: "IIASA",
    name: "SSP1 Sustainability - Green Road",
    scenarioFamily: "SSP1",
    scenario: "SSP1-2.6",
    description: "Low challenges to mitigation and adaptation with rapid technological progress and sustainable development.",
    coverage: {
      sectors: ["Energy", "Industry", "Agriculture", "Transport", "Buildings"],
      regions: ["Global", "Europe", "North America", "Asia", "Africa", "South America"],
      timeRange: { start: 2e3, end: 2100 },
      variables: ["Emissions", "Temperature", "GDP", "Population", "Energy demand", "Renewable energy"]
    },
    dataQuality: {
      sectoralDetail: "high",
      regionalDetail: "medium",
      temporalResolution: "5-year intervals"
    },
    assumptions: [
      "Low population growth",
      "High economic development",
      "Rapid clean technology adoption",
      "Strong environmental policies"
    ],
    limitations: [
      "Optimistic technology assumptions",
      "May underestimate transition challenges"
    ]
  },
  {
    id: "ipcc-ar6-1",
    provider: "IPCC",
    name: "AR6 WG3 Scenarios Database",
    scenarioFamily: "AR6",
    scenario: "AR6-SSP2-4.5",
    description: "IPCC Assessment Report 6 scenarios with medium radiative forcing.",
    coverage: {
      sectors: ["Energy", "Agriculture", "Transport"],
      regions: ["Global", "Europe", "Asia", "North America"],
      timeRange: { start: 2e3, end: 2050 },
      variables: ["Emissions", "Temperature", "Population", "Energy demand"]
    },
    dataQuality: {
      sectoralDetail: "medium",
      regionalDetail: "medium",
      temporalResolution: "10-year intervals"
    },
    assumptions: [
      "Medium mitigation efforts",
      "Balanced development pathway",
      "Moderate policy implementation"
    ],
    limitations: [
      "Limited industry sector breakdown",
      "Broader sectoral aggregation",
      "Shorter time horizon than other datasets"
    ]
  },
  {
    id: "ipcc-ar6-2",
    provider: "IPCC",
    name: "AR6 Regional Assessment",
    scenarioFamily: "AR6",
    scenario: "AR6-Regional",
    description: "Regional-focused climate scenarios from IPCC AR6.",
    coverage: {
      sectors: ["Energy", "Agriculture"],
      regions: ["Europe", "Asia", "Africa", "North America", "South America"],
      timeRange: { start: 1995, end: 2060 },
      variables: ["Emissions", "Temperature", "Precipitation", "Population"]
    },
    dataQuality: {
      sectoralDetail: "low",
      regionalDetail: "high",
      temporalResolution: "10-year intervals"
    },
    assumptions: [
      "Regional development priorities",
      "Varying policy stringency",
      "Local adaptation measures"
    ],
    limitations: [
      "Limited sectoral detail",
      "No industry-specific data",
      "Focus on regional climate impacts over economic sectors"
    ]
  },
  {
    id: "iea-nze-1",
    provider: "IEA",
    name: "Net Zero by 2050 Scenario",
    scenarioFamily: "IEA NZE",
    scenario: "NZE2050",
    description: "IEA pathway to net-zero emissions by 2050.",
    coverage: {
      sectors: ["Energy", "Industry", "Transport", "Buildings"],
      regions: ["Global", "Europe", "North America", "Asia", "Middle East"],
      timeRange: { start: 2020, end: 2050 },
      variables: ["Emissions", "Energy demand", "Technology deployment", "Investment"]
    },
    dataQuality: {
      sectoralDetail: "high",
      regionalDetail: "medium",
      temporalResolution: "Annual"
    },
    assumptions: [
      "Ambitious climate policy",
      "Rapid technology deployment",
      "High investment in clean energy",
      "Net-zero by 2050 target"
    ],
    limitations: [
      "Focused primarily on energy sector",
      "Limited agricultural data",
      "Starts from 2020 only"
    ]
  },
  {
    id: "message-ssp3-1",
    provider: "IIASA (MESSAGE)",
    name: "SSP3 Regional Rivalry",
    scenarioFamily: "SSP3",
    scenario: "SSP3-Baseline",
    description: "High challenges to mitigation and adaptation with fragmented development.",
    coverage: {
      sectors: ["Energy", "Industry", "Agriculture", "Transport"],
      regions: ["Global", "Europe", "Asia", "North America", "Africa", "Latin America"],
      timeRange: { start: 2e3, end: 2100 },
      variables: ["Emissions", "Temperature", "GDP", "Population", "Energy demand", "Resource use"]
    },
    dataQuality: {
      sectoralDetail: "high",
      regionalDetail: "high",
      temporalResolution: "5-year intervals"
    },
    assumptions: [
      "Regional focus and competition",
      "Slower technological progress",
      "High population growth in developing regions",
      "Weak international cooperation"
    ],
    limitations: [
      "Pessimistic scenario",
      "May overestimate fragmentation"
    ]
  }
];
const sectors = [
  "Energy",
  "Industry",
  "Agriculture",
  "Transport",
  "Buildings",
  "Waste",
  "Land use",
  "Forestry"
];
const regions = [
  "Global",
  "Europe",
  "North America",
  "Asia",
  "Africa",
  "South America",
  "Oceania",
  "Middle East",
  "Latin America"
];
const scenarioFamilies = [
  { id: "SSP1", name: "SSP1 - Sustainability", description: "Green road with low challenges" },
  { id: "SSP2", name: "SSP2 - Middle of the Road", description: "Medium challenges to mitigation and adaptation" },
  { id: "SSP3", name: "SSP3 - Regional Rivalry", description: "High challenges with fragmented development" },
  { id: "SSP4", name: "SSP4 - Inequality", description: "Unequal development across regions" },
  { id: "SSP5", name: "SSP5 - Fossil-fueled Development", description: "High energy demand and emissions" },
  { id: "AR6", name: "IPCC AR6", description: "Assessment Report 6 scenarios" },
  { id: "IEA NZE", name: "IEA Net Zero", description: "Pathways to net-zero emissions" }
];
export {
  datasets,
  regions,
  scenarioFamilies,
  sectors
};
