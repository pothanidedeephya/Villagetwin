import type { VillageDataset } from '../types/village';

// Authoritative coordinates centered at Kotturu Gram Panchayat, Srikakulam District, AP
// River Basin: Vamsadhara Basin (Gotta Barrage / Hiramandalam Reach)
// Base longitude: 83.950° E, latitude: 18.700° N
const BASE_LNG = 83.950;
const BASE_LAT = 18.700;

export const DEMO_VILLAGE: VillageDataset = {
  villageName: 'Kotturu Gram Panchayat',
  district: 'Srikakulam',
  mandal: 'Kotturu Mandal',
  state: 'Andhra Pradesh',
  totalPopulation: 3480,
  center: [BASE_LNG, BASE_LAT],
  boundary: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Kotturu Revenue Village Boundary', area_sqkm: 1.84 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.012, BASE_LAT + 0.010],
              [BASE_LNG + 0.002, BASE_LAT + 0.011],
              [BASE_LNG + 0.011, BASE_LAT + 0.008],
              [BASE_LNG + 0.014, BASE_LAT - 0.002],
              [BASE_LNG + 0.012, BASE_LAT - 0.011],
              [BASE_LNG + 0.001, BASE_LAT - 0.012],
              [BASE_LNG - 0.009, BASE_LAT - 0.010],
              [BASE_LNG - 0.014, BASE_LAT - 0.001],
              [BASE_LNG - 0.012, BASE_LAT + 0.010],
            ],
          ],
        },
      },
    ],
  },
  waterBodies: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'wb-1',
          name: 'Pedda Cheruvu (Village Irrigation Tank)',
          type: 'Pedda Cheruvu (Tank)',
          normalWaterLevel_m: 4.8,
          maxRetainingCapacity_m3: 45000,
          description: 'Historical minor irrigation tank with earthen embankment bund and masonry surplus weir.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.003, BASE_LAT + 0.004],
              [BASE_LNG + 0.008, BASE_LAT + 0.005],
              [BASE_LNG + 0.009, BASE_LAT + 0.001],
              [BASE_LNG + 0.005, BASE_LAT - 0.001],
              [BASE_LNG + 0.002, BASE_LAT + 0.002],
              [BASE_LNG + 0.003, BASE_LAT + 0.004],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'wb-2',
          name: 'Chinna Vagu (Monsoonal Drainage Creek)',
          type: 'Vagu (Seasonal Stream)',
          normalWaterLevel_m: 3.5,
          maxRetainingCapacity_m3: 28000,
          description: 'Natural seasonal stream carrying surface runoff toward coastal backwaters.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.011, BASE_LAT - 0.006],
              [BASE_LNG - 0.005, BASE_LAT - 0.007],
              [BASE_LNG + 0.002, BASE_LAT - 0.009],
              [BASE_LNG + 0.010, BASE_LAT - 0.010],
              [BASE_LNG + 0.010, BASE_LAT - 0.011],
              [BASE_LNG + 0.001, BASE_LAT - 0.010],
              [BASE_LNG - 0.006, BASE_LAT - 0.008],
              [BASE_LNG - 0.011, BASE_LAT - 0.007],
              [BASE_LNG - 0.011, BASE_LAT - 0.006],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'wb-3',
          name: 'Vamsadhara Ayacut Distributary (Gotta Barrage System)',
          type: 'Irrigation Canal (Ayacut)',
          normalWaterLevel_m: 35.6,
          maxRetainingCapacity_m3: 15000,
          description: 'Lined canal supplying Vamsadhara ayacut paddy cultivation from Gotta Barrage.',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.011, BASE_LAT + 0.008],
              [BASE_LNG - 0.002, BASE_LAT + 0.006],
              [BASE_LNG + 0.006, BASE_LAT + 0.007],
              [BASE_LNG + 0.011, BASE_LAT + 0.006],
              [BASE_LNG + 0.011, BASE_LAT + 0.0055],
              [BASE_LNG + 0.006, BASE_LAT + 0.0065],
              [BASE_LNG - 0.002, BASE_LAT + 0.0055],
              [BASE_LNG - 0.011, BASE_LAT + 0.0075],
              [BASE_LNG - 0.011, BASE_LAT + 0.008],
            ],
          ],
        },
      },
    ],
  },
  roads: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-1',
          name: 'Machilipatnam-Kotturu Main Link Road',
          roadType: 'State Highway',
          width_m: 7.5,
          elevation_m: 6.8,
          surface: 'Bitumen/Asphalt',
          isEvacuationCorridor: true,
          length_m: 1650,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.012, BASE_LAT + 0.003],
            [BASE_LNG - 0.006, BASE_LAT + 0.0035],
            [BASE_LNG, BASE_LAT + 0.003],
            [BASE_LNG + 0.005, BASE_LAT + 0.0028],
            [BASE_LNG + 0.012, BASE_LAT + 0.0025],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-2',
          name: 'Panchayat Central Spine Road',
          roadType: 'Panchayat Arterial',
          width_m: 5.5,
          elevation_m: 5.6,
          surface: 'Concrete (CC)',
          isEvacuationCorridor: true,
          length_m: 980,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.001, BASE_LAT + 0.008],
            [BASE_LNG - 0.0005, BASE_LAT + 0.003],
            [BASE_LNG, BASE_LAT],
            [BASE_LNG + 0.0002, BASE_LAT - 0.005],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-3',
          name: 'Z.P. High School & Cyclone Shelter Access Way',
          roadType: 'Village Internal Street',
          width_m: 4.5,
          elevation_m: 5.2,
          surface: 'Concrete (CC)',
          isEvacuationCorridor: true,
          length_m: 550,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.005, BASE_LAT + 0.0034],
            [BASE_LNG - 0.0048, BASE_LAT + 0.001],
            [BASE_LNG - 0.0045, BASE_LAT - 0.001],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-4',
          name: 'Rythu Bazaar & Market Lane',
          roadType: 'Village Internal Street',
          width_m: 4.0,
          elevation_m: 4.9,
          surface: 'Concrete (CC)',
          isEvacuationCorridor: false,
          length_m: 480,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG, BASE_LAT + 0.003],
            [BASE_LNG + 0.003, BASE_LAT + 0.0025],
            [BASE_LNG + 0.004, BASE_LAT + 0.001],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-5',
          name: 'Harijanawada / South Settlement Lane (Low Depression)',
          roadType: 'Village Internal Street',
          width_m: 3.5,
          elevation_m: 4.1,
          surface: 'Concrete (CC)',
          isEvacuationCorridor: false,
          length_m: 620,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.0045, BASE_LAT - 0.001],
            [BASE_LNG - 0.002, BASE_LAT - 0.003],
            [BASE_LNG + 0.0002, BASE_LAT - 0.005],
            [BASE_LNG + 0.003, BASE_LAT - 0.006],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-6',
          name: 'Weavers Colony North Lane',
          roadType: 'Village Internal Street',
          width_m: 3.5,
          elevation_m: 4.7,
          surface: 'Gravel / WBM',
          isEvacuationCorridor: false,
          length_m: 510,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.008, BASE_LAT + 0.005],
            [BASE_LNG - 0.004, BASE_LAT + 0.0055],
            [BASE_LNG - 0.0005, BASE_LAT + 0.005],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-7',
          name: 'Pedda Cheruvu Bund Embankment Track',
          roadType: 'Canal Bund',
          width_m: 3.0,
          elevation_m: 6.2,
          surface: 'Gravel / WBM',
          isEvacuationCorridor: true,
          length_m: 720,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG + 0.0025, BASE_LAT + 0.004],
            [BASE_LNG + 0.004, BASE_LAT + 0.0055],
            [BASE_LNG + 0.008, BASE_LAT + 0.0055],
            [BASE_LNG + 0.009, BASE_LAT + 0.002],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-8',
          name: 'East Paddy Fields Field Access Track',
          roadType: 'Kutcha Lane',
          width_m: 2.8,
          elevation_m: 3.9,
          surface: 'Earthen',
          isEvacuationCorridor: false,
          length_m: 850,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG + 0.004, BASE_LAT + 0.001],
            [BASE_LNG + 0.007, BASE_LAT - 0.002],
            [BASE_LNG + 0.009, BASE_LAT - 0.005],
          ],
        },
      },
    ],
  },
  buildings: {
    type: 'FeatureCollection',
    properties: {
      isSynthetic: true,
      source: 'Synthetic Demo Placeholders (Illustrative Simulation Scenario)',
      notes: '24 illustrative demo rectangles generated for simulation testing. NOT from Survey of India or AP Cadastral Survey.',
    },
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'bld-1',
          name: 'Kotturu Gram Panchayat Secretariat (Sachivalayam)',
          type: 'panchayat',
          groundElevation_m: 4.8,
          plinthHeight_cm: 60,
          plinthElevation_m: 5.4,
          occupants: 28,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0008, BASE_LAT + 0.0022],
              [BASE_LNG - 0.0005, BASE_LAT + 0.0022],
              [BASE_LNG - 0.0005, BASE_LAT + 0.0020],
              [BASE_LNG - 0.0008, BASE_LAT + 0.0020],
              [BASE_LNG - 0.0008, BASE_LAT + 0.0022],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-2',
          name: 'Z.P. High School Main Academic Block',
          type: 'school',
          groundElevation_m: 5.1,
          plinthHeight_cm: 75,
          plinthElevation_m: 5.85,
          occupants: 320,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0048, BASE_LAT + 0.0028],
              [BASE_LNG - 0.0044, BASE_LAT + 0.0028],
              [BASE_LNG - 0.0044, BASE_LAT + 0.0025],
              [BASE_LNG - 0.0048, BASE_LAT + 0.0025],
              [BASE_LNG - 0.0048, BASE_LAT + 0.0028],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-3',
          name: 'Multi-Purpose Stilted Cyclone & Flood Shelter',
          type: 'school',
          groundElevation_m: 5.4,
          plinthHeight_cm: 150,
          plinthElevation_m: 6.9,
          occupants: 450,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0052, BASE_LAT + 0.0035],
              [BASE_LNG - 0.0048, BASE_LAT + 0.0035],
              [BASE_LNG - 0.0048, BASE_LAT + 0.0032],
              [BASE_LNG - 0.0052, BASE_LAT + 0.0032],
              [BASE_LNG - 0.0052, BASE_LAT + 0.0035],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-4',
          name: 'Primary Health Sub-Centre (PHC) & Maternity Clinic',
          type: 'clinic',
          groundElevation_m: 4.9,
          plinthHeight_cm: 65,
          plinthElevation_m: 5.55,
          occupants: 45,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0025, BASE_LAT + 0.0018],
              [BASE_LNG - 0.0022, BASE_LAT + 0.0018],
              [BASE_LNG - 0.0022, BASE_LAT + 0.0016],
              [BASE_LNG - 0.0025, BASE_LAT + 0.0016],
              [BASE_LNG - 0.0025, BASE_LAT + 0.0018],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-5',
          name: 'Rythu Bharosa Kendram (RBK / Farmer Agri-Centre)',
          type: 'agriculture',
          groundElevation_m: 4.7,
          plinthHeight_cm: 50,
          plinthElevation_m: 5.2,
          occupants: 35,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0005, BASE_LAT + 0.0026],
              [BASE_LNG + 0.0008, BASE_LAT + 0.0026],
              [BASE_LNG + 0.0008, BASE_LAT + 0.0024],
              [BASE_LNG + 0.0005, BASE_LAT + 0.0024],
              [BASE_LNG + 0.0005, BASE_LAT + 0.0026],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-6',
          name: 'Primary Agricultural Cooperative Society (PACS) Godown',
          type: 'agriculture',
          groundElevation_m: 4.6,
          plinthHeight_cm: 80,
          plinthElevation_m: 5.4,
          occupants: 15,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0018, BASE_LAT + 0.0016],
              [BASE_LNG + 0.0022, BASE_LAT + 0.0016],
              [BASE_LNG + 0.0022, BASE_LAT + 0.0013],
              [BASE_LNG + 0.0018, BASE_LAT + 0.0013],
              [BASE_LNG + 0.0018, BASE_LAT + 0.0016],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-7',
          name: 'Sri Sita Ramalayam Temple & Mandapam',
          type: 'religious',
          groundElevation_m: 5.0,
          plinthHeight_cm: 60,
          plinthElevation_m: 5.6,
          occupants: 80,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0018, BASE_LAT + 0.0025],
              [BASE_LNG - 0.0015, BASE_LAT + 0.0025],
              [BASE_LNG - 0.0015, BASE_LAT + 0.0022],
              [BASE_LNG - 0.0018, BASE_LAT + 0.0022],
              [BASE_LNG - 0.0018, BASE_LAT + 0.0025],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-8',
          name: 'Overhead Potable Water Service Reservoir (ELSR) & Pump Station',
          type: 'water_facility',
          groundElevation_m: 5.3,
          plinthHeight_cm: 90,
          plinthElevation_m: 6.2,
          occupants: 4,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0035, BASE_LAT + 0.0032],
              [BASE_LNG - 0.0032, BASE_LAT + 0.0032],
              [BASE_LNG - 0.0032, BASE_LAT + 0.0030],
              [BASE_LNG - 0.0035, BASE_LAT + 0.0030],
              [BASE_LNG - 0.0035, BASE_LAT + 0.0032],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-9',
          name: 'Village Post Office & Digital Seva Kiosk',
          type: 'commercial',
          groundElevation_m: 4.8,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.25,
          occupants: 18,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0012, BASE_LAT + 0.0015],
              [BASE_LNG - 0.0009, BASE_LAT + 0.0015],
              [BASE_LNG - 0.0009, BASE_LAT + 0.0013],
              [BASE_LNG - 0.0012, BASE_LAT + 0.0013],
              [BASE_LNG - 0.0012, BASE_LAT + 0.0015],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-10',
          name: 'Central Bazaar Grocery & Provisions Depot',
          type: 'commercial',
          groundElevation_m: 4.7,
          plinthHeight_cm: 40,
          plinthElevation_m: 5.1,
          occupants: 25,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0002, BASE_LAT + 0.0012],
              [BASE_LNG + 0.0002, BASE_LAT + 0.0012],
              [BASE_LNG + 0.0002, BASE_LAT + 0.0010],
              [BASE_LNG - 0.0002, BASE_LAT + 0.0010],
              [BASE_LNG - 0.0002, BASE_LAT + 0.0012],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-11',
          name: 'Village Dairy Cooperative Milk Chilling Centre',
          type: 'commercial',
          groundElevation_m: 4.7,
          plinthHeight_cm: 55,
          plinthElevation_m: 5.25,
          occupants: 20,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0012, BASE_LAT + 0.0020],
              [BASE_LNG + 0.0015, BASE_LAT + 0.0020],
              [BASE_LNG + 0.0015, BASE_LAT + 0.0018],
              [BASE_LNG + 0.0012, BASE_LAT + 0.0018],
              [BASE_LNG + 0.0012, BASE_LAT + 0.0020],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-12',
          name: 'Weavers Community Handloom Shed & Training Facility',
          type: 'commercial',
          groundElevation_m: 4.9,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.35,
          occupants: 40,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0058, BASE_LAT + 0.0048],
              [BASE_LNG - 0.0054, BASE_LAT + 0.0048],
              [BASE_LNG - 0.0054, BASE_LAT + 0.0045],
              [BASE_LNG - 0.0058, BASE_LAT + 0.0045],
              [BASE_LNG - 0.0058, BASE_LAT + 0.0048],
            ],
          ],
        },
      },
      // Weavers Colony North Habitation (Residential Plinths 13-18)
      {
        type: 'Feature',
        properties: {
          id: 'bld-13',
          name: 'Weavers Colony Habitation Plinth #1',
          type: 'residential',
          groundElevation_m: 4.8,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.25,
          occupants: 7,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0068, BASE_LAT + 0.0052],
              [BASE_LNG - 0.0065, BASE_LAT + 0.0052],
              [BASE_LNG - 0.0065, BASE_LAT + 0.0050],
              [BASE_LNG - 0.0068, BASE_LAT + 0.0050],
              [BASE_LNG - 0.0068, BASE_LAT + 0.0052],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-14',
          name: 'Weavers Colony Habitation Plinth #2',
          type: 'residential',
          groundElevation_m: 4.8,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.25,
          occupants: 6,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0052, BASE_LAT + 0.0054],
              [BASE_LNG - 0.0049, BASE_LAT + 0.0054],
              [BASE_LNG - 0.0049, BASE_LAT + 0.0052],
              [BASE_LNG - 0.0052, BASE_LAT + 0.0052],
              [BASE_LNG - 0.0052, BASE_LAT + 0.0054],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-15',
          name: 'Weavers Colony Habitation Plinth #3',
          type: 'residential',
          groundElevation_m: 4.9,
          plinthHeight_cm: 40,
          plinthElevation_m: 5.3,
          occupants: 8,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0038, BASE_LAT + 0.0053],
              [BASE_LNG - 0.0035, BASE_LAT + 0.0053],
              [BASE_LNG - 0.0035, BASE_LAT + 0.0051],
              [BASE_LNG - 0.0038, BASE_LAT + 0.0051],
              [BASE_LNG - 0.0038, BASE_LAT + 0.0053],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-16',
          name: 'Weavers Colony Habitation Plinth #4',
          type: 'residential',
          groundElevation_m: 4.9,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.35,
          occupants: 6,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0025, BASE_LAT + 0.0051],
              [BASE_LNG - 0.0022, BASE_LAT + 0.0051],
              [BASE_LNG - 0.0022, BASE_LAT + 0.0049],
              [BASE_LNG - 0.0025, BASE_LAT + 0.0049],
              [BASE_LNG - 0.0025, BASE_LAT + 0.0051],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-17',
          name: 'Weavers Colony Habitation Plinth #5',
          type: 'residential',
          groundElevation_m: 4.8,
          plinthHeight_cm: 40,
          plinthElevation_m: 5.2,
          occupants: 5,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0012, BASE_LAT + 0.0049],
              [BASE_LNG - 0.0009, BASE_LAT + 0.0049],
              [BASE_LNG - 0.0009, BASE_LAT + 0.0047],
              [BASE_LNG - 0.0012, BASE_LAT + 0.0047],
              [BASE_LNG - 0.0012, BASE_LAT + 0.0049],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-18',
          name: 'Weavers Colony Habitation Plinth #6',
          type: 'residential',
          groundElevation_m: 4.8,
          plinthHeight_cm: 45,
          plinthElevation_m: 5.25,
          occupants: 7,
          constructionType: 'Pukka (RCC)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0045, BASE_LAT + 0.0045],
              [BASE_LNG - 0.0042, BASE_LAT + 0.0045],
              [BASE_LNG - 0.0042, BASE_LAT + 0.0043],
              [BASE_LNG - 0.0045, BASE_LAT + 0.0043],
              [BASE_LNG - 0.0045, BASE_LAT + 0.0045],
            ],
          ],
        },
      },
      // Harijanawada South Colony (Residential Plinths 19-24 in Lower Elevation Depression)
      {
        type: 'Feature',
        properties: {
          id: 'bld-19',
          name: 'Harijanawada South Habitation Plinth #1',
          type: 'residential',
          groundElevation_m: 4.1,
          plinthHeight_cm: 35,
          plinthElevation_m: 4.45,
          occupants: 6,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0028, BASE_LAT - 0.0025],
              [BASE_LNG - 0.0025, BASE_LAT - 0.0025],
              [BASE_LNG - 0.0025, BASE_LAT - 0.0027],
              [BASE_LNG - 0.0028, BASE_LAT - 0.0027],
              [BASE_LNG - 0.0028, BASE_LAT - 0.0025],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-20',
          name: 'Harijanawada South Habitation Plinth #2',
          type: 'residential',
          groundElevation_m: 4.0,
          plinthHeight_cm: 35,
          plinthElevation_m: 4.35,
          occupants: 8,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0015, BASE_LAT - 0.0032],
              [BASE_LNG - 0.0012, BASE_LAT - 0.0032],
              [BASE_LNG - 0.0012, BASE_LAT - 0.0034],
              [BASE_LNG - 0.0015, BASE_LAT - 0.0034],
              [BASE_LNG - 0.0015, BASE_LAT - 0.0032],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-21',
          name: 'Harijanawada South Habitation Plinth #3',
          type: 'residential',
          groundElevation_m: 3.9,
          plinthHeight_cm: 30,
          plinthElevation_m: 4.2,
          occupants: 7,
          constructionType: 'Kutcha (Thatch/Mud)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG - 0.0002, BASE_LAT - 0.0038],
              [BASE_LNG + 0.0001, BASE_LAT - 0.0038],
              [BASE_LNG + 0.0001, BASE_LAT - 0.0040],
              [BASE_LNG - 0.0002, BASE_LAT - 0.0040],
              [BASE_LNG - 0.0002, BASE_LAT - 0.0038],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-22',
          name: 'Harijanawada South Habitation Plinth #4',
          type: 'residential',
          groundElevation_m: 3.9,
          plinthHeight_cm: 30,
          plinthElevation_m: 4.2,
          occupants: 6,
          constructionType: 'Kutcha (Thatch/Mud)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0010, BASE_LAT - 0.0042],
              [BASE_LNG + 0.0013, BASE_LAT - 0.0042],
              [BASE_LNG + 0.0013, BASE_LAT - 0.0044],
              [BASE_LNG + 0.0010, BASE_LAT - 0.0044],
              [BASE_LNG + 0.0010, BASE_LAT - 0.0042],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-23',
          name: 'Harijanawada South Habitation Plinth #5',
          type: 'residential',
          groundElevation_m: 3.8,
          plinthHeight_cm: 30,
          plinthElevation_m: 4.1,
          occupants: 9,
          constructionType: 'Semi-Pukka',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0022, BASE_LAT - 0.0045],
              [BASE_LNG + 0.0025, BASE_LAT - 0.0045],
              [BASE_LNG + 0.0025, BASE_LAT - 0.0047],
              [BASE_LNG + 0.0022, BASE_LAT - 0.0047],
              [BASE_LNG + 0.0022, BASE_LAT - 0.0045],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'bld-24',
          name: 'Harijanawada South Habitation Plinth #6',
          type: 'residential',
          groundElevation_m: 3.8,
          plinthHeight_cm: 25,
          plinthElevation_m: 4.05,
          occupants: 8,
          constructionType: 'Kutcha (Thatch/Mud)',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.0015, BASE_LAT - 0.0052],
              [BASE_LNG + 0.0018, BASE_LAT - 0.0052],
              [BASE_LNG + 0.0018, BASE_LAT - 0.0054],
              [BASE_LNG + 0.0015, BASE_LAT - 0.0054],
              [BASE_LNG + 0.0015, BASE_LAT - 0.0052],
            ],
          ],
        },
      },
    ],
  },
  drainageLines: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'dr-1',
          name: 'Central Bazaar Masonry Side Drain',
          type: 'Masonry U-Drain',
          status: 'existing',
          width_m: 0.75,
          depth_m: 0.6,
          capacity_m3s: 0.85,
          gradient_percent: 0.3,
          cost_lakhs: 8.5,
          length_m: 420,
          maintenanceStatus: 'Partially Silted',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.001, BASE_LAT + 0.0032],
            [BASE_LNG + 0.0015, BASE_LAT + 0.0026],
            [BASE_LNG + 0.0035, BASE_LAT + 0.0022],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'dr-2',
          name: 'School Approach Earthen Ditch',
          type: 'Earthen Swale',
          status: 'existing',
          width_m: 0.9,
          depth_m: 0.5,
          capacity_m3s: 0.45,
          gradient_percent: 0.2,
          cost_lakhs: 2.1,
          length_m: 340,
          maintenanceStatus: 'Choked',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.005, BASE_LAT + 0.0028],
            [BASE_LNG - 0.0048, BASE_LAT + 0.0008],
            [BASE_LNG - 0.0042, BASE_LAT - 0.0012],
          ],
        },
      },
      // Proposed Interventions:
      {
        type: 'Feature',
        properties: {
          id: 'dr-prop-1',
          name: 'Proposed South Colony High-Capacity RCC Box Drain',
          type: 'RCC Covered Box',
          status: 'proposed',
          width_m: 1.6,
          depth_m: 1.3,
          capacity_m3s: 3.4,
          gradient_percent: 0.55,
          cost_lakhs: 24.5,
          length_m: 680,
          maintenanceStatus: 'Good',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.0035, BASE_LAT - 0.002],
            [BASE_LNG - 0.0015, BASE_LAT - 0.0032],
            [BASE_LNG + 0.0005, BASE_LAT - 0.005],
            [BASE_LNG + 0.0025, BASE_LAT - 0.0075],
            [BASE_LNG + 0.002, BASE_LAT - 0.009], // Outfall into Chinna Vagu!
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'dr-prop-2',
          name: 'Proposed Bazaar Link & Desilting Upgrade',
          type: 'Masonry U-Drain',
          status: 'proposed',
          width_m: 1.2,
          depth_m: 1.0,
          capacity_m3s: 2.1,
          gradient_percent: 0.4,
          cost_lakhs: 14.8,
          length_m: 520,
          maintenanceStatus: 'Good',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG + 0.0035, BASE_LAT + 0.0022],
            [BASE_LNG + 0.0045, BASE_LAT + 0.0008],
            [BASE_LNG + 0.006, BASE_LAT - 0.0025],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'dr-prop-3',
          name: 'Proposed Z.P. School Stormwater Relief Conduit',
          type: 'Underground Pipe',
          status: 'proposed',
          width_m: 1.0,
          depth_m: 1.0,
          capacity_m3s: 1.8,
          gradient_percent: 0.5,
          cost_lakhs: 11.2,
          length_m: 380,
          maintenanceStatus: 'Good',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [BASE_LNG - 0.0042, BASE_LAT - 0.0012],
            [BASE_LNG - 0.002, BASE_LAT - 0.0025],
            [BASE_LNG - 0.0005, BASE_LAT - 0.004],
          ],
        },
      },
    ],
  },
  retentionPonds: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rp-1',
          name: 'Proposed South Wetland Sponge Retention Basin & Bio-swale',
          area_sqm: 4200,
          depth_m: 1.8,
          storage_m3: 7560,
          estimatedCost_lakhs: 18.0,
          status: 'proposed',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.001, BASE_LAT - 0.006],
              [BASE_LNG + 0.004, BASE_LAT - 0.006],
              [BASE_LNG + 0.0045, BASE_LAT - 0.008],
              [BASE_LNG + 0.0015, BASE_LAT - 0.008],
              [BASE_LNG + 0.001, BASE_LAT - 0.006],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rp-2',
          name: 'Pedda Cheruvu Deepening & Surplus Sluice Augmentation',
          area_sqm: 8500,
          depth_m: 0.8,
          storage_m3: 6800,
          estimatedCost_lakhs: 12.5,
          status: 'proposed',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [BASE_LNG + 0.004, BASE_LAT + 0.0035],
              [BASE_LNG + 0.0075, BASE_LAT + 0.0042],
              [BASE_LNG + 0.008, BASE_LAT + 0.002],
              [BASE_LNG + 0.005, BASE_LAT + 0.0015],
              [BASE_LNG + 0.004, BASE_LAT + 0.0035],
            ],
          ],
        },
      },
    ],
  },
};

/**
 * Accurately shifts spatial coordinates of a VillageDataset to a new geographic center.
 * Ensures boundary, buildings, roads, water bodies, and drainage lines align accurately
 * on Google Maps when switching village locations.
 */
function shiftGeoJsonCoords(coords: any, dLng: number, dLat: number): any {
  if (typeof coords[0] === 'number') {
    return [
      Number((coords[0] + dLng).toFixed(6)),
      Number((coords[1] + dLat).toFixed(6)),
    ];
  }
  return coords.map((c: any) => shiftGeoJsonCoords(c, dLng, dLat));
}

export function shiftVillageDataset(
  base: VillageDataset,
  newCenter: [number, number],
  villageName: string,
  district: string,
  mandal: string
): VillageDataset {
  const dLng = newCenter[0] - base.center[0];
  const dLat = newCenter[1] - base.center[1];

  return {
    ...base,
    villageName,
    district,
    mandal,
    center: newCenter,
    boundary: {
      type: 'FeatureCollection',
      features: base.boundary.features.map((f) => ({
        ...f,
        properties: { ...f.properties, name: `${villageName} Revenue Survey Boundary` },
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
    waterBodies: {
      type: 'FeatureCollection',
      features: base.waterBodies.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
    buildings: {
      type: 'FeatureCollection',
      features: base.buildings.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
    roads: {
      type: 'FeatureCollection',
      features: base.roads.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
    drainageLines: {
      type: 'FeatureCollection',
      features: base.drainageLines.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
    retentionPonds: {
      type: 'FeatureCollection',
      features: base.retentionPonds.features.map((f) => ({
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: shiftGeoJsonCoords(f.geometry.coordinates, dLng, dLat),
        },
      })),
    },
  };
}

export const VILLAGE_PRESETS: Record<string, { center: [number, number]; district: string; mandal: string }> = {
  'Kotturu Gram Panchayat': {
    center: [83.950, 18.700],
    district: 'Srikakulam',
    mandal: 'Kotturu Mandal',
  },
  'Peddapalli Village': {
    center: [81.895, 16.715],
    district: 'East Godavari',
    mandal: 'Kothapeta Mandal',
  },
  'Chinnaganjam Coastal Village': {
    center: [80.245, 15.702],
    district: 'Bapatla',
    mandal: 'Chinnaganjam Mandal',
  },
};
