import type { FeatureCollection, LineString } from 'geojson';

export type TravelMode = 'driving' | 'walking';

export type RouteCriterion = 'flood_aware' | 'fastest' | 'shortest';

export interface NavigationPoint {
  id: string;
  name: string;
  category: 'village_core' | 'shelter' | 'school' | 'hospital' | 'high_ground' | 'commercial' | 'custom';
  coordinates: [number, number]; // [lng, lat]
  elevation_m?: number;
  description?: string;
}

export interface NavigationStep {
  instruction: string;
  roadName: string;
  roadType: string;
  distance_m: number;
  duration_minutes: number;
  floodDepth_m: number;
  isFlooded: boolean;
  status: 'dry' | 'caution' | 'impassable';
  coordinates: [number, number][];
}

export interface TrafficConditionInfo {
  provider: 'None (Standard Geometric Speed Model)' | 'TomTom Traffic API' | 'HERE Traffic' | 'Mapbox Traffic';
  status: 'standard_flow' | 'congested' | 'heavy_delay' | 'unavailable';
  requiresApiKey: boolean;
  message: string;
  lastUpdated: string;
}

export interface ComputedRoute {
  id: string;
  criterion: RouteCriterion;
  title: string;
  summary: string;
  isRecommended: boolean;
  isPassable: boolean;
  clearanceStatus: 'Clear & Passable' | 'Conditional (Caution)' | 'Impassable (Blocked)';
  totalDistance_m: number;
  estimatedDrivingMinutes: number;
  estimatedWalkingMinutes: number;
  maxFloodDepth_m: number;
  submergedDistance_m: number;
  floodExposurePercent: number;
  coordinates: [number, number][]; // [lng, lat][] continuous line
  affectedSegments: Array<{
    roadId: string;
    roadName: string;
    depth_m: number;
    impassable: boolean;
    coordinates: [number, number][];
  }>;
  steps: NavigationStep[];
  routingEngine: 'OSRM Live Routing' | 'Bharat Twin Topological Dijkstra (OSM Cadastre)';
  traffic: TrafficConditionInfo;
  whyRecommended?: string;
}

export interface RoutePlanningResult {
  origin: NavigationPoint;
  destination: NavigationPoint;
  travelMode: TravelMode;
  routes: ComputedRoute[];
  activeRouteId: string;
  calculatedAt: string;
  notice?: string;
}

