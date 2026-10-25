"""
Extended Multi-Hazard Engine (Production Module)
Seismic Ground Motion Attenuation (PGA / Joyner-Boore),
IMD Official Heatwave Departure Classification,
and Rational Method Urban Waterlogging Simulation.
"""

import numpy as np
import scipy.stats as stats

class ExtendedMultiHazardEngine:
    def __init__(self, target_lat=18.70, target_lon=83.95, is_coastal=True):
        """
        Initializes the advanced multi-hazard modeling suite.
        Defaults map to the Kotturu / Srikakulam North Coastal Andhra Pradesh corridor.
        """
        self.lat = target_lat
        self.lon = target_lon
        self.is_coastal = is_coastal
        
        # Historical regional climatological baselines (Srikakulam / AP coastal plain)
        self.historical_normal_max_temp = 32.5  # Typical October baseline in °C
        
        # Absolute IMD thresholds for heatwave declaration:
        # Coastal: >= 37.0°C | Plains: >= 40.0°C | Hills: >= 30.0°C
        self.imd_min_heatwave_threshold = 37.0 if is_coastal else 40.0
        
        # Seismic fault parameters (BIS IS 1893 Zone III baseline)
        self.seismic_annual_slip_rate = 0.02
        
        # Civic drainage discharge capacity (standard masonry swale discharge in mm/hr)
        self.drainage_discharge_capacity_mm_hr = 25.0

    def calculate_earthquake_impact(self, forecast_magnitude, focal_depth_km=15.0):
        """
        PHYSICS METHOD: Employs Joyner-Boore / Campbell ground motion attenuation equations
        to compute Peak Ground Acceleration (PGA) and structural damage radius.
        
        Note: Per NDMA / National Center for Seismology (NCS) guidelines, deterministic
        earthquake predictions are not physically possible. This implements a Probabilistic
        Seismic Hazard Assessment (PSHA) scenario for structural safety thresholds.
        """
        # 1. Poisson process statistical calculation for return probability over 1-year horizon
        time_horizon_years = 1.0
        lambda_event = self.seismic_annual_slip_rate * np.exp(0.5 * forecast_magnitude)
        probability_seismic_event = (1.0 - np.exp(-lambda_event * time_horizon_years)) * 100.0

        # 2. Distance-based wave energy attenuation physics
        # Critical threshold: PGA >= 0.15g (corresponds to MMI VII - moderate to heavy structural cracking)
        pga_threshold = 0.15
        affected_radius_km = 0.0
        pga_profile = []
        
        # Step outward radially from epicenter
        for r_km in range(1, 500):
            distance_factor = np.sqrt(r_km**2 + focal_depth_km**2)
            # Joyner-Boore empirical acceleration attenuation formula
            predicted_pga = np.exp(0.25 * forecast_magnitude - 0.015 * distance_factor - np.log(distance_factor))
            
            if predicted_pga >= pga_threshold:
                affected_radius_km = float(r_km)
                if r_km % 10 == 0 or r_km == 1:
                    pga_profile.append((r_km, round(float(predicted_pga), 3)))
            else:
                break

        impact_area_sq_km = np.pi * (affected_radius_km ** 2)
        
        return {
            "hazard": "EARTHQUAKE",
            "scenario_magnitude": forecast_magnitude,
            "focal_depth_km": focal_depth_km,
            "strike_probability_percentage": round(min(100.0, float(probability_seismic_event)), 2),
            "critical_damage_radius_km": round(affected_radius_km, 1),
            "calculated_impact_area_sq_km": round(float(impact_area_sq_km), 2),
            "pga_threshold_g": pga_threshold,
            "pga_sample_profile": pga_profile,
            "official_disclaimer": "NDMA / NCS Notice: Earthquakes cannot be predicted in advance. Scenario reflects PSHA engineering risk."
        }

    def calculate_heatwave_probability(self, forecast_max_temp, consecutive_days=3):
        """
        GOVERNMENT METRIC: Implements the official India Meteorological Department (IMD)
        operational framework for classifying heatwaves based on departure from normal and absolute temperature.
        """
        departure_from_normal = forecast_max_temp - self.historical_normal_max_temp
        
        # 1. Statistical probability distribution logic based on forecast uncertainty (std dev = 1.5°C)
        temp_uncertainty_std = 1.5
        z_score = (forecast_max_temp - (self.historical_normal_max_temp + 4.5)) / temp_uncertainty_std
        heatwave_probability = float(stats.norm.cdf(z_score) * 100.0)

        # 2. Official IMD Criteria:
        # Requires station to reach minimum absolute threshold (37°C for Coastal, 40°C for Plains)
        # AND departure >= +4.5°C for at least 2 consecutive days
        severity_status = "NORMAL"
        meets_absolute_threshold = forecast_max_temp >= self.imd_min_heatwave_threshold
        
        if consecutive_days >= 2 and meets_absolute_threshold:
            if departure_from_normal >= 6.5:
                severity_status = "SEVERE HEATWAVE"
            elif departure_from_normal >= 4.5:
                severity_status = "MODERATE HEATWAVE"

        # 3. Macro-climatic spatial swath estimation (IMD meteorological subdivision block)
        affected_area_sq_km = 2500.0 if severity_status != "NORMAL" else 0.0

        return {
            "hazard": "HEATWAVE",
            "forecast_max_temp_c": forecast_max_temp,
            "heatwave_probability_percentage": round(max(0.0, min(100.0, heatwave_probability)), 2),
            "imd_classification": severity_status,
            "temperature_departure_celcius": round(float(departure_from_normal), 1),
            "meets_imd_absolute_threshold": meets_absolute_threshold,
            "consecutive_days": consecutive_days,
            "calculated_impact_area_sq_km": affected_area_sq_km
        }

    def simulate_urban_waterlogging(self, hourly_rainfall_mm, impervious_surface_fraction=0.75, dem_grid=None):
        """
        HYDRAULIC METHOD: Applies the Rational Method Equation (Q = C * I * A)
        to model civic waterlogging depth when rain volume exceeds civic drainage capacity.
        """
        # Runoff coefficient (C) scales based on concrete/impervious urban surface
        runoff_coefficient = 0.90 * impervious_surface_fraction
        
        # Gross volumetric water load entering civic catchment per hour (mm/h)
        total_water_influx_mm = hourly_rainfall_mm * runoff_coefficient
        
        # Net accumulation past civic pump/gravity drainage discharge ceiling
        net_accumulation_mm_hr = max(0.0, total_water_influx_mm - self.drainage_discharge_capacity_mm_hr)
        
        # 1. Probability estimation using exponential intensity exceedance
        waterlogging_probability = float((1.0 - np.exp(-net_accumulation_mm_hr / 15.0)) * 100.0) if net_accumulation_mm_hr > 0 else 0.0
        
        # 2. Localized urban elevation DEM (default 3x3 or user-provided road/settlement grid)
        if dem_grid is None:
            dem_grid = np.array([
                [12.0, 11.8, 12.2],
                [11.5, 10.1, 11.6],  # 10.1m represents a depressed road intersection / culvert
                [12.1, 11.9, 12.4]
            ])
            
        water_depth_meters = net_accumulation_mm_hr / 1000.0
        lowest_depression = float(np.min(dem_grid))
        critical_pooling_elevation = lowest_depression + water_depth_meters
        
        waterlogged_mask = dem_grid <= critical_pooling_elevation
        
        # Micro-urban block cell resolution: 10m x 10m (0.0001 sq km)
        pixel_area_sq_km = 0.0001
        affected_area_sq_km = float(np.sum(waterlogged_mask) * pixel_area_sq_km) if net_accumulation_mm_hr > 0 else 0.0

        return {
            "hazard": "WATERLOGGING",
            "hourly_rainfall_mm": hourly_rainfall_mm,
            "waterlogging_probability_percentage": round(waterlogging_probability, 2),
            "net_surface_water_accumulation_mm": round(float(net_accumulation_mm_hr), 1),
            "max_water_depth_meters": round(float(water_depth_meters), 3),
            "calculated_impact_area_sq_km": round(affected_area_sq_km, 4),
            "waterlogged_grid_visualization": waterlogged_mask.astype(int)
        }


# ========================================================
# Operational Integration Test Bed
# ========================================================
if __name__ == "__main__":
    engine = ExtendedMultiHazardEngine(target_lat=18.70, target_lon=83.95, is_coastal=True)

    print("=" * 65)
    print("🔬 BHARAT VILLAGE TWIN — EXTENDED MULTI-HAZARD ENGINE")
    print("=" * 65 + "\n")

    # 1. Earthquake Impact Scenario
    eq_report = engine.calculate_earthquake_impact(forecast_magnitude=6.8, focal_depth_km=15.0)
    print(f"🛑 [{eq_report['hazard']} ANALYSIS]")
    print(f"   Annual Strike Probability   : {eq_report['strike_probability_percentage']}%")
    print(f"   Critical Damage Radius (PGA>=0.15g) : {eq_report['critical_damage_radius_km']} km")
    print(f"   Total Footprint Area        : {eq_report['calculated_impact_area_sq_km']} km²")
    print(f"   Disclaimer                  : {eq_report['official_disclaimer']}\n")

    # 2. IMD Heatwave Classification Scenario
    hw_report = engine.calculate_heatwave_probability(forecast_max_temp=38.5, consecutive_days=3)
    print(f"🔥 [{hw_report['hazard']} ANALYSIS]")
    print(f"   Forecast Max Temperature    : {hw_report['forecast_max_temp_c']}°C")
    print(f"   Heatwave Alert Probability  : {hw_report['heatwave_probability_percentage']}%")
    print(f"   Official IMD Severity Tier  : {hw_report['imd_classification']}")
    print(f"   Departure from Normal       : +{hw_report['temperature_departure_celcius']}°C above normal\n")

    # 3. Urban Waterlogging Hydraulic Scenario
    wl_report = engine.simulate_urban_waterlogging(hourly_rainfall_mm=65.0)
    print(f"🚙 [{wl_report['hazard']} ANALYSIS]")
    print(f"   Hourly Rainfall Load        : {wl_report['hourly_rainfall_mm']} mm/hr")
    print(f"   Waterlogging Probability    : {wl_report['waterlogging_probability_percentage']}%")
    print(f"   Net Water Accumulation      : {wl_report['net_surface_water_accumulation_mm']} mm/hr past drainage limit")
    print(f"   Peak Water Depth in Culvert : {wl_report['max_water_depth_meters']} m")
    print(f"   Calculated Flooded Road Area: {wl_report['calculated_impact_area_sq_km']} km²")
    print("   Waterlogged Grid Mask (1 = Submerged Road Pixel):")
    print(wl_report['waterlogged_grid_visualization'])
    print("=" * 65)

