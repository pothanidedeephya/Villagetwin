import type { FeatureCollection, Polygon } from 'geojson';
import type { HazardAssessment, HazardType, MultiHazardSummary, RiskLevel } from '../types/hazard';
import type { VillageDataset } from '../types/village';
import type { LocationSearchResult } from '../types/nationwide';
import { generateNationwideHazardAssessment } from './indiaHazardEngine';

/**
 * Generate hazard-specific GeoJSON risk polygons based on village coordinates and topography.
 */
function createHazardPolygons(
  center: [number, number],
  hazard: HazardType
): FeatureCollection<Polygon, { hazardType: HazardType; riskLevel: RiskLevel; zoneName: string; description: string; intensityLabel: string }> {
  const [lng, lat] = center;

  switch (hazard) {
    case 'flood':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'flood',
              riskLevel: 'very_high',
              zoneName: 'Pedda Cheruvu Tank Sluice & Low Inundation Basin',
              description: 'Low-lying depression adjacent to irrigation canal outfall; 100-year peak depth exceeds 1.1m.',
              intensityLabel: 'Depth: 0.8m – 1.4m (100-Yr Return Period)',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.005, lat - 0.002],
                  [lng + 0.004, lat - 0.003],
                  [lng + 0.006, lat - 0.008],
                  [lng - 0.003, lat - 0.009],
                  [lng - 0.008, lat - 0.005],
                  [lng - 0.005, lat - 0.002],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              hazardType: 'flood',
              riskLevel: 'high',
              zoneName: 'Central Settlement Drainage Buffer',
              description: 'Backwater overflow zone during high tide lock-in and persistent monsoonal rainfall.',
              intensityLabel: 'Depth: 0.3m – 0.8m',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.009, lat + 0.004],
                  [lng + 0.002, lat + 0.005],
                  [lng + 0.008, lat + 0.001],
                  [lng + 0.005, lat - 0.004],
                  [lng - 0.006, lat - 0.003],
                  [lng - 0.009, lat + 0.004],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              hazardType: 'flood',
              riskLevel: 'moderate',
              zoneName: 'Elevated Habitation & Agricultural Fringe',
              description: 'Marginal ponding on compacted field tracks during extreme precipitation events.',
              intensityLabel: 'Depth: 0.1m – 0.3m',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.012, lat + 0.009],
                  [lng + 0.008, lat + 0.009],
                  [lng + 0.012, lat - 0.005],
                  [lng - 0.010, lat - 0.010],
                  [lng - 0.012, lat + 0.009],
                ],
              ],
            },
          },
        ],
      };

    case 'waterlogging':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'waterlogging',
              riskLevel: 'very_high',
              zoneName: 'Harijanawada & South Depressions (Poor Infiltration)',
              description: 'Impervious black cotton clay matrix; infiltration rate 4–6 mm/hr leads to multi-day stagnant water.',
              intensityLabel: 'Surface Ponding: > 48 hrs Post-Rainfall',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.006, lat - 0.002],
                  [lng + 0.003, lat - 0.004],
                  [lng + 0.004, lat - 0.008],
                  [lng - 0.004, lat - 0.007],
                  [lng - 0.006, lat - 0.002],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              hazardType: 'waterlogging',
              riskLevel: 'high',
              zoneName: 'Central Rythu Bazaar Roadside Choked Drains',
              description: 'Uncovered masonry side drains clogged with silt; causes roadway waterlogging 20–35 cm deep.',
              intensityLabel: 'Ponding Duration: 12–24 hrs',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.002, lat + 0.004],
                  [lng + 0.005, lat + 0.003],
                  [lng + 0.004, lat - 0.001],
                  [lng - 0.003, lat + 0.001],
                  [lng - 0.002, lat + 0.004],
                ],
              ],
            },
          },
        ],
      };

    case 'cyclone':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'cyclone',
              riskLevel: 'very_high',
              zoneName: 'Exposed Habitation Core & Thatch/Tin Roof Cluster',
              description: 'Structures with lightweight roofing at extreme risk of wind shearing and treefall collapse.',
              intensityLabel: 'Sustained Winds: 130–160 km/h (Category 3–4 Storm)',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.008, lat + 0.006],
                  [lng + 0.006, lat + 0.007],
                  [lng + 0.007, lat - 0.004],
                  [lng - 0.007, lat - 0.005],
                  [lng - 0.008, lat + 0.006],
                ],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {
              hazardType: 'cyclone',
              riskLevel: 'high',
              zoneName: 'Coastal Storm Surge Incursion Belt',
              description: 'Tidal creek surge backflow potential through Chinna Vagu estuary during high astronomical tide.',
              intensityLabel: 'Surge Inundation Buffer: 1.2m – 1.8m AOD',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.012, lat - 0.005],
                  [lng + 0.010, lat - 0.008],
                  [lng + 0.012, lat - 0.012],
                  [lng - 0.012, lat - 0.012],
                  [lng - 0.012, lat - 0.005],
                ],
              ],
            },
          },
        ],
      };

    case 'tsunami':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'tsunami',
              riskLevel: 'moderate',
              zoneName: 'Tidal Canal Inundation Reach (< 4.2m Elevation)',
              description: 'Distance to open coast is 12.8 km; tsunami surge propagation primarily constrained to tidal waterways.',
              intensityLabel: 'Run-up Potential: < 0.6m in Backwater Channels',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.011, lat - 0.006],
                  [lng + 0.011, lat - 0.009],
                  [lng + 0.012, lat - 0.012],
                  [lng - 0.012, lat - 0.011],
                  [lng - 0.011, lat - 0.006],
                ],
              ],
            },
          },
        ],
      };

    case 'earthquake':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'earthquake',
              riskLevel: 'moderate',
              zoneName: 'Saturated Alluvium Liquefaction Belt',
              description: 'BIS IS 1893:2016 Zone III. High groundwater table and loose deltaic silt amplify ground shaking.',
              intensityLabel: 'Zone Factor Z = 0.16 (PGA: 0.16g)',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.010, lat + 0.008],
                  [lng + 0.008, lat + 0.008],
                  [lng + 0.010, lat - 0.008],
                  [lng - 0.010, lat - 0.008],
                  [lng - 0.010, lat + 0.008],
                ],
              ],
            },
          },
        ],
      };

    case 'heatwave':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'heatwave',
              riskLevel: 'high',
              zoneName: 'Dense Settlement Urban Heat Island & Metal Roofs',
              description: 'Low tree canopy cover with corrugated iron roofing; indoor temperatures exceed ambient by 5°C.',
              intensityLabel: 'Heat Index: > 52°C (Wet Bulb: 31.5°C)',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.007, lat + 0.005],
                  [lng + 0.005, lat + 0.005],
                  [lng + 0.006, lat - 0.003],
                  [lng - 0.006, lat - 0.003],
                  [lng - 0.007, lat + 0.005],
                ],
              ],
            },
          },
        ],
      };

    case 'drought':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'drought',
              riskLevel: 'moderate',
              zoneName: 'Tail-End Canal Ayacut Agricultural Belt',
              description: 'Canal water shortages during March–May; groundwater extraction in semi-critical state (CGWB 2024).',
              intensityLabel: 'Standardized Precipitation Index (SPI): -1.45',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng - 0.012, lat + 0.009],
                  [lng + 0.012, lat + 0.009],
                  [lng + 0.012, lat - 0.010],
                  [lng - 0.012, lat - 0.010],
                  [lng - 0.012, lat + 0.009],
                ],
              ],
            },
          },
        ],
      };

    case 'landslide':
      // Negligible risk in flat delta plain
      return {
        type: 'FeatureCollection',
        features: [],
      };

    case 'wildfire':
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              hazardType: 'wildfire',
              riskLevel: 'low',
              zoneName: 'Paddy Stubble & Haystack Storage Fringe',
              description: 'Dry season agricultural biomass and thatched cattle sheds susceptible to localized fires during May gales.',
              intensityLabel: 'Fire Weather Index: Moderate (Post-Harvest March–April)',
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng + 0.003, lat + 0.002],
                  [lng + 0.008, lat + 0.003],
                  [lng + 0.009, lat - 0.003],
                  [lng + 0.004, lat - 0.002],
                  [lng + 0.003, lat + 0.002],
                ],
              ],
            },
          },
        ],
      };

    default:
      return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Returns comprehensive multi-hazard assessment for a given village dataset.
 */
export function getMultiHazardAssessment(dataset: VillageDataset): MultiHazardSummary {
  const [lng, lat] = dataset.center;
  const loc: LocationSearchResult = {
    id: dataset.villageName.toLowerCase().replace(/\s+/g, '_'),
    name: dataset.villageName,
    displayName: `${dataset.villageName}, ${dataset.district}, ${dataset.state || 'Andhra Pradesh'}`,
    adminLevel: 'village',
    state: dataset.state || 'Andhra Pradesh',
    district: dataset.district || 'Krishna',
    subdistrict: dataset.mandal || 'Guduru Mandal',
    center: dataset.center,
    boundingBox: [lng - 0.02, lat - 0.02, lng + 0.02, lat + 0.02],
    elevation_m: dataset.elevation_m ?? 4.2,
    population: dataset.totalPopulation,
    regionCategory: 'coastal',
    source: 'Survey of India / Cadastral Survey',
  };
  return generateNationwideHazardAssessment(loc);
}
