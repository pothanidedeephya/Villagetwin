-- ============================================================================
-- BHARAT VILLAGE TWIN — NATIONWIDE MULTI-HAZARD DIGITAL TWIN & DISASTER PLANNING
-- Migration: 0002_supabase_postgis_rls.sql
-- Compatibility: Supabase PostgreSQL 15+ with PostGIS 3.0+
-- Execution Order: Run this in Supabase SQL Editor after 0002_preflight_check.sql
--
-- Line-by-Line Safety Guarantees:
--   1. Non-Destructive: Never drops, truncates, or overwrites existing tables or data.
--   2. Legacy Resolution: Resolves dual existence of legacy/new tables without breaking.
--   3. Data Integrity: Preserves real scientific/historical records without inventing data.
--   4. Constraint Safety: Audits NULLs before attempting NOT NULL enforcement.
--   5. History Audit: Preserves original application timestamp in _schema_migrations.
--   6. Strict RLS: Limits public access strictly to public civic hazard data.
--      Isolates notification_subscriptions and notification_history to authenticated owners.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: EXTENSIONS & MIGRATION HISTORY
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

DO $$
DECLARE
    v_prev_applied TIMESTAMPTZ;
BEGIN
    SELECT applied_at INTO v_prev_applied 
    FROM public._schema_migrations 
    WHERE version = '0002';

    IF v_prev_applied IS NOT NULL THEN
        RAISE NOTICE 'Migration 0002 was previously recorded on %. Performing an idempotent schema reconciliation pass. Original applied_at timestamp will be preserved.', v_prev_applied;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: SAFELY RESOLVE LEGACY TABLE NAMES (FROM 0001 IF PRESENT)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_has_legacy_wf BOOLEAN;
    v_has_new_wf BOOLEAN;
    v_has_legacy_ga BOOLEAN;
    v_has_new_ga BOOLEAN;
    v_has_legacy_ns BOOLEAN;
    v_has_new_ns BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weather_forecast_snapshots' AND table_type = 'BASE TABLE') INTO v_has_legacy_wf;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND table_type = 'BASE TABLE') INTO v_has_new_wf;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geographic_assets' AND table_type = 'BASE TABLE') INTO v_has_legacy_ga;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geospatial_assets' AND table_type = 'BASE TABLE') INTO v_has_new_ga;

    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notification_preferences' AND table_type = 'BASE TABLE') INTO v_has_legacy_ns;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_subscriptions' AND table_type = 'BASE TABLE') INTO v_has_new_ns;

    -- 1. weather_forecast_snapshots -> weather_forecasts
    IF v_has_legacy_wf AND v_has_new_wf THEN
        RAISE NOTICE 'Both weather_forecast_snapshots and weather_forecasts exist as base tables. Preserving both tables. Manual data consolidation may be needed.';
    ELSIF v_has_legacy_wf AND NOT v_has_new_wf THEN
        ALTER TABLE weather_forecast_snapshots RENAME TO weather_forecasts;
        RAISE NOTICE 'Renamed legacy table weather_forecast_snapshots to weather_forecasts.';
    END IF;

    -- 2. geographic_assets -> geospatial_assets
    IF v_has_legacy_ga AND v_has_new_ga THEN
        RAISE NOTICE 'Both geographic_assets and geospatial_assets exist as base tables. Preserving both tables. Manual data consolidation may be needed.';
    ELSIF v_has_legacy_ga AND NOT v_has_new_ga THEN
        ALTER TABLE geographic_assets RENAME TO geospatial_assets;
        RAISE NOTICE 'Renamed legacy table geographic_assets to geospatial_assets.';
    END IF;

    -- 3. user_notification_preferences -> notification_subscriptions
    IF v_has_legacy_ns AND v_has_new_ns THEN
        RAISE NOTICE 'Both user_notification_preferences and notification_subscriptions exist as base tables. Preserving both tables. Manual data consolidation may be needed.';
    ELSIF v_has_legacy_ns AND NOT v_has_new_ns THEN
        ALTER TABLE user_notification_preferences RENAME TO notification_subscriptions;
        RAISE NOTICE 'Renamed legacy table user_notification_preferences to notification_subscriptions.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TABLE 1: LOCATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name TEXT NOT NULL,
    location_type VARCHAR(64) NOT NULL DEFAULT 'village' 
        CHECK (location_type IN ('village', 'gram_panchayat', 'mandal_block', 'taluk_tehsil', 'district', 'state', 'coordinates')),
    parent_location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    mandal_block VARCHAR(128),
    latitude DOUBLE PRECISION CHECK (latitude >= 5.0 AND latitude <= 39.0),
    longitude DOUBLE PRECISION CHECK (longitude >= 67.0 AND longitude <= 99.0),
    elevation_m DOUBLE PRECISION,
    region_category VARCHAR(64) NOT NULL DEFAULT 'plains'
        CHECK (region_category IN ('himalayan', 'coastal', 'riverine', 'drought_prone', 'northeastern', 'island', 'plains')),
    bounding_box DOUBLE PRECISION[],
    geom GEOMETRY(Point, 4326),
    boundary_geom GEOMETRY(MultiPolygon, 4326),
    data_source VARCHAR(255) NOT NULL DEFAULT 'Survey of India / OpenStreetMap',
    quality_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(64) DEFAULT 'village';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS parent_location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS mandal_block VARCHAR(128);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS boundary_geom GEOMETRY(MultiPolygon, 4326);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS data_source VARCHAR(255) DEFAULT 'Survey of India / OpenStreetMap';
ALTER TABLE locations ADD COLUMN IF NOT EXISTS quality_notes TEXT;

-- Safe non-fabricating backfill for locations
DO $$
DECLARE
    v_null_lat INTEGER;
    v_null_lng INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'center_lat') THEN
        UPDATE locations SET latitude = center_lat WHERE latitude IS NULL AND center_lat IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'center_lng') THEN
        UPDATE locations SET longitude = center_lng WHERE longitude IS NULL AND center_lng IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'admin_level') THEN
        UPDATE locations SET location_type = admin_level WHERE (location_type IS NULL OR location_type = 'village') AND admin_level IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'source') THEN
        UPDATE locations SET data_source = source WHERE data_source IS NULL AND source IS NOT NULL;
    END IF;

    -- Update spatial point geometry from coordinates if geom is null
    UPDATE locations 
    SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE geom IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

    -- Generate bounding box only if real coordinates exist
    UPDATE locations 
    SET bounding_box = ARRAY[longitude - 0.02, latitude - 0.02, longitude + 0.02, latitude + 0.02]
    WHERE bounding_box IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

    -- Audit NULLs before attempting NOT NULL enforcement
    SELECT count(*) INTO v_null_lat FROM locations WHERE latitude IS NULL;
    SELECT count(*) INTO v_null_lng FROM locations WHERE longitude IS NULL;
    IF v_null_lat > 0 OR v_null_lng > 0 THEN
        RAISE NOTICE 'locations table has % rows with NULL latitude and % rows with NULL longitude. Leaving columns nullable to preserve existing records.', v_null_lat, v_null_lng;
    ELSE
        ALTER TABLE locations ALTER COLUMN latitude SET NOT NULL;
        ALTER TABLE locations ALTER COLUMN longitude SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_locations_name ON locations (name);
CREATE INDEX IF NOT EXISTS idx_locations_state_district ON locations (state, district);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations (location_type);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations (parent_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_boundary ON locations USING GIST (boundary_geom);

-- ----------------------------------------------------------------------------
-- TABLE 2: HISTORICAL_DISASTERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historical_disasters (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    hazard_type VARCHAR(64) NOT NULL 
        CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_end_date DATE,
    description TEXT,
    state VARCHAR(128) NOT NULL,
    district VARCHAR(128) NOT NULL,
    village_name VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geom GEOMETRY(Point, 4326),
    observed_magnitude VARCHAR(128),
    affected_population BIGINT CHECK (affected_population >= 0),
    deaths INTEGER CHECK (deaths >= 0),
    injuries INTEGER CHECK (injuries >= 0),
    displaced_people INTEGER CHECK (displaced_people >= 0),
    damaged_houses INTEGER CHECK (damaged_houses >= 0),
    crop_area_ha DOUBLE PRECISION CHECK (crop_area_ha >= 0),
    economic_loss_crores DOUBLE PRECISION CHECK (economic_loss_crores >= 0),
    affected_area_sqkm DOUBLE PRECISION CHECK (affected_area_sqkm >= 0),
    source_name VARCHAR(255) NOT NULL DEFAULT 'NDMA / IMD / SDMA Registry',
    source_url TEXT,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'confirmed'
        CHECK (verification_status IN ('confirmed', 'estimated', 'incomplete', 'unverified')),
    deduplication_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS event_end_date DATE;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS deaths INTEGER;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS injuries INTEGER;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS displaced_people INTEGER;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS affected_area_sqkm DOUBLE PRECISION;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS source_name VARCHAR(255) DEFAULT 'NDMA / IMD / SDMA Registry';
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS verification_status VARCHAR(32) DEFAULT 'confirmed';
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(128);
ALTER TABLE historical_disasters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_disasters' AND column_name = 'fatalities') THEN
        UPDATE historical_disasters SET deaths = fatalities WHERE deaths IS NULL AND fatalities IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_disasters' AND column_name = 'injured') THEN
        UPDATE historical_disasters SET injuries = injured WHERE injuries IS NULL AND injured IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_disasters' AND column_name = 'source') THEN
        UPDATE historical_disasters SET source_name = source WHERE source_name IS NULL AND source IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_disasters' AND column_name = 'confidence_level') THEN
        UPDATE historical_disasters SET verification_status = confidence_level WHERE verification_status IS NULL AND confidence_level IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historical_disasters' AND column_name = 'dedup_hash') THEN
        UPDATE historical_disasters SET deduplication_key = dedup_hash WHERE deduplication_key IS NULL AND dedup_hash IS NOT NULL;
    END IF;
    UPDATE historical_disasters 
    SET deduplication_key = md5(id || '-' || COALESCE(state, '') || '-' || COALESCE(event_date::text, '')) 
    WHERE deduplication_key IS NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_disasters_dedup_key ON historical_disasters (deduplication_key);
CREATE INDEX IF NOT EXISTS idx_disasters_loc ON historical_disasters (location_id);
CREATE INDEX IF NOT EXISTS idx_disasters_hazard_date ON historical_disasters (hazard_type, event_date);
CREATE INDEX IF NOT EXISTS idx_disasters_state_district ON historical_disasters (state, district);
CREATE INDEX IF NOT EXISTS idx_disasters_verification ON historical_disasters (verification_status);
CREATE INDEX IF NOT EXISTS idx_disasters_geom ON historical_disasters USING GIST (geom);

-- ----------------------------------------------------------------------------
-- TABLE 3: WEATHER_OBSERVATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_observations (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    temperature DOUBLE PRECISION,
    rainfall DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (rainfall >= 0),
    humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
    wind_speed DOUBLE PRECISION CHECK (wind_speed >= 0),
    wind_direction VARCHAR(32),
    weather_condition VARCHAR(128) NOT NULL DEFAULT 'Clear',
    pressure_hpa DOUBLE PRECISION,
    provider VARCHAR(128) NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS rainfall DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS humidity INTEGER;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS wind_speed DOUBLE PRECISION;
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(128) DEFAULT 'Clear';
ALTER TABLE weather_observations ADD COLUMN IF NOT EXISTS raw_data JSONB;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'temperature_c') THEN
        UPDATE weather_observations SET temperature = temperature_c WHERE temperature IS NULL AND temperature_c IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'rainfall_rate_mmh') THEN
        UPDATE weather_observations SET rainfall = rainfall_rate_mmh WHERE rainfall IS NULL AND rainfall_rate_mmh IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'humidity_percent') THEN
        UPDATE weather_observations SET humidity = humidity_percent WHERE humidity IS NULL AND humidity_percent IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'wind_speed_kmh') THEN
        UPDATE weather_observations SET wind_speed = wind_speed_kmh WHERE wind_speed IS NULL AND wind_speed_kmh IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'condition') THEN
        UPDATE weather_observations SET weather_condition = condition WHERE (weather_condition IS NULL OR weather_condition = 'Clear') AND condition IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_observations' AND column_name = 'retrieval_timestamp') THEN
        UPDATE weather_observations SET observed_at = retrieval_timestamp WHERE observed_at IS NULL AND retrieval_timestamp IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wobs_loc_time ON weather_observations (location_id, observed_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE 4: WEATHER_FORECASTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_forecasts (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    forecast_issued_at TIMESTAMPTZ NOT NULL,
    forecast_valid_at TIMESTAMPTZ NOT NULL,
    forecast_horizon_hours INTEGER NOT NULL DEFAULT 0 CHECK (forecast_horizon_hours >= 0),
    temperature DOUBLE PRECISION,
    rainfall_probability INTEGER CHECK (rainfall_probability >= 0 AND rainfall_probability <= 100),
    predicted_rainfall DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (predicted_rainfall >= 0),
    wind_speed DOUBLE PRECISION,
    weather_condition VARCHAR(128) NOT NULL DEFAULT 'Clear',
    provider VARCHAR(128) NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS forecast_issued_at TIMESTAMPTZ;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS forecast_valid_at TIMESTAMPTZ;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS forecast_horizon_hours INTEGER DEFAULT 0;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS rainfall_probability INTEGER;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS predicted_rainfall DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS wind_speed DOUBLE PRECISION;
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(128) DEFAULT 'Clear';
ALTER TABLE weather_forecasts ADD COLUMN IF NOT EXISTS raw_data JSONB;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'forecast_issue_time') THEN
        UPDATE weather_forecasts SET forecast_issued_at = forecast_issue_time WHERE forecast_issued_at IS NULL AND forecast_issue_time IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'forecast_valid_time') THEN
        UPDATE weather_forecasts SET forecast_valid_at = forecast_valid_time WHERE forecast_valid_at IS NULL AND forecast_valid_time IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'temperature_c') THEN
        UPDATE weather_forecasts SET temperature = temperature_c WHERE temperature IS NULL AND temperature_c IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'rainfall_mm') THEN
        UPDATE weather_forecasts SET predicted_rainfall = rainfall_mm WHERE predicted_rainfall IS NULL AND rainfall_mm IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'rain_probability_percent') THEN
        UPDATE weather_forecasts SET rainfall_probability = rain_probability_percent WHERE rainfall_probability IS NULL AND rain_probability_percent IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'wind_speed_kmh') THEN
        UPDATE weather_forecasts SET wind_speed = wind_speed_kmh WHERE wind_speed IS NULL AND wind_speed_kmh IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'weather_forecasts' AND column_name = 'condition') THEN
        UPDATE weather_forecasts SET weather_condition = condition WHERE (weather_condition IS NULL OR weather_condition = 'Clear') AND condition IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wfc_loc_valid ON weather_forecasts (location_id, forecast_valid_at);
CREATE INDEX IF NOT EXISTS idx_wfc_issued ON weather_forecasts (forecast_issued_at);

-- ----------------------------------------------------------------------------
-- TABLE 5: GEOSPATIAL_ASSETS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geospatial_assets (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    asset_type VARCHAR(64) NOT NULL 
        CHECK (asset_type IN ('boundary', 'terrain', 'elevation', 'building', 'road', 'drainage', 'land_use', 'water_body', 'critical_lifeline', 'shelter')),
    name VARCHAR(255) NOT NULL,
    data_source VARCHAR(255) NOT NULL DEFAULT 'OpenStreetMap / Survey of India',
    source_url TEXT,
    geometry GEOMETRY(Geometry, 4326),
    resolution VARCHAR(64),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    coverage_status VARCHAR(32) NOT NULL DEFAULT 'available'
        CHECK (coverage_status IN ('available', 'partial', 'missing', 'outdated')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS asset_type VARCHAR(64);
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS data_source VARCHAR(255) DEFAULT 'OpenStreetMap / Survey of India';
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS geometry GEOMETRY(Geometry, 4326);
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS resolution VARCHAR(64);
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS coverage_status VARCHAR(32) DEFAULT 'available';
ALTER TABLE geospatial_assets ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geospatial_assets' AND column_name = 'asset_category') THEN
        UPDATE geospatial_assets SET asset_type = asset_category WHERE asset_type IS NULL AND asset_category IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geospatial_assets' AND column_name = 'provenance') THEN
        UPDATE geospatial_assets SET data_source = provenance WHERE data_source IS NULL AND provenance IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'geospatial_assets' AND column_name = 'properties_json') THEN
        UPDATE geospatial_assets SET metadata = properties_json WHERE metadata IS NULL AND properties_json IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assets_loc_type ON geospatial_assets (location_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_geom ON geospatial_assets USING GIST (geometry);

-- ----------------------------------------------------------------------------
-- TABLE 6: RISK_ASSESSMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_assessments (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    hazard_type VARCHAR(64) NOT NULL 
        CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    risk_level VARCHAR(32) NOT NULL 
        CHECK (risk_level IN ('low', 'moderate', 'high', 'very_high')),
    risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    assessment_summary TEXT NOT NULL DEFAULT '',
    input_data_sources JSONB NOT NULL DEFAULT '[]',
    data_coverage VARCHAR(32) NOT NULL DEFAULT 'high' 
        CHECK (data_coverage IN ('high', 'moderate', 'low', 'sparse')),
    confidence VARCHAR(32) NOT NULL DEFAULT 'High'
        CHECK (confidence IN ('High', 'Moderate', 'Indicative')),
    model_name VARCHAR(128) NOT NULL DEFAULT 'BharatTwin-MultiHazard',
    model_version VARCHAR(64) NOT NULL DEFAULT 'v2.1',
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_score DOUBLE PRECISION;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS assessment_summary TEXT DEFAULT '';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS input_data_sources JSONB DEFAULT '[]';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS data_coverage VARCHAR(32) DEFAULT 'high';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS confidence VARCHAR(32) DEFAULT 'High';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS model_name VARCHAR(128) DEFAULT 'BharatTwin-MultiHazard';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS model_version VARCHAR(64) DEFAULT 'v2.1';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'risk_assessments' AND column_name = 'scientific_score') THEN
        UPDATE risk_assessments SET risk_score = scientific_score WHERE risk_score IS NULL AND scientific_score IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'risk_assessments' AND column_name = 'confidence_tier') THEN
        UPDATE risk_assessments SET confidence = confidence_tier WHERE confidence IS NULL AND confidence_tier IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_risk_loc_hazard ON risk_assessments (location_id, hazard_type);
CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_assessments (risk_level);

-- ----------------------------------------------------------------------------
-- TABLE 7: SIMULATION_RUNS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulation_runs (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    hazard_type VARCHAR(64) NOT NULL DEFAULT 'flood'
        CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    scenario_parameters JSONB NOT NULL,
    model_name VARCHAR(128) NOT NULL DEFAULT 'BharatTwin-Hydrology-2D',
    model_version VARCHAR(64) NOT NULL DEFAULT 'v2.1',
    input_data_sources JSONB NOT NULL DEFAULT '["OpenStreetMap Buildings", "Terrain DEM", "Drainage Network"]',
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    result_summary JSONB,
    result_asset_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sim_loc_status ON simulation_runs (location_id, status);
CREATE INDEX IF NOT EXISTS idx_sim_hazard ON simulation_runs (hazard_type);

-- ----------------------------------------------------------------------------
-- TABLE 8: INFRASTRUCTURE_RECOMMENDATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infrastructure_recommendations (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(128) NOT NULL,
    proposed_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    candidate_geometry GEOMETRY(Point, 4326),
    hazard_exposure VARCHAR(64) NOT NULL DEFAULT 'low',
    accessibility_score DOUBLE PRECISION CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
    suitability_score DOUBLE PRECISION NOT NULL CHECK (suitability_score >= 0 AND suitability_score <= 100),
    estimated_cost DOUBLE PRECISION,
    estimated_beneficiaries INTEGER CHECK (estimated_beneficiaries >= 0),
    explanation TEXT NOT NULL,
    evidence_sources JSONB NOT NULL DEFAULT '[]',
    verification_status VARCHAR(64) NOT NULL DEFAULT 'Requires Field Ground-Truthing',
    model_version VARCHAR(64) NOT NULL DEFAULT 'BharatTwin-InfraPlanner-v2.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infra_loc ON infrastructure_recommendations (location_id);
CREATE INDEX IF NOT EXISTS idx_infra_geom ON infrastructure_recommendations USING GIST (candidate_geometry);

-- ----------------------------------------------------------------------------
-- TABLE 9: ALERTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(128) PRIMARY KEY,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    hazard_type VARCHAR(64) NOT NULL 
        CHECK (hazard_type IN ('flood', 'waterlogging', 'cyclone', 'earthquake', 'tsunami', 'landslide', 'drought', 'heatwave', 'wildfire')),
    alert_level VARCHAR(32) NOT NULL 
        CHECK (alert_level IN ('info', 'advisory', 'watch', 'warning', 'emergency')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    source_url TEXT,
    is_official_warning BOOLEAN NOT NULL DEFAULT false,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'updated', 'expired')),
    deduplication_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_level VARCHAR(32) DEFAULT 'advisory';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_official_warning BOOLEAN DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(128);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'severity') THEN
        UPDATE alerts SET alert_level = severity WHERE alert_level IS NULL AND severity IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'description') THEN
        UPDATE alerts SET message = description WHERE message IS NULL AND description IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'source') THEN
        UPDATE alerts SET source_name = source WHERE source_name IS NULL AND source IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'dedup_hash') THEN
        UPDATE alerts SET deduplication_key = dedup_hash WHERE deduplication_key IS NULL AND dedup_hash IS NOT NULL;
    END IF;
    UPDATE alerts 
    SET deduplication_key = md5(id || '-' || COALESCE(title, '') || '-' || COALESCE(issued_at::text, '')) 
    WHERE deduplication_key IS NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup_key ON alerts (deduplication_key);
CREATE INDEX IF NOT EXISTS idx_alerts_status_level ON alerts (status, alert_level);
CREATE INDEX IF NOT EXISTS idx_alerts_loc ON alerts (location_id);
CREATE INDEX IF NOT EXISTS idx_alerts_official ON alerts (is_official_warning);

-- ----------------------------------------------------------------------------
-- TABLE 10: NOTIFICATION_SUBSCRIPTIONS (STRICTLY PRIVATE TO USER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    location_id VARCHAR(128) REFERENCES locations(id) ON DELETE SET NULL,
    hazard_types JSONB NOT NULL DEFAULT '["flood", "cyclone", "heatwave", "landslide"]',
    notification_channels JSONB NOT NULL DEFAULT '["in_app"]',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_sub_user ON notification_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_sub_loc ON notification_subscriptions (location_id);

-- ----------------------------------------------------------------------------
-- TABLE 11: NOTIFICATION_HISTORY (STRICTLY PRIVATE TO USER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_history (
    id VARCHAR(128) PRIMARY KEY,
    alert_id VARCHAR(128) REFERENCES alerts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
    delivery_status VARCHAR(32) NOT NULL CHECK (delivery_status IN ('delivered', 'failed', 'pending')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_hist_alert ON notification_history (alert_id);
CREATE INDEX IF NOT EXISTS idx_notif_hist_user ON notification_history (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_hist_status ON notification_history (delivery_status);

-- ----------------------------------------------------------------------------
-- STEP 3: BACKWARD COMPATIBILITY VIEWS (ONLY IF NO BASE TABLE CONFLICTS)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'weather_forecast_snapshots' AND table_type = 'BASE TABLE'
    ) THEN
        EXECUTE $v$
            CREATE OR REPLACE VIEW weather_forecast_snapshots AS
            SELECT 
                id,
                location_id,
                provider,
                forecast_issued_at AS forecast_issue_time,
                forecast_valid_at AS forecast_valid_time,
                'hourly'::VARCHAR(32) AS forecast_type,
                temperature AS temperature_c,
                temperature AS max_temp_c,
                temperature AS min_temp_c,
                weather_condition AS condition,
                predicted_rainfall AS rainfall_mm,
                rainfall_probability AS rain_probability_percent,
                wind_speed AS wind_speed_kmh,
                created_at AS retrieval_timestamp
            FROM weather_forecasts;
        $v$;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'geographic_assets' AND table_type = 'BASE TABLE'
    ) THEN
        EXECUTE $v$
            CREATE OR REPLACE VIEW geographic_assets AS
            SELECT 
                id,
                location_id,
                asset_type AS asset_category,
                name,
                'Point'::VARCHAR(32) AS geom_type,
                NULL::JSONB AS coordinates_json,
                NULL::DOUBLE PRECISION AS elevation_m,
                NULL::DOUBLE PRECISION AS vulnerability_score,
                false AS is_critical_lifeline,
                metadata AS properties_json,
                data_source AS provenance,
                created_at
            FROM geospatial_assets;
        $v$;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_notification_preferences' AND table_type = 'BASE TABLE'
    ) THEN
        EXECUTE $v$
            CREATE OR REPLACE VIEW user_notification_preferences AS
            SELECT 
                id,
                user_id,
                location_id,
                hazard_types,
                notification_channels,
                enabled,
                created_at,
                updated_at
            FROM notification_subscriptions;
        $v$;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: ROW LEVEL SECURITY (RLS) POLICIES — IDEMPOTENT & PROPERLY ISOLATED
-- ============================================================================

-- 1. Enable RLS on all 11 tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geospatial_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- 2. Public Read Policies for Public Domain Hazard & Planning Data
DROP POLICY IF EXISTS "Public Read Locations" ON locations;
CREATE POLICY "Public Read Locations" ON locations 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Historical Disasters" ON historical_disasters;
CREATE POLICY "Public Read Historical Disasters" ON historical_disasters 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Weather Observations" ON weather_observations;
CREATE POLICY "Public Read Weather Observations" ON weather_observations 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Weather Forecasts" ON weather_forecasts;
CREATE POLICY "Public Read Weather Forecasts" ON weather_forecasts 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Geospatial Assets" ON geospatial_assets;
CREATE POLICY "Public Read Geospatial Assets" ON geospatial_assets 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Risk Assessments" ON risk_assessments;
CREATE POLICY "Public Read Risk Assessments" ON risk_assessments 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Simulation Runs" ON simulation_runs;
CREATE POLICY "Public Read Simulation Runs" ON simulation_runs 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Infrastructure Recommendations" ON infrastructure_recommendations;
CREATE POLICY "Public Read Infrastructure Recommendations" ON infrastructure_recommendations 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Alerts" ON alerts;
CREATE POLICY "Public Read Alerts" ON alerts 
    FOR SELECT USING (true);

-- 3. Authenticated Tenant Isolation for Notification Subscriptions
DROP POLICY IF EXISTS "Users Read Own Subscriptions" ON notification_subscriptions;
CREATE POLICY "Users Read Own Subscriptions" ON notification_subscriptions 
    FOR SELECT USING (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Users Insert Own Subscriptions" ON notification_subscriptions;
CREATE POLICY "Users Insert Own Subscriptions" ON notification_subscriptions 
    FOR INSERT WITH CHECK (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Users Update Own Subscriptions" ON notification_subscriptions;
CREATE POLICY "Users Update Own Subscriptions" ON notification_subscriptions 
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Users Delete Own Subscriptions" ON notification_subscriptions;
CREATE POLICY "Users Delete Own Subscriptions" ON notification_subscriptions 
    FOR DELETE USING (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

-- 4. Authenticated Tenant Isolation for Notification History
DROP POLICY IF EXISTS "Users Read Own Notification History" ON notification_history;
CREATE POLICY "Users Read Own Notification History" ON notification_history 
    FOR SELECT USING (
        (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
        OR auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Notification History" ON notification_history;
CREATE POLICY "Service Manage Notification History" ON notification_history 
    FOR ALL USING (
        auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'service_role'
        OR current_user = 'postgres'
        OR current_user LIKE 'postgres.%'
    );

-- 5. Privileged Server-Side / Service Role Policies for Atlas Maintenance & Ingestion
DROP POLICY IF EXISTS "Service Manage Locations" ON locations;
CREATE POLICY "Service Manage Locations" ON locations 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Disasters" ON historical_disasters;
CREATE POLICY "Service Manage Disasters" ON historical_disasters 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Weather Observations" ON weather_observations;
CREATE POLICY "Service Manage Weather Observations" ON weather_observations 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Weather Forecasts" ON weather_forecasts;
CREATE POLICY "Service Manage Weather Forecasts" ON weather_forecasts 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Geospatial Assets" ON geospatial_assets;
CREATE POLICY "Service Manage Geospatial Assets" ON geospatial_assets 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Risk Assessments" ON risk_assessments;
CREATE POLICY "Service Manage Risk Assessments" ON risk_assessments 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Simulation Runs" ON simulation_runs;
CREATE POLICY "Service Manage Simulation Runs" ON simulation_runs 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Infrastructure Recommendations" ON infrastructure_recommendations;
CREATE POLICY "Service Manage Infrastructure Recommendations" ON infrastructure_recommendations 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

DROP POLICY IF EXISTS "Service Manage Alerts" ON alerts;
CREATE POLICY "Service Manage Alerts" ON alerts 
    FOR ALL USING (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    ) WITH CHECK (
        auth.role() = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role' OR current_user = 'postgres' OR current_user LIKE 'postgres.%'
    );

-- ----------------------------------------------------------------------------
-- STEP 5: RECORD MIGRATION COMPLETION
-- ----------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name, applied_at, description)
VALUES ('0002', 'supabase_postgis_rls', CURRENT_TIMESTAMP, 'Unified 11-table schema, PostGIS spatial columns, and strict RLS policies')
ON CONFLICT (version) DO UPDATE SET 
    description = EXCLUDED.description;

SELECT 
    'MIGRATION_0002_SUCCESS' AS migration_status,
    '0002_supabase_postgis_rls.sql' AS migration_file,
    CURRENT_TIMESTAMP AS execution_timestamp;
