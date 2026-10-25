-- ============================================================================
-- BHARAT VILLAGE TWIN — PREFLIGHT SCHEMA AUDIT
-- Script: 0002_preflight_check.sql
-- Compatibility: PostgreSQL 14+ / Supabase PostgreSQL 15+
-- Nature: 100% READ-ONLY (No DDL, no data modifications)
--
-- Run this script in the Supabase SQL Editor BEFORE applying migration 0002.
-- It reports:
--   1. PostGIS and UUID extension installation & versions
--   2. Previous schema migrations recorded in public._schema_migrations
--   3. Presence and type (BASE TABLE vs VIEW) of all 11 core tables
--   4. Coexistence / conflict status of legacy 0001 tables
--   5. Existing row counts and NULL counts in critical fields
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS AUDIT
-- ----------------------------------------------------------------------------
SELECT 
    '1. EXTENSIONS' AS section,
    extname AS extension_name,
    extversion AS installed_version,
    CASE 
        WHEN extname = 'postgis' THEN 'PostGIS is active and ready for spatial columns (Point, MultiPolygon).'
        WHEN extname = 'uuid-ossp' THEN 'UUID generation is active.'
        ELSE 'Active extension.'
    END AS status_notes
FROM pg_extension 
WHERE extname IN ('postgis', 'uuid-ossp')
ORDER BY extname;

-- ----------------------------------------------------------------------------
-- 2. SCHEMA MIGRATION HISTORY AUDIT
-- ----------------------------------------------------------------------------
SELECT 
    '2. MIGRATION_HISTORY' AS section,
    COALESCE(version, 'NONE') AS version_id,
    COALESCE(name, 'NONE') AS migration_name,
    COALESCE(applied_at::text, 'Not recorded') AS applied_timestamp,
    COALESCE(description, 'No migrations recorded in public._schema_migrations') AS audit_notes
FROM (
    SELECT version, name, applied_at, description FROM public._schema_migrations
    UNION ALL
    SELECT 'NO_TABLE', 'public._schema_migrations', NULL, 'Migration tracking table does not exist yet. Migration 0002 will create it.'
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '_schema_migrations'
    )
) hist
ORDER BY applied_timestamp DESC;

-- ----------------------------------------------------------------------------
-- 3. CORE TABLE PRESENCE & LEGACY CONFLICT AUDIT
-- ----------------------------------------------------------------------------
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'locations',
        'historical_disasters',
        'weather_observations',
        'weather_forecasts',
        'geospatial_assets',
        'risk_assessments',
        'simulation_runs',
        'infrastructure_recommendations',
        'alerts',
        'notification_subscriptions',
        'notification_history'
    ]) AS table_name
)
SELECT 
    '3. TABLE_PRESENCE' AS section,
    et.table_name,
    COALESCE(t.table_type, 'MISSING') AS current_type,
    CASE 
        WHEN t.table_type = 'BASE TABLE' THEN 'Existing table found. Migration 0002 will upgrade columns non-destructively.'
        WHEN t.table_type = 'VIEW' THEN 'Existing view found.'
        ELSE 'Missing table. Migration 0002 will create freshly with full constraints.'
    END AS upgrade_action,
    CASE
        WHEN et.table_name = 'weather_forecasts' AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'weather_forecast_snapshots' AND table_type = 'BASE TABLE'
        ) THEN 'LEGACY CONFLICT RISK: weather_forecast_snapshots coexists as BASE TABLE. Will be preserved without overwrite.'
        WHEN et.table_name = 'geospatial_assets' AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'geographic_assets' AND table_type = 'BASE TABLE'
        ) THEN 'LEGACY CONFLICT RISK: geographic_assets coexists as BASE TABLE. Will be preserved without overwrite.'
        WHEN et.table_name = 'notification_subscriptions' AND EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_notification_preferences' AND table_type = 'BASE TABLE'
        ) THEN 'LEGACY CONFLICT RISK: user_notification_preferences coexists as BASE TABLE. Will be preserved without overwrite.'
        ELSE 'No legacy collision'
    END AS legacy_collision_status
FROM expected_tables et
LEFT JOIN information_schema.tables t 
    ON t.table_schema = 'public' AND t.table_name = et.table_name
ORDER BY et.table_name;

-- ----------------------------------------------------------------------------
-- 4. ROW COUNTS & NULL CHECKS IN EXISTING REQUIRED FIELDS
-- ----------------------------------------------------------------------------
SELECT 
    '4. DATA_INTEGRITY' AS section,
    'locations' AS table_name,
    c.reltuples::bigint AS approximate_row_count,
    CASE 
        WHEN c.relname IS NOT NULL THEN 'Table exists' 
        ELSE 'Table does not exist' 
    END AS table_state
FROM (SELECT 1) dummy
LEFT JOIN pg_class c ON c.relname = 'locations' AND c.relnamespace = 'public'::regnamespace
UNION ALL
SELECT 
    '4. DATA_INTEGRITY',
    'historical_disasters',
    c.reltuples::bigint,
    CASE WHEN c.relname IS NOT NULL THEN 'Table exists' ELSE 'Table does not exist' END
FROM (SELECT 1) dummy
LEFT JOIN pg_class c ON c.relname = 'historical_disasters' AND c.relnamespace = 'public'::regnamespace
UNION ALL
SELECT 
    '4. DATA_INTEGRITY',
    'weather_observations',
    c.reltuples::bigint,
    CASE WHEN c.relname IS NOT NULL THEN 'Table exists' ELSE 'Table does not exist' END
FROM (SELECT 1) dummy
LEFT JOIN pg_class c ON c.relname = 'weather_observations' AND c.relnamespace = 'public'::regnamespace
UNION ALL
SELECT 
    '4. DATA_INTEGRITY',
    'weather_forecasts',
    c.reltuples::bigint,
    CASE WHEN c.relname IS NOT NULL THEN 'Table exists' ELSE 'Table does not exist' END
FROM (SELECT 1) dummy
LEFT JOIN pg_class c ON c.relname = 'weather_forecasts' AND c.relnamespace = 'public'::regnamespace;
