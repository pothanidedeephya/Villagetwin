import type { InfrastructureIntervention, InfrastructurePlanSummary } from '../types/infrastructure';
import type { VillageDataset } from '../types/village';

/**
 * Generate smart multi-hazard infrastructure interventions catalog centered on the active village.
 */
/**
 * Generate smart multi-hazard infrastructure interventions catalog centered on the active village.
 * Generates region-, state-, and terrain-specific engineering interventions.
 */
export function getInitialInfrastructureInterventions(dataset: VillageDataset): InfrastructureIntervention[] {
  const [lng, lat] = dataset.center;
  const state = (dataset.state || '').toLowerCase();
  const elev = typeof dataset.elevation_m === 'number' ? dataset.elevation_m : 25;
  const pop = typeof dataset.totalPopulation === 'number' && dataset.totalPopulation > 0 ? dataset.totalPopulation : 3000;

  // 1. Mountain / Northeastern / Himalayan Terrain (e.g. Sohra in Meghalaya, Joshimath in Uttarakhand)
  if (elev > 500 || state.includes('meghalaya') || state.includes('uttarakhand') || state.includes('himachal') || state.includes('ladakh') || state.includes('jammu')) {
    const isSohra = dataset.villageName.toLowerCase().includes('sohra') || dataset.villageName.toLowerCase().includes('cherrapunji');
    const sdmaName = state.includes('meghalaya')
      ? 'Meghalaya State Disaster Management Authority (MSDMA)'
      : state.includes('uttarakhand')
      ? 'Uttarakhand SDMA / Disaster Mitigation & Management Centre'
      : `${dataset.state || 'State'} Disaster Management Authority`;

    const c1: [number, number] = isSohra ? [91.73050, 25.27620] : [lng, lat];
    const c2: [number, number] = isSohra ? [91.73380, 25.27480] : [lng + 0.0015, lat + 0.0010];
    const c3: [number, number] = isSohra ? [91.73620, 25.27150] : [lng + 0.0025, lat - 0.0015];
    const c4: [number, number] = isSohra ? [91.72800, 25.27300] : [lng - 0.0020, lat - 0.0010];

    return [
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-slope-retaining`,
        name: 'Gabion-Anchored Hill Slope Retaining Wall & Rockfall Deflector',
        category: 'drainage_flood',
        description: 'Flexible tiered rock-filled wire mesh gabions with geotextile filter backing and deep soil nails along unstable roadside cutting slope.',
        technicalSpecs: 'Height: 4.5m stepped, Length: 320m, Soil Nails: 25mm dia x 9m depth @ 1.5m c/c, Subsurface Weep Drains: 75mm PVC',
        estimatedCostLakhs: 38.5,
        populationProtected: Math.round(pop * 0.55),
        riskReductionPercent: 72,
        lifespanYears: 35,
        annualMaintenanceLakhs: 0.9,
        location: [c1[0], c1[1]],
        status: 'approved',
        isEnabled: true,
        hazardsMitigated: ['landslide', 'earthquake'],
        benefitCostRatio: 4.8,
        leadAgency: `${sdmaName} / Geological Survey of India (GSI)`,
        timelineMonths: 8,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-seismic-retrofit`,
        name: 'BIS IS 1893 Zone V Life-Safety Structural Retrofitting for Lifelines',
        category: 'seismic_retrofit',
        description: 'Structural jacketing and seismic band reinforcement of community school, Anganwadi, and sub-health center under IS 4326/IS 13920 seismic standards.',
        technicalSpecs: 'Buildings: 2 Lifeline Blocks, Lintel Tie-Bands: 12mm TMT steel, Ferrocement Overlay: 30mm with weldmesh, Roof Anchors: 16mm bolts',
        estimatedCostLakhs: 14.5,
        populationProtected: Math.round(pop * 0.35),
        riskReductionPercent: 68,
        lifespanYears: 40,
        annualMaintenanceLakhs: 0.3,
        location: [c2[0], c2[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['earthquake'],
        benefitCostRatio: 4.1,
        leadAgency: 'Samagra Shiksha Abhiyan / SDRF Structural Safety Cell',
        timelineMonths: 4,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-torrent-chute`,
        name: 'Steep-Gradient Torrent Cascade & Energy Dissipation Chute',
        category: 'drainage_flood',
        description: 'Stepped reinforced concrete storm cascade chute along natural hill gully to channel extreme rainfall runoff without slope scouring or road undercut.',
        technicalSpecs: 'Length: 850m, Drop: 45m, Manning n: 0.035, Step Baffles: 18 units, Flow Capacity: 5.4 m³/s',
        estimatedCostLakhs: 28.0,
        populationProtected: Math.round(pop * 0.45),
        riskReductionPercent: 64,
        lifespanYears: 30,
        annualMaintenanceLakhs: 0.7,
        location: [c3[0], c3[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['flood', 'waterlogging', 'landslide'],
        benefitCostRatio: 4.2,
        leadAgency: `${dataset.state} PWD (Roads) / SDRF`,
        timelineMonths: 6,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-spring-recharge`,
        name: 'Springhead Rejuvenation & Infiltration Trench Corridor',
        category: 'drought_recharge',
        description: 'Catchment protection and contour infiltration trenches in the micro-watershed to maintain perennial discharge for gravity water supply during post-monsoon dry season.',
        technicalSpecs: 'Contour Trenches: 2,400m, Recharge Check Bunds: 6 units, Vegetative Riparian Buffer: 1.5 ha native evergreen trees',
        estimatedCostLakhs: 9.8,
        populationProtected: Math.round(pop * 0.60),
        riskReductionPercent: 50,
        lifespanYears: 20,
        annualMaintenanceLakhs: 0.4,
        location: [c4[0], c4[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['drought'],
        benefitCostRatio: 3.5,
        leadAgency: 'Soil & Water Conservation Dept / Jal Jeevan Mission',
        timelineMonths: 3,
      },
    ];
  }

  // 2. Arid / Desert / Drought-Prone Terrain (e.g. Pokhran in Rajasthan)
  if (state.includes('rajasthan') || state.includes('desert') || (elev < 400 && state.includes('gujarat') && lng < 72)) {
    const r1: [number, number] = [Number((lng - 0.0015).toFixed(5)), Number((lat + 0.0015).toFixed(5))];
    const r2: [number, number] = [Number((lng + 0.0020).toFixed(5)), Number((lat - 0.0010).toFixed(5))];
    const r3: [number, number] = [Number((lng - 0.0025).toFixed(5)), Number((lat - 0.0015).toFixed(5))];
    const r4: [number, number] = [Number((lng + 0.0010).toFixed(5)), Number((lat + 0.0025).toFixed(5))];

    return [
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-checkdam`,
        name: 'Masonry Check Dam & Subsurface Sand Dam Reservoir',
        category: 'drought_recharge',
        description: 'Low-profile masonry overflow check dam across seasonal desert stream bed to arrest flash stormwater runoff and recharge the shallow aquifer.',
        technicalSpecs: 'Crest Length: 45m, Height: 2.2m, Storage Volume: 28,000 m³, Recharge Wells: 3 x 35m gravel-packed shafts',
        estimatedCostLakhs: 18.5,
        populationProtected: Math.round(pop * 0.65),
        riskReductionPercent: 78,
        lifespanYears: 30,
        annualMaintenanceLakhs: 0.5,
        location: [r1[0], r1[1]],
        status: 'approved',
        isEnabled: true,
        hazardsMitigated: ['drought', 'waterlogging'],
        benefitCostRatio: 4.6,
        leadAgency: 'Rajasthan Watershed Development & Soil Conservation / SDRF',
        timelineMonths: 6,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-windbreak`,
        name: 'Multi-Tier Native Vegetative Windbreak & Sandbreak Shelterbelt',
        category: 'heat_resilience',
        description: 'Dense perimeter vegetative green belt using drought-tolerant indigenous species (Khejri, Neem, Rohida) to halt sand drift and buffer settlement from heatwaves.',
        technicalSpecs: 'Length: 3,200m, Width: 25m (5 rows of canopy trees + understory shrubs), Solar Drip System: 1 unit',
        estimatedCostLakhs: 12.0,
        populationProtected: Math.round(pop * 0.85),
        riskReductionPercent: 65,
        lifespanYears: 35,
        annualMaintenanceLakhs: 0.4,
        location: [r2[0], r2[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['heatwave', 'drought'],
        benefitCostRatio: 4.2,
        leadAgency: 'Forest Dept (Social Forestry) / MGNREGS Convergence',
        timelineMonths: 5,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-solar-borewell`,
        name: 'Solar-Powered Deep Aquifer Well & Community RO Desalination Kiosk',
        category: 'drought_recharge',
        description: 'Stand-alone 7.5 HP solar submersible pump tapping deep confined aquifer with a 2,000 LPH RO water dispensing kiosk for potable water resilience.',
        technicalSpecs: 'Borewell Depth: 180m, Solar Array: 7.5 kWp, Tank: 10,000L Overhead, RO Unit: 2,000 LPH with reject water percolation pit',
        estimatedCostLakhs: 16.0,
        populationProtected: Math.round(pop * 0.75),
        riskReductionPercent: 70,
        lifespanYears: 20,
        annualMaintenanceLakhs: 0.6,
        location: [r3[0], r3[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['drought', 'heatwave'],
        benefitCostRatio: 4.5,
        leadAgency: 'Public Health Engineering Dept (PHED) / Jal Jeevan Mission',
        timelineMonths: 4,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-cool-roofs`,
        name: 'High-Albedo Cool Roof Coating for Vulnerable Desert Dwellings',
        category: 'heat_resilience',
        description: 'Application of high Solar Reflectance Index (SRI > 105) elastomeric thermal paint on tin-roofed and kachha dwellings to reduce extreme summer heat stress.',
        technicalSpecs: 'Coated Area: 12,000 m², Surface Temperature Drop: 14°C–18°C, Indoor Ambient Drop: 5.0°C–6.5°C',
        estimatedCostLakhs: 5.2,
        populationProtected: Math.round(pop * 0.40),
        riskReductionPercent: 55,
        lifespanYears: 6,
        annualMaintenanceLakhs: 0.3,
        location: [r4[0], r4[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['heatwave'],
        benefitCostRatio: 5.4,
        leadAgency: 'Gram Panchayat Disaster Management Cell / NDMA Heat Action Plan',
        timelineMonths: 2,
      },
    ];
  }

  // 3. Riverine Floodplain / Island Terrain (e.g. Majuli in Assam, North Bihar)
  if (state.includes('assam') || dataset.villageName.toLowerCase().includes('majuli') || (elev < 100 && (state.includes('bihar') || state.includes('bengal')))) {
    const m1: [number, number] = [Number((lng - 0.0010).toFixed(5)), Number((lat + 0.0015).toFixed(5))];
    const m2: [number, number] = [Number((lng + 0.0025).toFixed(5)), Number((lat - 0.0010).toFixed(5))];
    const m3: [number, number] = [Number((lng - 0.0020).toFixed(5)), Number((lat - 0.0015).toFixed(5))];
    const m4: [number, number] = [Number((lng + 0.0015).toFixed(5)), Number((lat + 0.0020).toFixed(5))];

    return [
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-stilted-refuge`,
        name: 'Multi-Purpose Stilted Flood Platform & Livestock Highland Mound',
        category: 'drainage_flood',
        description: 'Raised earthen and reinforced concrete platform (+3.5m above High Flood Level) providing emergency haven for village families and cattle during Brahmaputra inundations.',
        technicalSpecs: 'Platform Area: 3,500 m², Height: +3.5m above HFL, Solar Microgrid: 12 kWp + 24 kWh storage, Elevated Potable Water Tank: 25,000L',
        estimatedCostLakhs: 46.0,
        populationProtected: Math.round(pop * 0.70),
        riskReductionPercent: 82,
        lifespanYears: 40,
        annualMaintenanceLakhs: 1.1,
        location: [m1[0], m1[1]],
        status: 'approved',
        isEnabled: true,
        hazardsMitigated: ['flood', 'waterlogging'],
        benefitCostRatio: 4.7,
        leadAgency: 'Assam State Disaster Management Authority (ASDMA) / Brahmaputra Board',
        timelineMonths: 8,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-embankment-revetment`,
        name: 'Geotextile-Reinforced Riverbank Revetment & Porcupine Dike',
        category: 'drainage_flood',
        description: 'Flexible geotextile sandbags and RCC permeable porcupine screens placed along active river curvature to prevent chronic bank erosion and embankment breaches.',
        technicalSpecs: 'Length: 1,200m, Geotextile Bags: 18,000 units (400 GSM), RCC Porcupines: 450 units in 3 rows',
        estimatedCostLakhs: 36.5,
        populationProtected: Math.round(pop * 0.60),
        riskReductionPercent: 75,
        lifespanYears: 25,
        annualMaintenanceLakhs: 0.9,
        location: [m2[0], m2[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['flood'],
        benefitCostRatio: 4.4,
        leadAgency: 'Assam Water Resources Dept / SDRF',
        timelineMonths: 6,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-drain-sluice`,
        name: 'Automated Drainage Outfall Sluice & Flap Gate Weir',
        category: 'drainage_flood',
        description: 'Gravity drainage culvert equipped with self-operating counterweighted flap gates to evacuate internal village rainwater into river while blocking riverine backwater ingress.',
        technicalSpecs: 'Barrels: 2 x 2.0m RCC Box, Gates: 316 Stainless Steel Flap Gates, Sump Pump: 1 x 45 HP standby diesel dewatering unit',
        estimatedCostLakhs: 22.0,
        populationProtected: Math.round(pop * 0.50),
        riskReductionPercent: 62,
        lifespanYears: 30,
        annualMaintenanceLakhs: 0.6,
        location: [m3[0], m3[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['flood', 'waterlogging'],
        benefitCostRatio: 3.9,
        leadAgency: 'Water Resources Dept / PRED',
        timelineMonths: 5,
      },
      {
        id: `infra-${dataset.villageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-elevated-clinic`,
        name: 'Climate-Resilient Raised Primary Health Sub-Center & Cold Chain',
        category: 'seismic_retrofit',
        description: 'Elevated plinth health clinic resilient against seasonal floods and seismic Zone V ground motion, equipped with solar vaccine refrigerators and clean birth facilities.',
        technicalSpecs: 'Plinth Elevation: +2.8m, Structural Standard: BIS IS 1893 Zone V, Solar Vaccine Refrigerator: WHO PQS approved, 5kVA Solar Inverter',
        estimatedCostLakhs: 24.5,
        populationProtected: Math.round(pop * 0.80),
        riskReductionPercent: 68,
        lifespanYears: 40,
        annualMaintenanceLakhs: 0.4,
        location: [m4[0], m4[1]],
        status: 'planned',
        isEnabled: true,
        hazardsMitigated: ['earthquake', 'flood'],
        benefitCostRatio: 4.3,
        leadAgency: 'National Health Mission / ASDMA',
        timelineMonths: 5,
      },
    ];
  }

  // 4. Coastal / Island / Delta Lowland (e.g. Kotturu in Andhra Pradesh, Odisha, Tamil Nadu, Kerala)
  const isKotturu = dataset.villageName.toLowerCase().includes('kotturu') || dataset.villageName.toLowerCase().includes('kothuru');
  const sdmaName = state.includes('andhra')
    ? 'Andhra Pradesh State Disaster Management Authority (APSDMA)'
    : state.includes('odisha')
    ? 'Odisha State Disaster Management Authority (OSDMA)'
    : state.includes('tamil')
    ? 'Tamil Nadu Disaster Risk Reduction Agency (TNDRRA)'
    : `${dataset.state || 'State'} Disaster Management Authority`;

  const k1: [number, number] = isKotturu ? [83.94550, 18.70720] : [lng, lat];
  const k2: [number, number] = isKotturu ? [83.95040, 18.69650] : [lng + 0.002, lat - 0.001];
  const k3: [number, number] = isKotturu ? [83.94960, 18.70400] : [lng - 0.001, lat + 0.001];
  const k4: [number, number] = isKotturu ? [83.95280, 18.70120] : [lng + 0.003, lat + 0.001];

  return [
    {
      id: 'infra-cyclone-shelter',
      name: 'Multi-Purpose Stilted Cyclone Shelter & Emergency Microgrid',
      category: 'cyclone_shelter',
      description: 'Elevated two-story RCC building on stilts (+3.0m ground clearance). Certified emergency cyclone/flood refuge with solar rooftop battery bank.',
      technicalSpecs: 'Plinth Area: 650 m², Capacity: 800 persons, Wind Resistance: 220 km/h, 15kWp Solar PV + 30kWh LiFePO4 battery, 40,000L Overhead Tank',
      estimatedCostLakhs: 52.0,
      populationProtected: Math.round(pop * 0.46), // 1,601 vulnerable persons
      riskReductionPercent: 74,
      lifespanYears: 50,
      annualMaintenanceLakhs: 1.2,
      location: [k1[0], k1[1]],
      status: 'approved',
      isEnabled: true,
      hazardsMitigated: ['cyclone', 'flood', 'heatwave'],
      benefitCostRatio: 4.6,
      leadAgency: `${sdmaName} / World Bank NCRMP`,
      timelineMonths: 10,
    },
    {
      id: 'infra-drain-box',
      name: 'RCC Box Stormwater Drain with Silt Traps',
      category: 'drainage_flood',
      description: `Covered reinforced concrete U-box storm drain (1.2m x 1.0m) along ${dataset.villageName} settlement thoroughfare with debris catchment grates.`,
      technicalSpecs: 'Length: 1,420m, Flow Capacity: 2.85 m³/s, Longitudinal Gradient: 0.35%, Silt Cleanout Chambers: 14 units',
      estimatedCostLakhs: 26.5,
      populationProtected: Math.round(pop * 0.53),
      riskReductionPercent: 58,
      lifespanYears: 30,
      annualMaintenanceLakhs: 0.8,
      location: [k2[0], k2[1]],
      status: 'planned',
      isEnabled: true,
      hazardsMitigated: ['waterlogging', 'flood'],
      benefitCostRatio: 3.8,
      leadAgency: 'Panchayat Raj Engineering Dept (PRED) / SDRF',
      timelineMonths: 5,
    },
    {
      id: 'infra-evac-corridor',
      name: 'High-Level Climate-Resilient Evacuation Corridor',
      category: 'evacuation_road',
      description: `Elevation of ${dataset.villageName} Arterial Link road by 0.75m above 100-year flood levels with concrete pavement and cross-drainage culverts.`,
      technicalSpecs: 'Road Width: 5.5m (Intermediate Lane), Length: 1,650m, Pavement: M40 Cement Concrete, Culverts: 3 x 2.0m Box Slabs',
      estimatedCostLakhs: 34.0,
      populationProtected: Math.round(pop * 0.85),
      riskReductionPercent: 62,
      lifespanYears: 25,
      annualMaintenanceLakhs: 0.5,
      location: [k3[0], k3[1]],
      status: 'planned',
      isEnabled: true,
      hazardsMitigated: ['flood', 'waterlogging', 'cyclone'],
      benefitCostRatio: 3.9,
      leadAgency: 'Roads & Buildings (R&B) Dept / PMGSY',
      timelineMonths: 6,
    },
    {
      id: 'infra-retention-tank',
      name: 'Village Sponge Wetland & Dual Recharge Shaft',
      category: 'drought_recharge',
      description: 'Desilting and embankment strengthening of the village irrigation tank to absorb peak monsoonal floods while recharging groundwater aquifers for summer resilience.',
      technicalSpecs: 'Storage Capacity: 65,000 m³, Desilting Volume: 22,000 m³, Recharge Shafts: 4 x 45m deep boreholes with inverted gravel filters',
      estimatedCostLakhs: 16.5,
      populationProtected: Math.round(pop * 0.60),
      riskReductionPercent: 48,
      lifespanYears: 20,
      annualMaintenanceLakhs: 0.6,
      location: [k4[0], k4[1]],
      status: 'planned',
      isEnabled: true,
      hazardsMitigated: ['drought', 'flood', 'waterlogging'],
      benefitCostRatio: 3.4,
      leadAgency: 'Minor Irrigation Dept / Mission Amrit Sarovar',
      timelineMonths: 4,
    },
    {
      id: 'infra-cool-roofs',
      name: 'High-Albedo Cool Roof Program for Vulnerable Dwellings',
      category: 'heat_resilience',
      description: 'Application of high Solar Reflectance Index (SRI > 105) elastomeric thermal coating on tin and asbestos-roofed households, Anganwadis, and primary school.',
      technicalSpecs: 'Coated Area: 14,500 m², Surface Temperature Drop: 12°C–16°C, Indoor Ambient Drop: 4.5°C–6.0°C, Durability: 5 Years',
      estimatedCostLakhs: 4.8,
      populationProtected: Math.round(pop * 0.36),
      riskReductionPercent: 52,
      lifespanYears: 7,
      annualMaintenanceLakhs: 0.3,
      location: [lng - 0.001, lat - 0.004],
      status: 'planned',
      isEnabled: true,
      hazardsMitigated: ['heatwave'],
      benefitCostRatio: 5.1,
      leadAgency: 'Gram Panchayat Green Mission / NDMA Heat Action Plan',
      timelineMonths: 2,
    },
    {
      id: 'infra-tidal-sluice',
      name: 'Automated Tidal Flap Gate & Sluice Weir',
      category: 'drainage_flood',
      description: 'One-way flap gate at drainage outfall that permits outward gravity discharge during low tide and automatically seals during storm surges to prevent inland backflooding.',
      technicalSpecs: 'Aperture: 2 x 1.8m Stainless Steel Neoprene Flap Gates, Maximum Head Resistance: 3.5m surge, Automated Ultrasonic Level Sensors',
      estimatedCostLakhs: 11.2,
      populationProtected: Math.round(pop * 0.40),
      riskReductionPercent: 44,
      lifespanYears: 25,
      annualMaintenanceLakhs: 0.4,
      location: [lng + 0.009, lat - 0.010],
      status: 'planned',
      isEnabled: true,
      hazardsMitigated: ['flood', 'cyclone', 'tsunami'],
      benefitCostRatio: 4.2,
      leadAgency: 'Water Resources Dept / Coastal Zone Management',
      timelineMonths: 4,
    },
  ];
}

/**
 * Compute summary statistics for selected infrastructure interventions.
 */
export function calculateInfrastructureSummary(
  interventions: InfrastructureIntervention[],
  villagePopulation?: number
): InfrastructurePlanSummary {
  const totalBudget = interventions.reduce((acc, i) => acc + i.estimatedCostLakhs, 0);
  const active = interventions.filter((i) => i.isEnabled);
  const selectedBudget = active.reduce((acc, i) => acc + i.estimatedCostLakhs, 0);

  const popCap = typeof villagePopulation === 'number' && villagePopulation > 0 ? villagePopulation : 3500;

  // Protected population with deduplication factor
  const totalProtectedRaw = active.reduce((acc, i) => acc + i.populationProtected, 0);
  const netProtected = Math.min(popCap, Math.round(totalProtectedRaw * 0.72));

  // Risk reduction weighted by individual reduction
  const avgReduction = active.length > 0
    ? Math.round(active.reduce((acc, i) => acc + i.riskReductionPercent, 0) / active.length)
    : 0;

  const avgBCR = active.length > 0
    ? Number((active.reduce((acc, i) => acc + i.benefitCostRatio, 0) / active.length).toFixed(2))
    : 0;

  return {
    totalBudgetLakhs: Number(totalBudget.toFixed(1)),
    selectedBudgetLakhs: Number(selectedBudget.toFixed(1)),
    totalInterventionsCount: interventions.length,
    activeInterventionsCount: active.length,
    netProtectedPopulation: netProtected,
    compositeRiskReductionPercent: avgReduction,
    averageBCR: avgBCR,
  };
}

/**
 * Rainwater Harvesting Catchment Yield Calculation:
 * Yield (m3) = Catchment Area (m2) * Annual/Design Rainfall (m) * Runoff Coefficient (C)
 * Standard CPWD / Central Ground Water Board (CGWB) Guidelines.
 */
export function calculateRainwaterHarvestingYield(
  catchmentArea_sqm: number,
  designRainfall_mm: number,
  runoffCoefficient: number = 0.8
): {
  harvestableVolume_m3: number;
  percolationRate_m3_day: number;
  recommendedStorage_m3: number;
} {
  const rain_m = designRainfall_mm / 1000;
  const yield_m3 = Number((catchmentArea_sqm * rain_m * runoffCoefficient).toFixed(1));
  const storage_m3 = Number((yield_m3 * 0.45).toFixed(1)); // 45% dry-spell retention sizing
  const percolationRate_m3_day = Number((storage_m3 * 0.12).toFixed(1));

  return {
    harvestableVolume_m3: yield_m3,
    percolationRate_m3_day,
    recommendedStorage_m3: storage_m3,
  };
}

/**
 * Retention Basin & Detention Pond Hydrological Sizing:
 * Storage Required = (Q_peak - Q_allowable_downstream) * Effective Inflow Duration
 */
export function calculateRetentionBasinSizing(
  peakInflow_m3s: number,
  downstreamCapacity_m3s: number,
  durationHours: number = 4
): {
  requiredStorage_m3: number;
  attenuationPercent: number;
  expectedDepthReduction_m: number;
} {
  const excessRate_m3s = Math.max(0.1, peakInflow_m3s - downstreamCapacity_m3s);
  const timeSeconds = durationHours * 3600 * 0.55; // Triangular hydrograph peak duration
  const requiredVol_m3 = Math.round(excessRate_m3s * timeSeconds);
  const attenuation = Math.min(85, Math.round(((peakInflow_m3s - downstreamCapacity_m3s) / peakInflow_m3s) * 100));
  const depthReduction = Number(Math.min(0.85, (attenuation / 100) * 0.65).toFixed(2));

  return {
    requiredStorage_m3: requiredVol_m3,
    attenuationPercent: attenuation,
    expectedDepthReduction_m: depthReduction,
  };
}

/**
 * Manning's Open-Channel Capacity Upgrade for Drainage Bottlenecks:
 * Q = (1/n) * A * R^(2/3) * S^(1/2)
 */
export function calculateDrainageCapacityUpgrade(
  requiredDischarge_m3s: number,
  slope_percent: number = 0.35,
  manning_n: number = 0.015 // Concrete box culvert
): {
  recommendedWidth_m: number;
  recommendedDepth_m: number;
  conveyanceCapacity_m3s: number;
  downstreamBackwaterRisk: 'low' | 'moderate' | 'high';
} {
  const S = Math.max(0.001, slope_percent / 100);
  const width = Math.max(1.2, Number(Math.sqrt(requiredDischarge_m3s / 1.8).toFixed(1)));
  const depth = Math.max(0.9, Number((width * 0.65).toFixed(1)));
  const A = width * depth;
  const P = width + 2 * depth;
  const R = A / P;
  const Q = Number(((1 / manning_n) * A * Math.pow(R, 2 / 3) * Math.sqrt(S)).toFixed(2));

  return {
    recommendedWidth_m: width,
    recommendedDepth_m: depth,
    conveyanceCapacity_m3s: Q,
    downstreamBackwaterRisk: slope_percent < 0.2 ? 'high' : slope_percent < 0.5 ? 'moderate' : 'low',
  };
}

/**
 * Multi-Criteria Decision Analysis (MCDA) Scoring for Infrastructure Siting:
 * Suitability = 0.30 * Hazard + 0.25 * Access + 0.20 * Terrain + 0.15 * Pop + 0.10 * Cost
 */
export function calculateMcdaSuitabilityScore(scores: {
  hazardMitigation: number; // max 30
  accessibility: number; // max 25
  terrainSuitability: number; // max 20
  populationServed: number; // max 15
  costViability: number; // max 10
}): number {
  const total =
    scores.hazardMitigation +
    scores.accessibility +
    scores.terrainSuitability +
    scores.populationServed +
    scores.costViability;
  return Math.min(100, Math.max(0, Math.round(total)));
}
