import type { LocationSearchResult, IndiaAdministrativeLevel } from '../types/nationwide';

/**
 * Authoritative Indian State / Union Territory Metadata Structure
 * Complies with Local Government Directory (LGD), Ministry of Panchayati Raj, GoI.
 */
export interface StateUTInfo {
  name: string;
  code: string; // ISO 3166-2:IN (e.g. 'IN-AP')
  shortCode: string; // 'AP', 'MH', etc.
  lgdCode: number;
  type: 'state' | 'union_territory';
  capital: string;
  center: [number, number]; // [lng, lat]
  boundingBox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  regionCategory: 'himalayan' | 'coastal' | 'riverine' | 'drought_prone' | 'northeastern' | 'island' | 'plains';
  districtsCount: number;
}

export interface DistrictInfo {
  name: string;
  stateName: string;
  stateCode: string;
  lgdCode?: number;
  center: [number, number];
  boundingBox: [number, number, number, number];
  headquarters?: string;
  regionCategory: 'himalayan' | 'coastal' | 'riverine' | 'drought_prone' | 'northeastern' | 'island' | 'plains';
}

/**
 * All 28 States and 8 Union Territories of the Republic of India (Total: 36)
 * Source: Ministry of Home Affairs (MHA) & Local Government Directory (LGD)
 */
export const ALL_INDIAN_STATES_AND_UTS: StateUTInfo[] = [
  // 28 States
  {
    name: 'Andhra Pradesh',
    code: 'IN-AP',
    shortCode: 'AP',
    lgdCode: 28,
    type: 'state',
    capital: 'Amaravati',
    center: [80.50, 15.91],
    boundingBox: [76.76, 12.62, 84.75, 19.15],
    regionCategory: 'coastal',
    districtsCount: 26,
  },
  {
    name: 'Arunachal Pradesh',
    code: 'IN-AR',
    shortCode: 'AR',
    lgdCode: 12,
    type: 'state',
    capital: 'Itanagar',
    center: [94.72, 28.21],
    boundingBox: [91.50, 26.65, 97.42, 29.50],
    regionCategory: 'northeastern',
    districtsCount: 26,
  },
  {
    name: 'Assam',
    code: 'IN-AS',
    shortCode: 'AS',
    lgdCode: 18,
    type: 'state',
    capital: 'Dispur',
    center: [92.93, 26.20],
    boundingBox: [89.70, 24.15, 96.02, 27.97],
    regionCategory: 'riverine',
    districtsCount: 35,
  },
  {
    name: 'Bihar',
    code: 'IN-BR',
    shortCode: 'BR',
    lgdCode: 10,
    type: 'state',
    capital: 'Patna',
    center: [85.31, 25.09],
    boundingBox: [83.32, 24.28, 88.30, 27.52],
    regionCategory: 'riverine',
    districtsCount: 38,
  },
  {
    name: 'Chhattisgarh',
    code: 'IN-CG',
    shortCode: 'CG',
    lgdCode: 22,
    type: 'state',
    capital: 'Raipur',
    center: [81.86, 21.27],
    boundingBox: [80.25, 17.78, 84.40, 24.10],
    regionCategory: 'plains',
    districtsCount: 33,
  },
  {
    name: 'Goa',
    code: 'IN-GA',
    shortCode: 'GA',
    lgdCode: 30,
    type: 'state',
    capital: 'Panaji',
    center: [74.12, 15.29],
    boundingBox: [73.68, 14.89, 74.35, 15.80],
    regionCategory: 'coastal',
    districtsCount: 2,
  },
  {
    name: 'Gujarat',
    code: 'IN-GJ',
    shortCode: 'GJ',
    lgdCode: 24,
    type: 'state',
    capital: 'Gandhinagar',
    center: [71.19, 22.25],
    boundingBox: [68.12, 20.10, 74.48, 24.70],
    regionCategory: 'coastal',
    districtsCount: 33,
  },
  {
    name: 'Haryana',
    code: 'IN-HR',
    shortCode: 'HR',
    lgdCode: 6,
    type: 'state',
    capital: 'Chandigarh',
    center: [76.08, 29.05],
    boundingBox: [74.45, 27.65, 77.60, 30.92],
    regionCategory: 'plains',
    districtsCount: 22,
  },
  {
    name: 'Himachal Pradesh',
    code: 'IN-HP',
    shortCode: 'HP',
    lgdCode: 2,
    type: 'state',
    capital: 'Shimla',
    center: [77.17, 31.10],
    boundingBox: [75.58, 30.38, 79.02, 33.22],
    regionCategory: 'himalayan',
    districtsCount: 12,
  },
  {
    name: 'Jharkhand',
    code: 'IN-JH',
    shortCode: 'JH',
    lgdCode: 20,
    type: 'state',
    capital: 'Ranchi',
    center: [85.33, 23.61],
    boundingBox: [83.32, 21.96, 87.95, 25.35],
    regionCategory: 'plains',
    districtsCount: 24,
  },
  {
    name: 'Karnataka',
    code: 'IN-KA',
    shortCode: 'KA',
    lgdCode: 29,
    type: 'state',
    capital: 'Bengaluru',
    center: [75.71, 15.31],
    boundingBox: [74.05, 11.59, 78.59, 18.45],
    regionCategory: 'plains',
    districtsCount: 31,
  },
  {
    name: 'Kerala',
    code: 'IN-KL',
    shortCode: 'KL',
    lgdCode: 32,
    type: 'state',
    capital: 'Thiruvananthapuram',
    center: [76.27, 10.85],
    boundingBox: [74.85, 8.28, 77.42, 12.80],
    regionCategory: 'coastal',
    districtsCount: 14,
  },
  {
    name: 'Madhya Pradesh',
    code: 'IN-MP',
    shortCode: 'MP',
    lgdCode: 23,
    type: 'state',
    capital: 'Bhopal',
    center: [77.41, 23.25],
    boundingBox: [74.03, 21.07, 82.80, 26.87],
    regionCategory: 'plains',
    districtsCount: 55,
  },
  {
    name: 'Maharashtra',
    code: 'IN-MH',
    shortCode: 'MH',
    lgdCode: 27,
    type: 'state',
    capital: 'Mumbai',
    center: [75.71, 19.75],
    boundingBox: [72.60, 15.60, 80.90, 22.05],
    regionCategory: 'coastal',
    districtsCount: 36,
  },
  {
    name: 'Manipur',
    code: 'IN-MN',
    shortCode: 'MN',
    lgdCode: 14,
    type: 'state',
    capital: 'Imphal',
    center: [93.90, 24.66],
    boundingBox: [92.98, 23.83, 94.75, 25.68],
    regionCategory: 'northeastern',
    districtsCount: 16,
  },
  {
    name: 'Meghalaya',
    code: 'IN-ML',
    shortCode: 'ML',
    lgdCode: 17,
    type: 'state',
    capital: 'Shillong',
    center: [91.36, 25.46],
    boundingBox: [89.82, 25.02, 92.80, 26.12],
    regionCategory: 'northeastern',
    districtsCount: 12,
  },
  {
    name: 'Mizoram',
    code: 'IN-MZ',
    shortCode: 'MZ',
    lgdCode: 15,
    type: 'state',
    capital: 'Aizawl',
    center: [92.93, 23.16],
    boundingBox: [92.25, 21.95, 93.45, 24.52],
    regionCategory: 'northeastern',
    districtsCount: 11,
  },
  {
    name: 'Nagaland',
    code: 'IN-NL',
    shortCode: 'NL',
    lgdCode: 13,
    type: 'state',
    capital: 'Kohima',
    center: [94.56, 26.15],
    boundingBox: [93.33, 25.10, 95.25, 27.05],
    regionCategory: 'northeastern',
    districtsCount: 16,
  },
  {
    name: 'Odisha',
    code: 'IN-OD',
    shortCode: 'OD',
    lgdCode: 21,
    type: 'state',
    capital: 'Bhubaneswar',
    center: [85.09, 20.95],
    boundingBox: [81.38, 17.80, 87.50, 22.58],
    regionCategory: 'coastal',
    districtsCount: 30,
  },
  {
    name: 'Punjab',
    code: 'IN-PB',
    shortCode: 'PB',
    lgdCode: 3,
    type: 'state',
    capital: 'Chandigarh',
    center: [75.34, 31.14],
    boundingBox: [73.88, 29.55, 76.92, 32.50],
    regionCategory: 'plains',
    districtsCount: 23,
  },
  {
    name: 'Rajasthan',
    code: 'IN-RJ',
    shortCode: 'RJ',
    lgdCode: 8,
    type: 'state',
    capital: 'Jaipur',
    center: [74.21, 27.02],
    boundingBox: [69.50, 23.05, 78.28, 30.20],
    regionCategory: 'drought_prone',
    districtsCount: 50,
  },
  {
    name: 'Sikkim',
    code: 'IN-SK',
    shortCode: 'SK',
    lgdCode: 11,
    type: 'state',
    capital: 'Gangtok',
    center: [88.51, 27.53],
    boundingBox: [88.00, 27.08, 88.92, 28.12],
    regionCategory: 'himalayan',
    districtsCount: 6,
  },
  {
    name: 'Tamil Nadu',
    code: 'IN-TN',
    shortCode: 'TN',
    lgdCode: 33,
    type: 'state',
    capital: 'Chennai',
    center: [78.65, 11.12],
    boundingBox: [76.23, 8.08, 80.35, 13.58],
    regionCategory: 'coastal',
    districtsCount: 38,
  },
  {
    name: 'Telangana',
    code: 'IN-TG',
    shortCode: 'TG',
    lgdCode: 36,
    type: 'state',
    capital: 'Hyderabad',
    center: [79.01, 18.11],
    boundingBox: [77.25, 15.83, 81.32, 19.92],
    regionCategory: 'plains',
    districtsCount: 33,
  },
  {
    name: 'Tripura',
    code: 'IN-TR',
    shortCode: 'TR',
    lgdCode: 16,
    type: 'state',
    capital: 'Agartala',
    center: [91.98, 23.94],
    boundingBox: [91.15, 22.93, 92.35, 24.53],
    regionCategory: 'northeastern',
    districtsCount: 8,
  },
  {
    name: 'Uttar Pradesh',
    code: 'IN-UP',
    shortCode: 'UP',
    lgdCode: 9,
    type: 'state',
    capital: 'Lucknow',
    center: [80.94, 26.84],
    boundingBox: [77.10, 23.87, 84.65, 30.42],
    regionCategory: 'plains',
    districtsCount: 75,
  },
  {
    name: 'Uttarakhand',
    code: 'IN-UK',
    shortCode: 'UK',
    lgdCode: 5,
    type: 'state',
    capital: 'Dehradun',
    center: [79.01, 30.06],
    boundingBox: [77.58, 28.72, 81.05, 31.45],
    regionCategory: 'himalayan',
    districtsCount: 13,
  },
  {
    name: 'West Bengal',
    code: 'IN-WB',
    shortCode: 'WB',
    lgdCode: 19,
    type: 'state',
    capital: 'Kolkata',
    center: [87.85, 22.98],
    boundingBox: [85.82, 21.52, 89.88, 27.22],
    regionCategory: 'coastal',
    districtsCount: 23,
  },

  // 8 Union Territories
  {
    name: 'Andaman & Nicobar Islands',
    code: 'IN-AN',
    shortCode: 'AN',
    lgdCode: 35,
    type: 'union_territory',
    capital: 'Port Blair',
    center: [92.74, 11.62],
    boundingBox: [92.20, 6.75, 93.95, 13.70],
    regionCategory: 'island',
    districtsCount: 3,
  },
  {
    name: 'Chandigarh',
    code: 'IN-CH',
    shortCode: 'CH',
    lgdCode: 4,
    type: 'union_territory',
    capital: 'Chandigarh',
    center: [76.77, 30.73],
    boundingBox: [76.72, 30.68, 76.84, 30.79],
    regionCategory: 'plains',
    districtsCount: 1,
  },
  {
    name: 'Dadra & Nagar Haveli and Daman & Diu',
    code: 'IN-DH',
    shortCode: 'DH',
    lgdCode: 26,
    type: 'union_territory',
    capital: 'Daman',
    center: [72.93, 20.39],
    boundingBox: [70.88, 20.15, 73.22, 20.75],
    regionCategory: 'coastal',
    districtsCount: 3,
  },
  {
    name: 'Delhi (NCT)',
    code: 'IN-DL',
    shortCode: 'DL',
    lgdCode: 7,
    type: 'union_territory',
    capital: 'New Delhi',
    center: [77.10, 28.70],
    boundingBox: [76.84, 28.40, 77.35, 28.88],
    regionCategory: 'plains',
    districtsCount: 11,
  },
  {
    name: 'Jammu & Kashmir',
    code: 'IN-JK',
    shortCode: 'JK',
    lgdCode: 1,
    type: 'union_territory',
    capital: 'Srinagar / Jammu',
    center: [74.79, 33.77],
    boundingBox: [73.75, 32.28, 76.80, 35.15],
    regionCategory: 'himalayan',
    districtsCount: 20,
  },
  {
    name: 'Ladakh',
    code: 'IN-LA',
    shortCode: 'LA',
    lgdCode: 37,
    type: 'union_territory',
    capital: 'Leh',
    center: [77.57, 34.15],
    boundingBox: [75.50, 32.50, 79.95, 36.00],
    regionCategory: 'himalayan',
    districtsCount: 2,
  },
  {
    name: 'Lakshadweep',
    code: 'IN-LD',
    shortCode: 'LD',
    lgdCode: 31,
    type: 'union_territory',
    capital: 'Kavaratti',
    center: [72.64, 10.56],
    boundingBox: [71.60, 8.25, 74.50, 12.45],
    regionCategory: 'island',
    districtsCount: 1,
  },
  {
    name: 'Puducherry',
    code: 'IN-PY',
    shortCode: 'PY',
    lgdCode: 34,
    type: 'union_territory',
    capital: 'Puducherry',
    center: [79.80, 11.94],
    boundingBox: [79.65, 11.85, 80.00, 12.05],
    regionCategory: 'coastal',
    districtsCount: 4,
  },
];

/**
 * All-India National Entity (Top of Hierarchy)
 */
export const ALL_INDIA_NATIONAL_LOCATION: LocationSearchResult = {
  id: 'loc-in-all',
  name: 'India (All-India Overview)',
  displayName: 'Republic of India (Nationwide Overview)',
  adminLevel: 'country' as any,
  state: 'National Level',
  district: 'All-India Coverage',
  center: [78.9629, 22.5937],
  boundingBox: [68.1, 6.7, 97.4, 37.1],
  elevation_m: 160,
  population: 1400000000,
  source: 'Survey of India / Ministry of Home Affairs (MHA)',
  regionCategory: 'plains',
};

/**
 * State-specific administrative designation for subdistricts in India.
 * Reflects authentic statutory terminology across all 36 States and Union Territories.
 */
export function getSubdistrictTypeByState(
  stateName: string
): 'Mandal' | 'Taluk' | 'Tehsil' | 'CD Block' | 'Circle / Sub-Division' {
  const s = (stateName || '').toLowerCase();
  if (s.includes('andhra') || s.includes('telangana')) {
    return 'Mandal';
  }
  if (
    s.includes('karnataka') ||
    s.includes('maharashtra') ||
    s.includes('tamil nadu') ||
    s.includes('kerala') ||
    s.includes('gujarat') ||
    s.includes('goa') ||
    s.includes('puducherry')
  ) {
    return 'Taluk';
  }
  if (s.includes('west bengal') || s.includes('bihar') || s.includes('jharkhand')) {
    return 'CD Block';
  }
  if (
    s.includes('assam') ||
    s.includes('arunachal') ||
    s.includes('meghalaya') ||
    s.includes('nagaland') ||
    s.includes('manipur') ||
    s.includes('mizoram') ||
    s.includes('sikkim') ||
    s.includes('tripura') ||
    s.includes('lakshadweep')
  ) {
    return 'Circle / Sub-Division';
  }
  // Default for Northern, Central, and Gangetic plains (UP, MP, Uttarakhand, Rajasthan, HP, Punjab, Haryana, Delhi, J&K, Ladakh, Bihar, Chhattisgarh)
  return 'Tehsil';
}

/**
 * Key Representative District Gazetteers for Quick Hierarchical Navigation across States
 * Authoritative coverage for all 36 States and Union Territories of India.
 */
export const REPRESENTATIVE_DISTRICTS: Record<string, DistrictInfo[]> = {
  'Andhra Pradesh': [
    { name: 'Srikakulam', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 519, center: [83.90, 18.30], boundingBox: [83.50, 18.00, 84.80, 19.15], regionCategory: 'coastal' },
    { name: 'Visakhapatnam', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 520, center: [83.30, 17.68], boundingBox: [83.00, 17.50, 83.50, 18.00], regionCategory: 'coastal' },
    { name: 'Krishna', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 510, center: [80.84, 16.21], boundingBox: [80.50, 15.90, 81.30, 16.60], regionCategory: 'coastal' },
    { name: 'East Godavari', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 505, center: [81.80, 17.00], boundingBox: [81.30, 16.60, 82.40, 17.50], regionCategory: 'coastal' },
    { name: 'Ananthapuramu', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 502, center: [77.60, 14.68], boundingBox: [76.80, 13.70, 78.40, 15.20], regionCategory: 'drought_prone' },
    { name: 'Tirupati', stateName: 'Andhra Pradesh', stateCode: 'AP', lgdCode: 742, center: [79.85, 13.62], boundingBox: [79.40, 13.20, 80.20, 14.20], regionCategory: 'coastal' },
  ],
  'Arunachal Pradesh': [
    { name: 'Papum Pare', stateName: 'Arunachal Pradesh', stateCode: 'AR', lgdCode: 236, center: [93.60, 27.15], boundingBox: [93.20, 26.90, 94.00, 27.50], regionCategory: 'northeastern' },
    { name: 'Tawang', stateName: 'Arunachal Pradesh', stateCode: 'AR', lgdCode: 242, center: [91.86, 27.58], boundingBox: [91.50, 27.30, 92.20, 27.90], regionCategory: 'himalayan' },
  ],
  'Assam': [
    { name: 'Majuli', stateName: 'Assam', stateCode: 'AS', lgdCode: 706, center: [94.16, 26.96], boundingBox: [93.90, 26.80, 94.40, 27.20], regionCategory: 'riverine' },
    { name: 'Kamrup Metropolitan', stateName: 'Assam', stateCode: 'AS', lgdCode: 298, center: [91.73, 26.18], boundingBox: [91.50, 25.90, 92.10, 26.40], regionCategory: 'riverine' },
    { name: 'Cachar', stateName: 'Assam', stateCode: 'AS', lgdCode: 290, center: [92.79, 24.83], boundingBox: [92.40, 24.40, 93.20, 25.10], regionCategory: 'riverine' },
    { name: 'Dhubri', stateName: 'Assam', stateCode: 'AS', lgdCode: 292, center: [89.98, 26.02], boundingBox: [89.60, 25.80, 90.40, 26.30], regionCategory: 'riverine' },
  ],
  'Bihar': [
    { name: 'Darbhanga', stateName: 'Bihar', stateCode: 'BR', lgdCode: 194, center: [86.13, 25.82], boundingBox: [85.70, 25.60, 86.40, 26.30], regionCategory: 'riverine' },
    { name: 'Patna', stateName: 'Bihar', stateCode: 'BR', lgdCode: 209, center: [85.13, 25.60], boundingBox: [84.70, 25.20, 85.70, 25.80], regionCategory: 'riverine' },
    { name: 'Bhagalpur', stateName: 'Bihar', stateCode: 'BR', lgdCode: 190, center: [87.00, 25.25], boundingBox: [86.60, 25.00, 87.30, 25.50], regionCategory: 'riverine' },
  ],
  'Chhattisgarh': [
    { name: 'Raipur', stateName: 'Chhattisgarh', stateCode: 'CG', lgdCode: 387, center: [81.63, 21.25], boundingBox: [81.20, 20.80, 82.10, 21.60], regionCategory: 'plains' },
    { name: 'Bastar', stateName: 'Chhattisgarh', stateCode: 'CG', lgdCode: 374, center: [81.95, 19.08], boundingBox: [81.50, 18.50, 82.40, 19.80], regionCategory: 'plains' },
  ],
  'Goa': [
    { name: 'North Goa', stateName: 'Goa', stateCode: 'GA', lgdCode: 550, center: [73.83, 15.55], boundingBox: [73.65, 15.30, 74.25, 15.80], regionCategory: 'coastal' },
    { name: 'South Goa', stateName: 'Goa', stateCode: 'GA', lgdCode: 551, center: [74.00, 15.20], boundingBox: [73.75, 14.90, 74.35, 15.45], regionCategory: 'coastal' },
  ],
  'Gujarat': [
    { name: 'Kutch', stateName: 'Gujarat', stateCode: 'GJ', lgdCode: 447, center: [69.73, 23.84], boundingBox: [68.10, 22.80, 71.50, 24.70], regionCategory: 'drought_prone' },
    { name: 'Surat', stateName: 'Gujarat', stateCode: 'GJ', lgdCode: 462, center: [72.83, 21.17], boundingBox: [72.50, 20.80, 73.30, 21.60], regionCategory: 'coastal' },
    { name: 'Ahmedabad', stateName: 'Gujarat', stateCode: 'GJ', lgdCode: 437, center: [72.58, 23.02], boundingBox: [72.30, 22.60, 72.85, 23.30], regionCategory: 'plains' },
  ],
  'Haryana': [
    { name: 'Gurugram', stateName: 'Haryana', stateCode: 'HR', lgdCode: 73, center: [77.03, 28.46], boundingBox: [76.70, 28.20, 77.25, 28.60], regionCategory: 'plains' },
    { name: 'Ambala', stateName: 'Haryana', stateCode: 'HR', lgdCode: 65, center: [76.78, 30.38], boundingBox: [76.50, 30.15, 77.15, 30.60], regionCategory: 'plains' },
  ],
  'Himachal Pradesh': [
    { name: 'Shimla', stateName: 'Himachal Pradesh', stateCode: 'HP', lgdCode: 32, center: [77.17, 31.10], boundingBox: [76.90, 30.80, 77.60, 31.40], regionCategory: 'himalayan' },
    { name: 'Kullu', stateName: 'Himachal Pradesh', stateCode: 'HP', lgdCode: 28, center: [77.11, 31.96], boundingBox: [76.70, 31.50, 77.50, 32.30], regionCategory: 'himalayan' },
  ],
  'Jharkhand': [
    { name: 'Ranchi', stateName: 'Jharkhand', stateCode: 'JH', lgdCode: 328, center: [85.31, 23.34], boundingBox: [84.90, 22.90, 85.80, 23.70], regionCategory: 'plains' },
    { name: 'Dhanbad', stateName: 'Jharkhand', stateCode: 'JH', lgdCode: 322, center: [86.43, 23.80], boundingBox: [86.10, 23.60, 86.80, 24.05], regionCategory: 'plains' },
  ],
  'Karnataka': [
    { name: 'Bengaluru Urban', stateName: 'Karnataka', stateCode: 'KA', lgdCode: 528, center: [77.59, 12.97], boundingBox: [77.40, 12.75, 77.80, 13.20], regionCategory: 'plains' },
    { name: 'Dakshina Kannada', stateName: 'Karnataka', stateCode: 'KA', lgdCode: 532, center: [74.85, 12.87], boundingBox: [74.60, 12.50, 75.30, 13.20], regionCategory: 'coastal' },
    { name: 'Uttara Kannada', stateName: 'Karnataka', stateCode: 'KA', lgdCode: 549, center: [74.45, 14.65], boundingBox: [74.10, 13.90, 75.10, 15.30], regionCategory: 'coastal' },
  ],
  'Kerala': [
    { name: 'Idukki', stateName: 'Kerala', stateCode: 'KL', lgdCode: 555, center: [77.05, 10.08], boundingBox: [76.60, 9.50, 77.40, 10.30], regionCategory: 'himalayan' },
    { name: 'Wayanad', stateName: 'Kerala', stateCode: 'KL', lgdCode: 564, center: [76.13, 11.68], boundingBox: [75.80, 11.40, 76.50, 12.00], regionCategory: 'himalayan' },
    { name: 'Alappuzha', stateName: 'Kerala', stateCode: 'KL', lgdCode: 553, center: [76.33, 9.49], boundingBox: [76.20, 9.10, 76.60, 9.80], regionCategory: 'coastal' },
    { name: 'Ernakulam', stateName: 'Kerala', stateCode: 'KL', lgdCode: 554, center: [76.27, 9.98], boundingBox: [76.10, 9.75, 76.50, 10.20], regionCategory: 'coastal' },
  ],
  'Madhya Pradesh': [
    { name: 'Bhopal', stateName: 'Madhya Pradesh', stateCode: 'MP', lgdCode: 393, center: [77.40, 23.26], boundingBox: [77.10, 23.00, 77.70, 23.50], regionCategory: 'plains' },
    { name: 'Indore', stateName: 'Madhya Pradesh', stateCode: 'MP', lgdCode: 409, center: [75.86, 22.72], boundingBox: [75.50, 22.40, 76.10, 23.00], regionCategory: 'plains' },
  ],
  'Maharashtra': [
    { name: 'Mumbai City', stateName: 'Maharashtra', stateCode: 'MH', lgdCode: 484, center: [72.87, 18.97], boundingBox: [72.80, 18.89, 72.95, 19.05], regionCategory: 'coastal' },
    { name: 'Pune', stateName: 'Maharashtra', stateCode: 'MH', lgdCode: 492, center: [73.85, 18.52], boundingBox: [73.30, 17.90, 75.10, 19.20], regionCategory: 'plains' },
    { name: 'Raigad', stateName: 'Maharashtra', stateCode: 'MH', lgdCode: 493, center: [73.16, 18.51], boundingBox: [72.80, 17.80, 73.60, 19.10], regionCategory: 'coastal' },
    { name: 'Ratnagiri', stateName: 'Maharashtra', stateCode: 'MH', lgdCode: 494, center: [73.30, 16.99], boundingBox: [73.00, 16.50, 73.80, 17.50], regionCategory: 'coastal' },
  ],
  'Manipur': [
    { name: 'Imphal West', stateName: 'Manipur', stateCode: 'MN', lgdCode: 254, center: [93.90, 24.80], boundingBox: [93.75, 24.60, 94.05, 25.00], regionCategory: 'northeastern' },
  ],
  'Meghalaya': [
    { name: 'East Khasi Hills', stateName: 'Meghalaya', stateCode: 'ML', lgdCode: 274, center: [91.73, 25.27], boundingBox: [91.40, 25.00, 92.10, 25.70], regionCategory: 'northeastern' },
    { name: 'West Garo Hills', stateName: 'Meghalaya', stateCode: 'ML', lgdCode: 279, center: [90.22, 25.51], boundingBox: [89.80, 25.20, 90.60, 26.00], regionCategory: 'northeastern' },
  ],
  'Mizoram': [
    { name: 'Aizawl', stateName: 'Mizoram', stateCode: 'MZ', lgdCode: 260, center: [92.72, 23.73], boundingBox: [92.50, 23.40, 93.00, 24.10], regionCategory: 'northeastern' },
  ],
  'Nagaland': [
    { name: 'Kohima', stateName: 'Nagaland', stateCode: 'NL', lgdCode: 247, center: [94.11, 25.67], boundingBox: [93.85, 25.40, 94.30, 25.90], regionCategory: 'northeastern' },
  ],
  'Odisha': [
    { name: 'Puri', stateName: 'Odisha', stateCode: 'OD', lgdCode: 366, center: [85.83, 19.81], boundingBox: [85.20, 19.60, 86.30, 20.10], regionCategory: 'coastal' },
    { name: 'Balasore', stateName: 'Odisha', stateCode: 'OD', lgdCode: 345, center: [86.93, 21.49], boundingBox: [86.40, 21.10, 87.50, 21.90], regionCategory: 'coastal' },
    { name: 'Khurda', stateName: 'Odisha', stateCode: 'OD', lgdCode: 360, center: [85.62, 20.18], boundingBox: [85.20, 19.80, 86.00, 20.40], regionCategory: 'coastal' },
  ],
  'Punjab': [
    { name: 'Amritsar', stateName: 'Punjab', stateCode: 'PB', lgdCode: 34, center: [74.87, 31.63], boundingBox: [74.50, 31.30, 75.20, 31.90], regionCategory: 'plains' },
    { name: 'Ludhiana', stateName: 'Punjab', stateCode: 'PB', lgdCode: 42, center: [75.85, 30.90], boundingBox: [75.50, 30.60, 76.20, 31.20], regionCategory: 'plains' },
  ],
  'Rajasthan': [
    { name: 'Jaisalmer', stateName: 'Rajasthan', stateCode: 'RJ', lgdCode: 106, center: [71.92, 27.02], boundingBox: [69.50, 26.00, 72.80, 28.00], regionCategory: 'drought_prone' },
    { name: 'Barmer', stateName: 'Rajasthan', stateCode: 'RJ', lgdCode: 97, center: [71.38, 25.75], boundingBox: [70.10, 24.80, 72.50, 26.50], regionCategory: 'drought_prone' },
    { name: 'Jaipur', stateName: 'Rajasthan', stateCode: 'RJ', lgdCode: 104, center: [75.78, 26.91], boundingBox: [75.40, 26.60, 76.20, 27.30], regionCategory: 'plains' },
    { name: 'Bikaner', stateName: 'Rajasthan', stateCode: 'RJ', lgdCode: 99, center: [73.31, 28.02], boundingBox: [72.20, 27.20, 74.30, 29.00], regionCategory: 'drought_prone' },
  ],
  'Sikkim': [
    { name: 'East Sikkim (Gangtok)', stateName: 'Sikkim', stateCode: 'SK', lgdCode: 226, center: [88.61, 27.33], boundingBox: [88.40, 27.15, 88.85, 27.50], regionCategory: 'himalayan' },
  ],
  'Tamil Nadu': [
    { name: 'Chennai', stateName: 'Tamil Nadu', stateCode: 'TN', lgdCode: 569, center: [80.27, 13.08], boundingBox: [80.15, 12.95, 80.35, 13.20], regionCategory: 'coastal' },
    { name: 'Thanjavur', stateName: 'Tamil Nadu', stateCode: 'TN', lgdCode: 593, center: [79.13, 10.78], boundingBox: [78.80, 10.30, 79.50, 11.10], regionCategory: 'riverine' },
    { name: 'Kanyakumari', stateName: 'Tamil Nadu', stateCode: 'TN', lgdCode: 575, center: [77.53, 8.08], boundingBox: [77.10, 8.00, 77.80, 8.40], regionCategory: 'coastal' },
  ],
  'Telangana': [
    { name: 'Hyderabad', stateName: 'Telangana', stateCode: 'TG', lgdCode: 508, center: [78.47, 17.38], boundingBox: [78.35, 17.25, 78.60, 17.50], regionCategory: 'plains' },
    { name: 'Warangal', stateName: 'Telangana', stateCode: 'TG', lgdCode: 521, center: [79.59, 17.97], boundingBox: [79.30, 17.70, 79.85, 18.20], regionCategory: 'plains' },
  ],
  'Tripura': [
    { name: 'West Tripura (Agartala)', stateName: 'Tripura', stateCode: 'TR', lgdCode: 271, center: [91.28, 23.83], boundingBox: [91.10, 23.60, 91.50, 24.00], regionCategory: 'northeastern' },
  ],
  'Uttar Pradesh': [
    { name: 'Lucknow', stateName: 'Uttar Pradesh', stateCode: 'UP', lgdCode: 157, center: [80.94, 26.84], boundingBox: [80.60, 26.50, 81.25, 27.15], regionCategory: 'plains' },
    { name: 'Varanasi', stateName: 'Uttar Pradesh', stateCode: 'UP', lgdCode: 187, center: [82.97, 25.31], boundingBox: [82.60, 25.10, 83.25, 25.60], regionCategory: 'riverine' },
    { name: 'Prayagraj (Allahabad)', stateName: 'Uttar Pradesh', stateCode: 'UP', lgdCode: 139, center: [81.84, 25.43], boundingBox: [81.50, 25.15, 82.20, 25.75], regionCategory: 'riverine' },
  ],
  'Uttarakhand': [
    { name: 'Chamoli', stateName: 'Uttarakhand', stateCode: 'UK', lgdCode: 56, center: [79.56, 30.55], boundingBox: [79.20, 30.10, 80.10, 31.00], regionCategory: 'himalayan' },
    { name: 'Dehradun', stateName: 'Uttarakhand', stateCode: 'UK', lgdCode: 57, center: [78.03, 30.31], boundingBox: [77.60, 29.90, 78.40, 30.90], regionCategory: 'himalayan' },
    { name: 'Uttarkashi', stateName: 'Uttarakhand', stateCode: 'UK', lgdCode: 64, center: [78.44, 30.72], boundingBox: [77.80, 30.30, 79.40, 31.50], regionCategory: 'himalayan' },
    { name: 'Rudraprayag', stateName: 'Uttarakhand', stateCode: 'UK', lgdCode: 61, center: [78.98, 30.28], boundingBox: [78.70, 30.10, 79.30, 30.80], regionCategory: 'himalayan' },
  ],
  'West Bengal': [
    { name: 'Kolkata', stateName: 'West Bengal', stateCode: 'WB', lgdCode: 318, center: [88.36, 22.57], boundingBox: [88.25, 22.45, 88.45, 22.65], regionCategory: 'riverine' },
    { name: 'Darjeeling', stateName: 'West Bengal', stateCode: 'WB', lgdCode: 312, center: [88.26, 27.04], boundingBox: [88.00, 26.80, 88.55, 27.25], regionCategory: 'himalayan' },
    { name: 'South 24 Parganas (Sundarbans)', stateName: 'West Bengal', stateCode: 'WB', lgdCode: 326, center: [88.55, 22.15], boundingBox: [88.10, 21.50, 89.10, 22.60], regionCategory: 'coastal' },
  ],
  // 8 Union Territories
  'Andaman & Nicobar Islands': [
    { name: 'South Andaman', stateName: 'Andaman & Nicobar Islands', stateCode: 'AN', lgdCode: 602, center: [92.74, 11.62], boundingBox: [92.40, 10.50, 93.10, 12.20], regionCategory: 'island' },
  ],
  'Chandigarh': [
    { name: 'Chandigarh', stateName: 'Chandigarh', stateCode: 'CH', lgdCode: 48, center: [76.77, 30.73], boundingBox: [76.72, 30.68, 76.84, 30.79], regionCategory: 'plains' },
  ],
  'Dadra & Nagar Haveli and Daman & Diu': [
    { name: 'Daman', stateName: 'Dadra & Nagar Haveli and Daman & Diu', stateCode: 'DH', lgdCode: 465, center: [72.83, 20.40], boundingBox: [72.78, 20.35, 72.88, 20.45], regionCategory: 'coastal' },
  ],
  'Delhi (NCT)': [
    { name: 'New Delhi', stateName: 'Delhi (NCT)', stateCode: 'DL', lgdCode: 85, center: [77.21, 28.63], boundingBox: [77.10, 28.55, 77.25, 28.68], regionCategory: 'plains' },
    { name: 'Central Delhi', stateName: 'Delhi (NCT)', stateCode: 'DL', lgdCode: 80, center: [77.20, 28.65], boundingBox: [77.15, 28.60, 77.25, 28.70], regionCategory: 'plains' },
  ],
  'Jammu & Kashmir': [
    { name: 'Srinagar', stateName: 'Jammu & Kashmir', stateCode: 'JK', lgdCode: 22, center: [74.79, 34.08], boundingBox: [74.65, 33.95, 75.00, 34.20], regionCategory: 'himalayan' },
    { name: 'Jammu', stateName: 'Jammu & Kashmir', stateCode: 'JK', lgdCode: 15, center: [74.85, 32.72], boundingBox: [74.60, 32.50, 75.10, 33.00], regionCategory: 'plains' },
  ],
  'Ladakh': [
    { name: 'Leh', stateName: 'Ladakh', stateCode: 'LA', lgdCode: 9, center: [77.57, 34.15], boundingBox: [76.50, 33.00, 79.50, 35.50], regionCategory: 'himalayan' },
    { name: 'Kargil', stateName: 'Ladakh', stateCode: 'LA', lgdCode: 8, center: [76.13, 34.55], boundingBox: [75.50, 33.80, 76.80, 35.00], regionCategory: 'himalayan' },
  ],
  'Lakshadweep': [
    { name: 'Lakshadweep', stateName: 'Lakshadweep', stateCode: 'LD', lgdCode: 552, center: [72.64, 10.56], boundingBox: [71.60, 8.25, 74.50, 12.45], regionCategory: 'island' },
  ],
  'Puducherry': [
    { name: 'Puducherry', stateName: 'Puducherry', stateCode: 'PY', lgdCode: 598, center: [79.80, 11.94], boundingBox: [79.65, 11.85, 80.00, 12.05], regionCategory: 'coastal' },
  ],
};

/**
 * Get all available states and union territories
 */
export function getAllStatesAndUTs(): StateUTInfo[] {
  return ALL_INDIAN_STATES_AND_UTS;
}

/**
 * Convert a State/UT info into a LocationSearchResult for navigation
 */
export function stateToLocationResult(state: StateUTInfo): LocationSearchResult {
  return {
    id: `state-${state.code.toLowerCase()}`,
    name: state.name,
    displayName: `${state.name} (${state.type === 'union_territory' ? 'Union Territory' : 'State'}), India`,
    adminLevel: 'state_ut',
    state: state.name,
    district: `All ${state.districtsCount} Districts`,
    center: state.center,
    boundingBox: state.boundingBox,
    elevation_m: state.regionCategory === 'himalayan' ? 1800 : state.regionCategory === 'northeastern' ? 1200 : 80,
    population: state.type === 'union_territory' ? 2500000 : 45000000,
    source: 'Survey of India / Ministry of Panchayati Raj (LGD)',
    regionCategory: state.regionCategory,
  };
}

/**
 * Convert a District info into a LocationSearchResult for navigation
 */
export function districtToLocationResult(district: DistrictInfo): LocationSearchResult {
  return {
    id: `dist-${district.stateCode.toLowerCase()}-${district.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: `${district.name} District`,
    displayName: `${district.name} District, ${district.stateName}, India`,
    adminLevel: 'district',
    state: district.stateName,
    district: district.name,
    center: district.center,
    boundingBox: district.boundingBox,
    elevation_m: district.regionCategory === 'himalayan' ? 1600 : 65,
    population: 1850000,
    source: 'Census of India / Local Government Directory (LGD)',
    regionCategory: district.regionCategory,
  };
}

/**
 * Search the administrative hierarchy across India:
 * Supports country, state, district, and subdistrict/village matching with administrative deduplication
 */
export function searchNationwideHierarchy(
  query: string,
  filterState?: string,
  filterLevel?: IndiaAdministrativeLevel
): LocationSearchResult[] {
  const q = query.trim().toLowerCase();
  const results: LocationSearchResult[] = [];

  // 1. National Overview Match
  if (!q || q.includes('india') || q.includes('bharat') || q === 'all' || q === 'nationwide') {
    if (!filterLevel || filterLevel === ('country' as any)) {
      results.push(ALL_INDIA_NATIONAL_LOCATION);
    }
  }

  // 2. State & Union Territory Matches
  for (const st of ALL_INDIAN_STATES_AND_UTS) {
    if (filterState && filterState !== 'all' && st.name.toLowerCase() !== filterState.toLowerCase()) {
      continue;
    }
    if (filterLevel && filterLevel !== 'state_ut' && filterLevel !== ('country' as any)) {
      continue;
    }

    const matchesName = st.name.toLowerCase().includes(q) || st.shortCode.toLowerCase() === q;
    const matchesLgd = !isNaN(Number(q)) && st.lgdCode === Number(q);

    if (!q || matchesName || matchesLgd) {
      results.push(stateToLocationResult(st));
    }
  }

  // 3. District Matches
  for (const [stName, distList] of Object.entries(REPRESENTATIVE_DISTRICTS)) {
    if (filterState && filterState !== 'all' && stName.toLowerCase() !== filterState.toLowerCase()) {
      continue;
    }
    if (filterLevel && filterLevel !== 'district') {
      continue;
    }

    for (const d of distList) {
      const distLower = d.name.toLowerCase();
      const matchesName = distLower.includes(q) || (q.includes(distLower) && q.includes(stName.toLowerCase()));
      const matchesLgd = !isNaN(Number(q)) && d.lgdCode === Number(q);

      if (q && (matchesName || matchesLgd)) {
        results.push(districtToLocationResult(d));
      }
    }
  }

  return results;
}

