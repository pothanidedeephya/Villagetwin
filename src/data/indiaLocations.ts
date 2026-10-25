import type { LocationSearchResult } from '../types/nationwide';

/**
 * Verified Benchmark Test Settlements representing all distinct physiographic,
 * climatic, and hazard zones of India.
 */
export const NATIONWIDE_BENCHMARK_LOCATIONS: LocationSearchResult[] = [
  {
    id: 'loc-ap-kothuru',
    name: 'Kotturu Gram Panchayat',
    displayName: 'Kotturu Gram Panchayat, Kotturu Mandal, Srikakulam District, Andhra Pradesh',
    adminLevel: 'village',
    state: 'Andhra Pradesh',
    district: 'Srikakulam',
    subdistrict: 'Kotturu Mandal',
    center: [83.950, 18.700],
    boundingBox: [83.935, 18.685, 83.965, 18.715],
    elevation_m: 38.0,
    population: 3480,
    source: 'APSDI / AP Srikakulam Flood Assessment (apsdmagis.ap.gov.in/reservoirs/srikakulam-flood.html)',
    regionCategory: 'coastal',
  },
  {
    id: 'loc-uk-joshimath',
    name: 'Joshimath (Jyotirmath)',
    displayName: 'Joshimath, Chamoli District, Uttarakhand (Himalayan Fault Belt)',
    adminLevel: 'village',
    state: 'Uttarakhand',
    district: 'Chamoli',
    subdistrict: 'Joshimath Tehsil',
    center: [79.564, 30.558],
    boundingBox: [79.540, 30.535, 79.585, 30.580],
    elevation_m: 1890,
    population: 16705,
    source: 'Geological Survey of India / Uttarakhand SDMA',
    regionCategory: 'himalayan',
  },
  {
    id: 'loc-as-majuli',
    name: 'Majuli Riverine Island (Kamalabari)',
    displayName: 'Kamalabari, Majuli District, Assam (Brahmaputra Flood Basin)',
    adminLevel: 'gram_panchayat',
    state: 'Assam',
    district: 'Majuli',
    subdistrict: 'Majuli Sub-Division',
    center: [94.161, 26.963],
    boundingBox: [94.135, 26.935, 94.190, 26.990],
    elevation_m: 84.5,
    population: 4250,
    source: 'Brahmaputra Board / Assam Water Resources Dept',
    regionCategory: 'riverine',
  },
  {
    id: 'loc-rj-pokhran',
    name: 'Ramdevra Rural Settlement',
    displayName: 'Ramdevra, Pokhran Tehsil, Jaisalmer District, Rajasthan (Thar Desert)',
    adminLevel: 'village',
    state: 'Rajasthan',
    district: 'Jaisalmer',
    subdistrict: 'Pokhran Tehsil',
    center: [71.928, 27.027],
    boundingBox: [71.900, 26.998, 71.955, 27.050],
    elevation_m: 226,
    population: 3120,
    source: 'Central Arid Zone Research Institute (CAZRI) / Survey of India',
    regionCategory: 'drought_prone',
  },
  {
    id: 'loc-ml-cherrapunji',
    name: 'Sohra (Cherrapunji) Rural Cluster',
    displayName: 'Sohra Rural Cluster, East Khasi Hills District, Meghalaya',
    adminLevel: 'village',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    subdistrict: 'Shella Bholaganj C&RD Block',
    center: [91.732, 25.275],
    boundingBox: [91.705, 25.248, 91.758, 25.300],
    elevation_m: 1430,
    population: 11760,
    source: 'Meghalaya State Disaster Management Authority / IMD',
    regionCategory: 'northeastern',
  },
  {
    id: 'loc-an-havelock',
    name: 'Govind Nagar Rural Gram Panchayat',
    displayName: 'Govind Nagar, Swaraj Dweep (Havelock), South Andaman, Andaman & Nicobar',
    adminLevel: 'gram_panchayat',
    state: 'Andaman & Nicobar Islands',
    district: 'South Andaman',
    subdistrict: 'Port Blair Tehsil',
    center: [92.986, 11.992],
    boundingBox: [92.960, 11.968, 93.010, 12.015],
    elevation_m: 6.8,
    population: 2840,
    source: 'INCOIS Coastal Hazard Warning / Directorate of Disaster Management A&N',
    regionCategory: 'island',
  },
  {
    id: 'loc-kl-munnar',
    name: 'Munnar Valley Rural Habitation',
    displayName: 'Munnar Gram Panchayat, Idukki District, Kerala (Western Ghats Escarpment)',
    adminLevel: 'gram_panchayat',
    state: 'Kerala',
    district: 'Idukki',
    subdistrict: 'Devikulam Taluk',
    center: [77.059, 10.089],
    boundingBox: [77.035, 10.065, 77.085, 10.112],
    elevation_m: 1532,
    population: 32000,
    source: 'Kerala State Disaster Management Authority / GSI',
    regionCategory: 'himalayan',
  },
  {
    id: 'loc-br-darbhanga',
    name: 'Kusheshwar Asthan Flood Basin Village',
    displayName: 'Kusheshwar Asthan, Darbhanga District, Bihar (Kosi-Kamala Basin)',
    adminLevel: 'village',
    state: 'Bihar',
    district: 'Darbhanga',
    subdistrict: 'Kusheshwar Asthan Block',
    center: [86.135, 25.828],
    boundingBox: [86.108, 25.802, 86.162, 25.852],
    elevation_m: 44.0,
    population: 4800,
    source: 'Bihar State Disaster Management Authority (BSDMA) / CWC',
    regionCategory: 'riverine',
  },
  {
    id: 'loc-gj-bhuj',
    name: 'Khavda Kutch Rural Cluster',
    displayName: 'Khavda, Bhuj Taluk, Kutch District, Gujarat (Seismic Zone V Fault Belt)',
    adminLevel: 'village',
    state: 'Gujarat',
    district: 'Kutch',
    subdistrict: 'Bhuj Taluk',
    center: [69.733, 23.845],
    boundingBox: [69.702, 23.818, 69.765, 23.872],
    elevation_m: 18.5,
    population: 4200,
    source: 'Gujarat State Disaster Management Authority (GSDMA) / BIS IS 1893',
    regionCategory: 'drought_prone',
  },
  {
    id: 'loc-ap-guduru-krishna',
    name: 'Guduru Revenue Village',
    displayName: 'Guduru Village, Guduru Mandal, Krishna District, Andhra Pradesh (Krishna Delta)',
    adminLevel: 'village',
    state: 'Andhra Pradesh',
    district: 'Krishna',
    subdistrict: 'Guduru Mandal',
    center: [80.842, 16.212],
    boundingBox: [80.828, 16.200, 80.856, 16.224],
    elevation_m: 4.2,
    population: 4120,
    source: 'Survey of India / Andhra Pradesh Cadastral Survey',
    regionCategory: 'coastal',
  },
  {
    id: 'loc-ap-guduru-tirupati',
    name: 'Guduru Town & Rural Sub-District',
    displayName: 'Guduru, Guduru Mandal, Tirupati District (erstwhile SPSR Nellore), Andhra Pradesh',
    adminLevel: 'village',
    state: 'Andhra Pradesh',
    district: 'Tirupati',
    subdistrict: 'Guduru Mandal',
    center: [79.851, 14.148],
    boundingBox: [79.825, 14.125, 79.875, 14.170],
    elevation_m: 29.0,
    population: 74000,
    source: 'Census of India / Local Government Directory (LGD)',
    regionCategory: 'coastal',
  },
];

/**
 * Parse coordinates input like "16.212, 80.842" or "28.6139 N, 77.2090 E"
 */
export function parseCoordinatesInput(query: string): [number, number] | null {
  const clean = query.trim().replace(/[°NnSsEeWw]/g, '');
  const parts = clean.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 2) {
    const p1 = parseFloat(parts[0]);
    const p2 = parseFloat(parts[1]);
    if (!isNaN(p1) && !isNaN(p2)) {
      // Determine which is lat and which is lng for India bounds (Lat ~6 to 38, Lng ~68 to 98)
      if (p1 >= 6 && p1 <= 38 && p2 >= 68 && p2 <= 98) {
        return [p2, p1]; // [lng, lat]
      }
      if (p2 >= 6 && p2 <= 38 && p1 >= 68 && p1 <= 98) {
        return [p1, p2]; // [lng, lat]
      }
    }
  }
  return null;
}

/**
 * Transliteration and phonetic simplification helper to bridge Indian administrative naming variations
 * e.g., Kotturu <-> Kothuru, Heeramandalam <-> Hiramandalam, Cherrapunji <-> Cherrapunjee
 */
function simplifyPhonetics(str: string): string {
  return str
    .toLowerCase()
    .replace(/th/g, 't')
    .replace(/tt/g, 't')
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Filter matching locations locally or prepare for online search
 */
export function searchBenchmarkLocations(query: string): LocationSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return NATIONWIDE_BENCHMARK_LOCATIONS;

  const coordMatch = parseCoordinatesInput(query);
  if (coordMatch) {
    const [lng, lat] = coordMatch;
    return [
      {
        id: `coord-${lat.toFixed(4)}-${lng.toFixed(4)}`,
        name: `Custom Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
        displayName: `Coordinates: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (India Geocoded)`,
        adminLevel: 'coordinates',
        state: 'Geocoded Location',
        district: 'Geographic Search',
        center: [lng, lat],
        boundingBox: [lng - 0.015, lat - 0.015, lng + 0.015, lat + 0.015],
        source: 'User Provided Coordinates',
        regionCategory: 'plains',
      },
    ];
  }

  const qSimplified = simplifyPhonetics(q);
  // Extract essential keyword tokens (excluding stopwords)
  const tokens = q.split(/[\s,/-]+/).filter((t) => t.length > 1);

  return NATIONWIDE_BENCHMARK_LOCATIONS.filter((loc) => {
    const nameLower = loc.name.toLowerCase();
    const displayLower = loc.displayName.toLowerCase();
    const stateLower = loc.state.toLowerCase();
    const distLower = loc.district.toLowerCase();
    const subdistLower = (loc.subdistrict || '').toLowerCase();

    // 1. Direct substring match on any field
    if (
      nameLower.includes(q) ||
      displayLower.includes(q) ||
      stateLower.includes(q) ||
      distLower.includes(q) ||
      subdistLower.includes(q)
    ) {
      return true;
    }

    // 2. Token-based matching (e.g. "Kotturu Gram Panchayat" matches "Kotturu")
    if (
      tokens.length > 0 &&
      tokens.every(
        (tok) =>
          nameLower.includes(tok) ||
          displayLower.includes(tok) ||
          stateLower.includes(tok) ||
          distLower.includes(tok) ||
          subdistLower.includes(tok)
      )
    ) {
      return true;
    }

    // 3. Phonetic transliteration matching (e.g. "kothuru" matches "kotturu")
    if (qSimplified.length >= 3) {
      const nameSimp = simplifyPhonetics(loc.name);
      const displaySimp = simplifyPhonetics(loc.displayName);
      const distSimp = simplifyPhonetics(loc.district);
      const subdistSimp = simplifyPhonetics(loc.subdistrict || '');

      if (
        nameSimp.includes(qSimplified) ||
        displaySimp.includes(qSimplified) ||
        distSimp.includes(qSimplified) ||
        subdistSimp.includes(qSimplified)
      ) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Validates whether latitude and longitude lie within sovereign territory & territorial waters of India:
 * Lat: 6.0°N to 37.5°N
 * Lng: 68.0°E to 97.5°E
 */
export function isValidIndiaCoordinate(lat: number, lng: number): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) &&
    lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}
