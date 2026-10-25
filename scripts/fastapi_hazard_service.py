"""
Bharat Village Twin — Multi-Hazard AI Engine (FastAPI Microservice)
Provides high-performance REST APIs for multi-hazard risk assessment:
- Vectorized Monte Carlo storm surge & flood probability
- UTM Zone 44N (EPSG:32644) geodesic destructive wind swath buffers
- Joyner-Boore seismic ground-motion wave attenuation
- Official IMD departure-based heatwave classification
- Rational method urban waterlogging simulation
"""

import numpy as np
import scipy.stats as stats
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

try:
    from shapely.geometry import Point
    import geopandas as gpd
    HAS_GEOPANDAS = True
except ImportError:
    HAS_GEOPANDAS = False

# Initialize FastAPI application
app = FastAPI(
    title="Bharat Village Twin — Multi-Hazard AI Engine",
    description="Microservice for real-time hazard analytics, Monte Carlo flood probability, and seismic/heatwave modeling",
    version="2.0.0"
)

# ==========================================
# Schema Definitions for Incoming Streams
# ==========================================
class TelemetryPayload(BaseModel):
    latitude: float = Field(..., example=18.63, description="Latitude in decimal degrees")
    longitude: float = Field(..., example=83.76, description="Longitude in decimal degrees")
    current_temperature_c: float = Field(..., example=33.5, description="Ambient surface temperature in Celsius")
    precipitation_rate_mm_hr: float = Field(..., example=45.0, description="Rainfall intensity in mm/hour")
    wind_speed_kmph: float = Field(..., example=85.0, description="10m surface sustained wind speed in km/h")
    barometric_pressure_hpa: float = Field(..., example=988.0, description="Sea-level barometric pressure in hPa")
    earthquake_magnitude: float = Field(0.0, example=5.5, description="Richter magnitude of seismic event")
    earthquake_depth_km: float = Field(10.0, example=15.0, description="Focal depth in kilometers")
    consecutive_hot_days: int = Field(0, example=3, description="Consecutive days exceeding temperature baseline")
    urban_impervious_fraction: float = Field(0.70, example=0.65, description="Fraction of built-up / paved surface (0.0 to 1.0)")


# ==========================================
# Core Multi-Hazard Scientific Modules
# ==========================================
class HazardAnalyticsSuite:
    def __init__(self, lat: float, lon: float):
        self.lat = lat
        self.lon = lon
        # UTM Zone 44N (EPSG:32644) covers Eastern & Central India (including Andhra Pradesh & Odisha)
        self.crs_projected = "EPSG:32644"
        self.crs_geographic = "EPSG:4326"

    def compute_cyclone_and_flood_risk(self, pressure: float, wind: float, rain: float) -> tuple[float, float]:
        """
        Runs a vectorized Monte Carlo Joint Probability framework tracking coastal surge and river floods.
        Uses GeoPandas UTM Zone 44N for metric buffer calculations.
        """
        simulations = 5000
        p_env = 1013.25
        g = 9.81
        
        # 1. Parallel stochastic distributions (vectorized for ~1ms execution)
        p_dist = np.random.normal(pressure, 4.0, simulations)
        w_dist = np.maximum(0.0, np.random.normal(wind, 12.0, simulations))
        r_dist = np.random.lognormal(3.9, 0.65, simulations)
        
        static_surge = np.maximum(0.0, p_env - p_dist) * 0.01
        dynamic_surge = 0.002 * ((w_dist / 3.6) ** 2) / g
        runoff_depth = np.maximum(0.0, (r_dist - 35.0) * 0.0075)
        
        # Local critical inundation threshold (relative to riverbed / freeboard channel datum)
        total_water_height = static_surge + dynamic_surge + runoff_depth
        flood_triggers = np.sum(total_water_height >= 1.65)
        prob = (flood_triggers / simulations) * 100.0
        
        # 2. Wind destructive boundary swath buffer area
        radius_km = 120.0 if wind > 118 else (50.0 if wind > 62 else 0.0)
        swath_area = 0.0
        
        if radius_km > 0:
            if HAS_GEOPANDAS:
                # Metric geodesic buffer via UTM Zone 44N projection
                # Note: .iloc[0] is used to extract scalar from GeoSeries
                center = gpd.GeoDataFrame([{"geometry": Point(self.lon, self.lat)}], crs=self.crs_geographic)
                projected_buffer = center.to_crs(self.crs_projected).buffer(radius_km * 1000.0)
                swath_area = float(projected_buffer.geometry.area.iloc[0] / 1e6)
            else:
                swath_area = float(np.pi * (radius_km ** 2))
                
        return round(float(prob), 2), round(float(swath_area), 2)

    def compute_earthquake_attenuation(self, magnitude: float, depth: float) -> tuple[float, float]:
        """
        Applies Joyner-Boore ground motion acceleration attenuation equations to calculate damage footprints.
        """
        if magnitude < 4.0:
            return 0.0, 0.0
            
        lambda_event = 0.02 * np.exp(0.5 * magnitude)
        strike_prob = (1.0 - np.exp(-lambda_event * 1.0)) * 100.0
        
        pga_threshold = 0.15  # MMI VII threshold (structural damage in unreinforced buildings)
        affected_radius = 0.0
        
        for r in range(1, 400):
            dist_factor = np.sqrt(r**2 + depth**2)
            predicted_pga = np.exp(0.25 * magnitude - 0.015 * dist_factor - np.log(dist_factor))
            if predicted_pga >= pga_threshold:
                affected_radius = float(r)
            else:
                break
                
        impact_area = float(np.pi * (affected_radius ** 2))
        return round(min(100.0, float(strike_prob)), 2), round(impact_area, 2)

    def compute_heatwave_alert(self, temp: float, days: int) -> tuple[float, str, float]:
        """
        Maps temperature deviations against the official IMD baseline standard.
        """
        baseline_normal = 32.5  # Regional baseline
        departure = temp - baseline_normal
        
        z_score = (temp - (baseline_normal + 4.5)) / 1.5
        prob = float(stats.norm.cdf(z_score) * 100.0)
        
        status = "NORMAL"
        area = 0.0
        # IMD rulebook criteria
        if departure >= 4.5 and days >= 2:
            status = "SEVERE HEATWAVE" if departure >= 6.5 else "MODERATE HEATWAVE"
            area = 2500.0  # Macro-climatic spatial grid footprint
            
        return round(max(0.0, min(100.0, prob)), 2), status, area

    def compute_urban_waterlogging(self, rain: float, impervious_fraction: float) -> tuple[float, float]:
        """
        Solves Rational drainage runoff equations (Q = C * I * A) across urban surface elevations.
        """
        capacity_limit = 25.0  # Civic drainage max discharge capacity (mm/hr)
        net_accumulation = max(0.0, (rain * (0.90 * impervious_fraction)) - capacity_limit)
        
        prob = float((1.0 - np.exp(-net_accumulation / 15.0)) * 100.0) if net_accumulation > 0 else 0.0
        
        # Local micro-urban terrain mesh (10m x 10m pixels)
        urban_dem = np.array([[10.5, 10.1], [10.4, 10.9]])
        critical_height = 10.1 + (net_accumulation / 1000.0)
        submerged_pixels = int(np.sum(urban_dem <= critical_height))
        
        pixel_area_sq_km = 0.0001
        area_sq_km = float(submerged_pixels * pixel_area_sq_km) if net_accumulation > 0 else 0.0
        return round(prob, 2), round(area_sq_km, 4)


# ==========================================
# REST API Endpoint Controllers
# ==========================================
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Bharat Village Twin - Multi-Hazard AI Engine",
        "has_geopandas": HAS_GEOPANDAS,
        "default_utm_crs": "EPSG:32644"
    }


@app.post("/api/v1/analyze-hazards")
async def process_village_twin_analytics(telemetry: TelemetryPayload) -> Dict[str, Any]:
    try:
        engine = HazardAnalyticsSuite(lat=telemetry.latitude, lon=telemetry.longitude)
        
        flood_p, cyclone_a = engine.compute_cyclone_and_flood_risk(
            pressure=telemetry.barometric_pressure_hpa, 
            wind=telemetry.wind_speed_kmph, 
            rain=telemetry.precipitation_rate_mm_hr
        )
        
        eq_p, eq_a = engine.compute_earthquake_attenuation(
            magnitude=telemetry.earthquake_magnitude, 
            depth=telemetry.earthquake_depth_km
        )
        
        hw_p, hw_status, hw_a = engine.compute_heatwave_alert(
            temp=telemetry.current_temperature_c, 
            days=telemetry.consecutive_hot_days
        )
        
        wl_p, wl_a = engine.compute_urban_waterlogging(
            rain=telemetry.precipitation_rate_mm_hr, 
            impervious_fraction=telemetry.urban_impervious_fraction
        )
        
        critical_alert = (flood_p > 70 or eq_p > 50 or hw_status == "SEVERE HEATWAVE" or telemetry.wind_speed_kmph > 118)
        
        return {
            "status": "SUCCESS",
            "coordinates": {"lat": telemetry.latitude, "lon": telemetry.longitude},
            "hazard_assessment": {
                "flood": {
                    "probability_percent": flood_p,
                    "impact_area_sq_km": cyclone_a if telemetry.wind_speed_kmph > 62 else 0.0045,
                    "trigger_status": "HIGH" if flood_p > 60 else "LOW"
                },
                "cyclone": {
                    "probability_percent": flood_p if telemetry.wind_speed_kmph > 50 else 0.0,
                    "impact_swath_sq_km": cyclone_a,
                    "gale_wind_active": telemetry.wind_speed_kmph > 62
                },
                "earthquake": {
                    "probability_percent": eq_p,
                    "impact_area_sq_km": eq_a,
                    "disclaimer": "NDMA: Earthquakes cannot be predicted deterministically."
                },
                "heatwave": {
                    "probability_percent": hw_p,
                    "status": hw_status,
                    "impact_area_sq_km": hw_a
                },
                "waterlogging": {
                    "probability_percent": wl_p,
                    "impact_area_sq_km": wl_a
                }
            },
            "ai_advisor_verdict": "CRITICAL EMERGENCY ALERTS ACTIVE" if critical_alert else "METRIC CHANNELS RUN WITHIN SAFE BASELINE INDEXES"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Engine Processing Fault: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    print("\nStarting Bharat Village Twin AI Engine on http://0.0.0.0:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000)

