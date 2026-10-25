-- ============================================================================
-- BHARAT VILLAGE TWIN — NATIONWIDE MULTI-HAZARD & DISASTER RISK DATABASE
-- Migration: 0001_initial_schema.sql
-- Compatibility: PostgreSQL 14+ with PostGIS 3.0+
-- ============================================================================

-- Enable PostGIS spatial extension if available in the database cluster
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. LOCATIONS (Administrative Settlements & Survey Boundaries)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name TEXT NOT NULL,
    admin_level VARCHAR(64) NOT NULL CHECK (admin_level IN ('village', 'gram_panchayat', 'taluk_tehsil', 'district', 'state_ut', 'coordinates')),
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    subdistrict VARCHAR(128),
    center_lat DOUBLE PRECISION NOT NULL CHECK (center_lat >= 6.0 AND center_lat <= 38.0),
    center_lng DOUBLE PRECISION NOT NULL CHECK (center_lng >= 68.0 AND center_lng <= 98.0),
    elevation_m DOUBLE PRECISION,
    region_category VARCHAR(64) NOT NULL CHECK (region_category IN ('himalayan', 'coastal', 'riverine', 'drought_prone', 'northeastern', 'island', 'plains')),
    bounding_box DOUBLE PRECISION[] NOT NULL, -- [minLng, minLat, maxLng, maxLat]
    -- Spatial column for spatial intersection queries (EPSG:4326 WGS84)
    geom GEOMETRY(Point, 4326),
    source VARCHAR(255) NOT NULL DEFAULT 'Survey of India / OpenStreetMap',
    quality_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_state_district ON locations (state, district);
CREATE INDEX IF NOT EXISTS idx_locations_admin_level ON locations (admin_level);
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 2. HISTORICAL DISASTERS (Verified Empirical Records & Impact Registry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historical_disasters (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    hazard_type VARCHAR(64) NOT NULL CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    event_name VARCHAR(255) NOT NULL,
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    village_name VARCHAR(255),
    event_date DATE NOT NULL,
    event_year INTEGER NOT NULL CHECK (event_year >= 1800 AND event_year <= 2100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    
    -- Severity & Magnitude Indicators
    observed_magnitude VARCHAR(128), -- e.g. "Mw 7.7", "Category 5 / 220 km/h", "380 mm / 24h"
    
    -- Documented Damage Figures (NULL if unrecorded; NEVER invent dummy numbers)
    affected_population INTEGER CHECK (affected_population >= 0),
    fatalities INTEGER CHECK (fatalities >= 0),
    injured INTEGER CHECK (injured >= 0),
    damaged_houses INTEGER CHECK (damaged_houses >= 0),
    crop_area_ha DOUBLE PRECISION CHECK (crop_area_ha >= 0),
    economic_loss_crores DOUBLE PRECISION CHECK (economic_loss_crores >= 0),
    
    -- Quality Classification & Provenance
    confidence_level VARCHAR(32) NOT NULL CHECK (confidence_level IN ('confirmed', 'estimated', 'incomplete', 'unverified')),
    source VARCHAR(255) NOT NULL, -- e.g. "NDMA Situation Report", "IMD Cyclone Atlas", "GSI Landslide Bulletin"
    source_citation TEXT NOT NULL,
    metadata_json JSONB,
    dedup_hash VARCHAR(128) UNIQUE NOT NULL, -- Hash of (state, district, hazard_type, event_date, event_name) to avoid duplicates
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disasters_hazard_date ON historical_disasters (hazard_type, event_date);
CREATE INDEX IF NOT EXISTS idx_disasters_state_district ON historical_disasters (state, district);
CREATE INDEX IF NOT EXISTS idx_disasters_confidence ON historical_disasters (confidence_level);
CREATE INDEX IF NOT EXISTS idx_disasters_geom ON historical_disasters USING GIST (geom);

-- ----------------------------------------------------------------------------
-- 3. WEATHER OBSERVATIONS (Live Meterological Ingestion Records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_observations (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    temperature_c DOUBLE PRECISION NOT NULL,
    condition VARCHAR(128) NOT NULL,
    humidity_percent INTEGER NOT NULL CHECK (humidity_percent >= 0 AND humidity_percent <= 100),
    wind_speed_kmh DOUBLE PRECISION NOT NULL CHECK (wind_speed_kmh >= 0),
    wind_direction VARCHAR(32),
    rainfall_rate_mmh DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (rainfall_rate_mmh >= 0),
    pressure_hpa DOUBLE PRECISION,
    provider VARCHAR(128) NOT NULL,
    is_live_api BOOLEAN NOT NULL DEFAULT false,
    retrieval_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_weather_obs_loc_time ON weather_observations (location_id, retrieval_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 4. WEATHER FORECAST SNAPSHOTS (Tracked for Prognostic Accuracy Auditing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_forecast_snapshots (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    provider VARCHAR(128) NOT NULL,
    forecast_issue_time TIMESTAMPTZ NOT NULL,
    forecast_valid_time TIMESTAMPTZ NOT NULL,
    forecast_type VARCHAR(32) NOT NULL CHECK (forecast_type IN ('hourly', 'daily', '10day')),
    temperature_c DOUBLE PRECISION,
    max_temp_c DOUBLE PRECISION,
    min_temp_c DOUBLE PRECISION,
    condition VARCHAR(128) NOT NULL,
    rainfall_mm DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (rainfall_mm >= 0),
    rain_probability_percent INTEGER CHECK (rain_probability_percent >= 0 AND rain_probability_percent <= 100),
    wind_speed_kmh DOUBLE PRECISION,
    retrieval_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forecast_loc_valid ON weather_forecast_snapshots (location_id, forecast_valid_time);

-- ----------------------------------------------------------------------------
-- 5. GEOGRAPHIC ASSETS (Buildings, Roads, Waterbodies & Critical Lifelines)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geographic_assets (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    asset_category VARCHAR(64) NOT NULL CHECK (asset_category IN ('building', 'road', 'waterbody', 'critical_lifeline', 'shelter', 'drainage')),
    name VARCHAR(255) NOT NULL,
    geom_type VARCHAR(32) NOT NULL CHECK (geom_type IN ('Point', 'LineString', 'Polygon')),
    coordinates_json JSONB NOT NULL,
    elevation_m DOUBLE PRECISION,
    vulnerability_score DOUBLE PRECISION CHECK (vulnerability_score >= 0 AND vulnerability_score <= 100),
    is_critical_lifeline BOOLEAN NOT NULL DEFAULT false,
    properties_json JSONB,
    provenance VARCHAR(255) NOT NULL DEFAULT 'OpenStreetMap / Survey of India',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_loc_cat ON geographic_assets (location_id, asset_category);

-- ----------------------------------------------------------------------------
-- 6. RISK ASSESSMENTS (Multi-Hazard Scientific Diagnostic Results)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_assessments (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    hazard_type VARCHAR(64) NOT NULL CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    risk_level VARCHAR(32) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'very_high')),
    scientific_score DOUBLE PRECISION NOT NULL CHECK (scientific_score >= 0 AND scientific_score <= 100),
    primary_metric_label VARCHAR(128) NOT NULL,
    primary_metric_value VARCHAR(128) NOT NULL,
    exposed_population INTEGER NOT NULL DEFAULT 0,
    exposed_roads_km DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    exposed_farmland_ha DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_applicable BOOLEAN NOT NULL DEFAULT true,
    applicability_rationale TEXT,
    confidence_tier VARCHAR(32) NOT NULL CHECK (confidence_tier IN ('High', 'Moderate', 'Indicative')),
    provenance_source VARCHAR(255) NOT NULL,
    model_version VARCHAR(64) NOT NULL DEFAULT 'BharatTwin-v2.1',
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_risk_loc_hazard ON risk_assessments (location_id, hazard_type);

-- ----------------------------------------------------------------------------
-- 7. TEN-DAY RISK OUTLOOKS (Rolling Horizon Prognostics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ten_day_risk_outlooks (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    hazard_type VARCHAR(64) NOT NULL CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    outlook_date DATE NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 10),
    risk_category VARCHAR(32) NOT NULL CHECK (risk_category IN ('Low', 'Moderate', 'High', 'Severe')),
    source_type VARCHAR(64) NOT NULL CHECK (source_type IN ('meteorological_forecast', 'hydrologic_model', 'seismic_hazard_model', 'official_warning')),
    evidence_summary TEXT NOT NULL,
    forecast_issue_time TIMESTAMPTZ NOT NULL,
    uncertainty_notes TEXT NOT NULL,
    recommended_actions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outlook_loc_hazard_date ON ten_day_risk_outlooks (location_id, hazard_type, outlook_date);

-- ----------------------------------------------------------------------------
-- 8. INFRASTRUCTURE RECOMMENDATIONS (Spatial Multi-Criteria Appraisals)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infrastructure_recommendations (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL CHECK (rank >= 1),
    title VARCHAR(255) NOT NULL,
    infrastructure_type VARCHAR(128) NOT NULL,
    candidate_lat DOUBLE PRECISION NOT NULL,
    candidate_lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326),
    elevation_m DOUBLE PRECISION NOT NULL,
    suitability_score DOUBLE PRECISION NOT NULL CHECK (suitability_score >= 0 AND suitability_score <= 100),
    estimated_cost_lakhs DOUBLE PRECISION NOT NULL,
    expected_beneficiaries INTEGER NOT NULL,
    justification TEXT NOT NULL,
    evidence_datasets TEXT[] NOT NULL,
    field_verification_needed TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infra_loc_rank ON infrastructure_recommendations (location_id, rank);

-- ----------------------------------------------------------------------------
-- 9. ALERTS & WARNINGS (Official Government vs Internal Model Disclaimers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    hazard_type VARCHAR(64) NOT NULL CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('info', 'advisory', 'watch', 'warning', 'emergency')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    -- CRITICAL MANDATE: Distinguish official government warning from internal model calculation
    is_official_warning BOOLEAN NOT NULL DEFAULT false,
    effective_from TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'updated', 'expired')),
    evidence_metrics JSONB,
    dedup_hash VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts (status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_state_district ON alerts (state, district);

-- ----------------------------------------------------------------------------
-- 10. USER NOTIFICATION PREFERENCES & DELIVERY HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id VARCHAR(128) PRIMARY KEY,
    user_identifier VARCHAR(255) NOT NULL UNIQUE,
    monitored_location_ids TEXT[] NOT NULL DEFAULT '{}',
    monitored_hazard_types TEXT[] NOT NULL DEFAULT '{"flood", "cyclone", "heatwave", "landslide"}',
    min_severity VARCHAR(32) NOT NULL DEFAULT 'advisory' CHECK (min_severity IN ('info', 'advisory', 'watch', 'warning', 'emergency')),
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    email_address VARCHAR(255),
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    phone_number VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_history (
    id VARCHAR(128) PRIMARY KEY,
    alert_id VARCHAR(128) REFERENCES alerts(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
    delivery_status VARCHAR(32) NOT NULL CHECK (delivery_status IN ('delivered', 'failed', 'pending')),
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_hist_alert ON notification_history (alert_id);
CREATE INDEX IF NOT EXISTS idx_notif_hist_user ON notification_history (user_identifier);
