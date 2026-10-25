import type { HazardType } from './hazard';

export type InfrastructureCategory =
  | 'drainage_flood'
  | 'cyclone_shelter'
  | 'evacuation_road'
  | 'heat_resilience'
  | 'drought_recharge'
  | 'seismic_retrofit';

export interface InfrastructureIntervention {
  id: string;
  name: string;
  category: InfrastructureCategory;
  description: string;
  technicalSpecs: string;
  estimatedCostLakhs: number;
  populationProtected: number;
  riskReductionPercent: number;
  lifespanYears: number;
  annualMaintenanceLakhs: number;
  location: [number, number]; // [lng, lat]
  status: 'planned' | 'approved' | 'implemented';
  isEnabled: boolean;
  hazardsMitigated: HazardType[];
  benefitCostRatio: number; // e.g. 3.4
  leadAgency: string; // e.g. 'Panchayat Raj Engineering Dept (PRED) / SDRF'
  timelineMonths: number;
}

export interface InfrastructurePlanSummary {
  totalBudgetLakhs: number;
  selectedBudgetLakhs: number;
  totalInterventionsCount: number;
  activeInterventionsCount: number;
  netProtectedPopulation: number;
  compositeRiskReductionPercent: number;
  averageBCR: number;
}
