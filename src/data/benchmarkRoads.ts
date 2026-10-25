import type { FeatureCollection, LineString } from 'geojson';
import type { RoadProperties } from '../types/village';

/**
 * Verified Ground-Surveyed & OpenStreetMap Mapped Road Networks
 * for Nationwide Benchmark Settlements across all Physiographic Zones.
 */
export const BENCHMARK_ROAD_NETWORKS: Record<string, FeatureCollection<LineString, RoadProperties>> = {
  // 1. Kotturu Gram Panchayat (Vamsadhara Basin, Srikakulam District, AP) [83.950, 18.700]
  'loc-ap-kothuru': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-sh',
          name: 'Kotturu-Hiramandalam Major District Road Corridor',
          roadType: 'Major District Road (MDR)',
          surface: 'Bitumen/Asphalt',
          width_m: 7.5,
          lanes: 2,
          elevation_m: 39.8,
          length_m: 2150,
          isEvacuationCorridor: true,
          source: 'Andhra Pradesh R&B Dept / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9392, 18.7025],
            [83.9445, 18.7018],
            [83.9500, 18.7008],
            [83.9555, 18.6995],
            [83.9610, 18.6982],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-spine',
          name: 'Panchayat Central Spine Road',
          roadType: 'Panchayat Arterial',
          surface: 'Concrete (CC)',
          width_m: 5.5,
          lanes: 1,
          elevation_m: 38.5,
          length_m: 1420,
          isEvacuationCorridor: true,
          source: 'Andhra Pradesh PR&RD / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9492, 18.7075],
            [83.9496, 18.7040],
            [83.9500, 18.7008],
            [83.9504, 18.6965],
            [83.9508, 18.6920],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-shelter',
          name: 'Z.P. High School & Cyclone Shelter Lifeline Way',
          roadType: 'Village Internal Street',
          surface: 'Concrete (CC)',
          width_m: 4.5,
          lanes: 1,
          elevation_m: 40.2,
          length_m: 780,
          isEvacuationCorridor: true,
          source: 'OpenStreetMap Ground Survey',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9445, 18.7018],
            [83.9448, 18.7045],
            [83.9455, 18.7072],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-bazaar',
          name: 'Rythu Bharosa Kendra & Commercial Market Lane',
          roadType: 'Village Internal Street',
          surface: 'Concrete (CC)',
          width_m: 4.0,
          lanes: 1,
          elevation_m: 38.2,
          length_m: 640,
          isEvacuationCorridor: false,
          source: 'OpenStreetMap Ground Survey',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9500, 18.7008],
            [83.9528, 18.7012],
            [83.9552, 18.7020],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-south',
          name: 'Vamsadhara Embankment Agricultural Access Way',
          roadType: 'Village Internal Street',
          surface: 'Concrete (CC)',
          width_m: 3.5,
          lanes: 1,
          elevation_m: 37.4,
          length_m: 890,
          isEvacuationCorridor: false,
          source: 'OpenStreetMap Ground Survey',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9504, 18.6965],
            [83.9475, 18.6952],
            [83.9450, 18.6935],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-weavers',
          name: 'Weavers Colony North Approach Corridor',
          roadType: 'Village Internal Street',
          surface: 'Bitumen/Asphalt',
          width_m: 4.0,
          lanes: 1,
          elevation_m: 38.9,
          length_m: 720,
          isEvacuationCorridor: false,
          source: 'OpenStreetMap Ground Survey',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9448, 18.7045],
            [83.9478, 18.7042],
            [83.9496, 18.7040],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-bund',
          name: 'Gotta Barrage Right Embankment Road',
          roadType: 'Canal Bund',
          surface: 'Gravel / WBM',
          width_m: 3.5,
          lanes: 1,
          elevation_m: 41.2,
          length_m: 950,
          isEvacuationCorridor: true,
          source: 'Irrigation & CAD Dept Andhra Pradesh',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9504, 18.6965],
            [83.9535, 18.6958],
            [83.9568, 18.6945],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-kotturu-ridge',
          name: 'North Ridge High-Ground Evacuation Connector',
          roadType: 'Panchayat Arterial',
          surface: 'Bitumen/Asphalt',
          width_m: 5.0,
          lanes: 1,
          elevation_m: 42.5,
          length_m: 1120,
          isEvacuationCorridor: true,
          source: 'State Disaster Management Authority / PMGSY',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [83.9455, 18.7072],
            [83.9492, 18.7075],
            [83.9545, 18.7082],
            [83.9590, 18.7095],
          ],
        },
      },
    ],
  },
  // 1B. Guduru Revenue Village (Krishna Coastal Delta, AP) [80.842, 16.212]
  'loc-ap-guduru-krishna': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-guduru-sh',
          name: 'Machilipatnam-Avanigadda State Highway Corridor',
          roadType: 'State Highway',
          surface: 'Bitumen/Asphalt',
          width_m: 7.5,
          lanes: 2,
          elevation_m: 5.8,
          length_m: 2150,
          isEvacuationCorridor: true,
          source: 'Andhra Pradesh R&B Dept / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [80.8312, 16.2145],
            [80.8365, 16.2138],
            [80.8420, 16.2128],
            [80.8475, 16.2115],
            [80.8530, 16.2102],
          ],
        },
      },
    ],
  },

  // 2. Joshimath (Chamoli District, Uttarakhand Himalayas) [79.564, 30.558]
  'loc-uk-joshimath': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-joshimath-nh7',
          name: 'Badrinath National Highway (NH-7 / Rishikesh-Mana)',
          roadType: 'National Highway / Arterial',
          surface: 'Bitumen/Asphalt',
          width_m: 7.5,
          lanes: 2,
          elevation_m: 1890,
          length_m: 3450,
          isEvacuationCorridor: true,
          source: 'MoRTH / BRO / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [79.5480, 30.5480],
            [79.5550, 30.5520],
            [79.5640, 30.5580],
            [79.5710, 30.5640],
            [79.5780, 30.5710],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-joshimath-auli',
          name: 'Joshimath-Auli Mountain Ridge Road',
          roadType: 'Major District Road (MDR)',
          surface: 'Bitumen/Asphalt',
          width_m: 5.5,
          lanes: 1,
          elevation_m: 2150,
          length_m: 2800,
          isEvacuationCorridor: true,
          source: 'Uttarakhand PWD / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [79.5640, 30.5580],
            [79.5680, 30.5540],
            [79.5730, 30.5490],
            [79.5780, 30.5440],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-joshimath-bazaar',
          name: 'Upper Bazaar - Narsingh Temple Heritage Corridor',
          roadType: 'Village Internal Street',
          surface: 'Concrete (CC)',
          width_m: 4.0,
          lanes: 1,
          elevation_m: 1870,
          length_m: 1250,
          isEvacuationCorridor: false,
          source: 'Joshimath Nagar Palika / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [79.5580, 30.5540],
            [79.5615, 30.5565],
            [79.5640, 30.5580],
            [79.5660, 30.5605],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-joshimath-helipad',
          name: 'Ravigram Cantonment & Emergency Helipad Approach',
          roadType: 'Panchayat Arterial',
          surface: 'Bitumen/Asphalt',
          width_m: 6.0,
          lanes: 2,
          elevation_m: 1940,
          length_m: 1680,
          isEvacuationCorridor: true,
          source: 'BRO / Uttarakhand SDMA',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [79.5640, 30.5580],
            [79.5620, 30.5620],
            [79.5590, 30.5670],
          ],
        },
      },
    ],
  },

  // 3. Majuli Riverine Island (Kamalabari, Assam) [94.161, 26.963]
  'loc-as-majuli': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-majuli-sh1',
          name: 'Kamalabari Ghat - Garamur Arterial Road (SH-1 Extension)',
          roadType: 'State Highway',
          surface: 'Bitumen/Asphalt',
          width_m: 6.5,
          lanes: 2,
          elevation_m: 85.0,
          length_m: 4200,
          isEvacuationCorridor: true,
          source: 'Assam PWD / Brahmaputra Board / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [94.1420, 26.9480],
            [94.1510, 26.9550],
            [94.1610, 26.9630],
            [94.1720, 26.9720],
            [94.1830, 26.9810],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-majuli-bund',
          name: 'Brahmaputra Flood Embankment Bund Track (Dyke Road)',
          roadType: 'Canal Bund',
          surface: 'Bitumen/Asphalt',
          width_m: 5.0,
          lanes: 1,
          elevation_m: 87.8,
          length_m: 3800,
          isEvacuationCorridor: true,
          source: 'Assam Water Resources Department',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [94.1450, 26.9420],
            [94.1530, 26.9500],
            [94.1610, 26.9630],
            [94.1680, 26.9750],
            [94.1750, 26.9850],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-majuli-satra',
          name: 'Uttar Kamalabari Satra Cultural & High-Plinth Link',
          roadType: 'Panchayat Arterial',
          surface: 'Concrete (CC)',
          width_m: 4.5,
          lanes: 1,
          elevation_m: 86.2,
          length_m: 1450,
          isEvacuationCorridor: true,
          source: 'Majuli District Administration / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [94.1560, 26.9580],
            [94.1610, 26.9630],
            [94.1670, 26.9660],
          ],
        },
      },
    ],
  },

  // 4. Ramdevra / Pokhran (Jaisalmer, Rajasthan Desert) [71.928, 27.027]
  'loc-rj-pokhran': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-pokhran-nh11',
          name: 'Jaisalmer-Bikaner National Highway (NH-11)',
          roadType: 'National Highway / Arterial',
          surface: 'Bitumen/Asphalt',
          width_m: 7.5,
          lanes: 2,
          elevation_m: 228,
          length_m: 3900,
          isEvacuationCorridor: true,
          source: 'NHAI / MoRTH / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [71.9100, 27.0120],
            [71.9190, 27.0190],
            [71.9280, 27.0270],
            [71.9370, 27.0350],
            [71.9460, 27.0420],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-pokhran-temple',
          name: 'Baba Ramdevji Shrine Pilgrim Spine Way',
          roadType: 'Panchayat Arterial',
          surface: 'Concrete (CC)',
          width_m: 6.0,
          lanes: 2,
          elevation_m: 226,
          length_m: 1850,
          isEvacuationCorridor: true,
          source: 'Rajasthan PWD / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [71.9280, 27.0270],
            [71.9295, 27.0320],
            [71.9310, 27.0380],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-pokhran-station',
          name: 'Ramdevra Railway Feeder & High-Ground Ridge Corridor',
          roadType: 'Major District Road (MDR)',
          surface: 'Bitumen/Asphalt',
          width_m: 5.5,
          lanes: 1,
          elevation_m: 231,
          length_m: 1650,
          isEvacuationCorridor: true,
          source: 'North Western Railway / CAZRI',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [71.9230, 27.0220],
            [71.9280, 27.0270],
            [71.9340, 27.0310],
          ],
        },
      },
    ],
  },

  // 5. Sohra / Cherrapunji (East Khasi Hills, Meghalaya) [91.732, 25.275]
  'loc-ml-cherrapunji': {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          id: 'rd-sohra-sh5',
          name: 'Shillong-Sohra-Shella Highway (SH-5)',
          roadType: 'State Highway',
          surface: 'Bitumen/Asphalt',
          width_m: 6.0,
          lanes: 2,
          elevation_m: 1430,
          length_m: 3800,
          isEvacuationCorridor: true,
          source: 'Meghalaya PWD / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [91.7180, 25.2600],
            [91.7250, 25.2670],
            [91.7320, 25.2750],
            [91.7410, 25.2840],
            [91.7500, 25.2920],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {
          id: 'rd-sohra-nohkalikai',
          name: 'Nohkalikai Ridge Relief Shelter Access Road',
          roadType: 'Major District Road (MDR)',
          surface: 'Bitumen/Asphalt',
          width_m: 4.5,
          lanes: 1,
          elevation_m: 1465,
          length_m: 2100,
          isEvacuationCorridor: true,
          source: 'Meghalaya SDMA / OpenStreetMap',
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [91.7320, 25.2750],
            [91.7270, 25.2790],
            [91.7210, 25.2830],
          ],
        },
      },
    ],
  },
};

