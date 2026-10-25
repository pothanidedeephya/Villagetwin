export type WeatherProviderStatus =
  | 'connected'
  | 'key_missing'
  | 'auth_failed'
  | 'rate_limited'
  | 'provider_error'
  | 'unobserved'
  | 'stale';

export type PrecipitationStatus =
  | 'measured'
  | 'zero_dry'
  | 'unobserved'
  | 'unavailable';

export interface CurrentWeather {
  temperature_c: number;
  condition: string;
  conditionCode?: string;
  humidity_percent: number;
  windSpeed_kmh: number;
  windDirection?: string;
  rainfall_mmh: number; // Current / past hour precipitation rate in mm/h (0 if dry)
  hasPrecipitationObservation?: boolean;
  precipitationStatus?: PrecipitationStatus;
  precipitationLabel?: string;
  precipitation_today_mm?: number;
  pressure_hpa?: number;
  cloudCover_percent?: number;
  observationTimeIso?: string;
  dataAgeMinutes?: number;
  rain_mmh?: number;
  showers_mmh?: number;
  intensityBand?: RainfallIntensityBand;
}

export type SimulationRainfallMode =
  | 'custom'
  | 'weather_observed'
  | 'weather_hourly_completed'
  | 'weather_forecast';

export interface WeatherForecastHour {
  time: string; // ISO or formatted '14:00'
  temperature_c: number;
  condition: string;
  rainfall_mm: number;
  rainfall_mmh?: number; // Hourly equivalent precipitation intensity
  rainProbability_percent?: number;
  windSpeed_kmh: number;
}

export interface WeatherForecastDay {
  date: string; // '2026-10-19'
  dayName: string; // 'Monday'
  maxTemp_c: number;
  minTemp_c: number;
  condition: string;
  totalRainfall_mm: number;
  rainProbability_percent?: number;
}

export interface NearTermRainfallForecast {
  period: string; // 'Next 1h', 'Next 3h', 'Next 6h'
  hours: number;
  rainfall_mm: number; // Accumulation in mm
  rate_mmh: number; // Average rate mm/h
  rateDisplayLabel?: string; // Formatted rate preserving precision (e.g. '0.03 mm/h' or '<0.1 mm/h')
  probability_percent?: number;
  timeRangeLabel?: string;
}

export interface CompletedHourlyRainfall {
  intervalLabel: string; // e.g. "10:00 - 11:00 IST"
  startTime: string;
  endTime: string;
  accumulation_mm: number; // Measured/model accumulation in mm
  averageRate_mmh: number; // Accumulation / 1 hour
  rain_mm: number;
  showers_mm: number;
  calculationNote: string;
  status: PrecipitationStatus;
}

export interface PastRainfallAccumulation {
  last1h_mm: number;
  last3h_mm: number;
  last6h_mm: number;
  last24h_mm: number;
  status: PrecipitationStatus;
  sourceNotice: string;
  calculationBreakdown?: string;
}

export type RainfallIntensityCategory = 'dry' | 'light' | 'moderate' | 'heavy' | 'very_heavy';

export interface RainfallIntensityBand {
  rate_mmh: number;
  label: string; // e.g. "No precipitation indicated", "Light intensity", "Moderate intensity", "Heavy intensity", "Very heavy intensity"
  category: RainfallIntensityCategory;
  color: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  conventionNotice: string;
}

export interface RainfallDiagnosticDetails {
  currentEstimate: {
    precipitation_mmh: number;
    rain_mmh: number;
    showers_mmh: number;
    timestampIso: string;
    timestampIst: string;
    status: PrecipitationStatus;
    label: string;
  };
  mostRecentCompletedHour: CompletedHourlyRainfall;
  pastAccumulations?: PastRainfallAccumulation;
  nearTermForecast: {
    next1h: NearTermRainfallForecast;
    next3h: NearTermRainfallForecast;
    next6h: NearTermRainfallForecast;
  };
  diagnostics: {
    requestedCoordinates: [number, number];
    returnedCoordinates?: [number, number];
    modelName: string;
    timezone: string;
    retrievalTimeIso: string;
    fieldAvailability: {
      currentPrecipitation: boolean;
      currentRain: boolean;
      currentShowers: boolean;
      hourlyPrecipitation: boolean;
      hourlyRain: boolean;
      hourlyShowers: boolean;
      hourlyProbability: boolean;
    };
    isGenuineZero: boolean;
    dataAgeMinutes: number;
  };
}

export interface WeatherData {
  villageName: string;
  coordinates: [number, number]; // [lng, lat]
  current: CurrentWeather;
  pastRainfall?: PastRainfallAccumulation;
  hourlyForecast: WeatherForecastHour[];
  dailyForecast: WeatherForecastDay[];
  rainfallDiagnostics?: RainfallDiagnosticDetails;
  provider: string;
  providerStatus?: WeatherProviderStatus;
  isLiveApiKey: boolean;
  providerKeyName?: string;
  lastUpdated: string;
  observationTimeIso?: string;
  sourceAttribution: string;
  notice?: string;
  errorMessage?: string;
}
