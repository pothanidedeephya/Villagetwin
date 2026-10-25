-- ============================================================================
-- BHARAT VILLAGE TWIN — COMPLETE SCHEMA & RLS AUDIT VERIFICATION SCRIPT
-- Script: 0002_verify_schema.sql
-- Execution Order: Run this in Supabase SQL Editor AFTER applying 0002_supabase_postgis_rls.sql
-- ============================================================================

-- 1. Audit Table Presence, Table Type, Row Level Security, Policies Count, and Spatial Columns
SELECT 
    t.table_name,
    CASE 
        WHEN c.relname IS NOT NULL THEN 'ACTIVE' 
        ELSE 'MISSING' 
    END AS status,
    COALESCE(c.relrowsecurity, false) AS rls_enabled,
    (
        SELECT count(*) 
        FROM pg_policies p 
        WHERE p.schemaname = 'public' 
          AND p.tablename = t.table_name
    ) AS active_policy_count,
    COALESCE((
        SELECT string_agg(column_name || ' (' || udt_name || ')', ', ')
        FROM information_schema.columns col
        WHERE col.table_schema = 'public' 
          AND col.table_name = t.table_name 
          AND col.udt_name IN ('geometry', 'geography')
    ), 'none') AS spatial_columns
FROM (
    VALUES 
        ('locations'),
        ('historical_disasters'),
        ('weather_observations'),
        ('weather_forecasts'),
        ('geospatial_assets'),
        ('risk_assessments'),
        ('simulation_runs'),
        ('infrastructure_recommendations'),
        ('alerts'),
        ('notification_subscriptions'),
        ('notification_history')
) AS t(table_name)
LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = 'public'::regnamespace
ORDER BY t.table_name;

-- 2. Audit Legacy Compatibility Views vs Base Tables
SELECT 
    table_name AS legacy_object_name,
    table_type,
    CASE 
        WHEN table_type = 'VIEW' THEN 'Verified (Backward-compatible view to new schema)'
        WHEN table_type = 'BASE TABLE' THEN 'Coexisting base table preserved. Consider data consolidation.'
        ELSE 'Not present'
    END AS status_interpretation
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('weather_forecast_snapshots', 'geographic_assets', 'user_notification_preferences')
ORDER BY table_name;

-- 3. Audit Active Row Level Security Policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles::text,
    cmd,
    qual IS NOT NULL AS has_using_filter,
    with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 4. Audit PostGIS Spatial Capabilities
SELECT 
    extname AS extension_name, 
    extversion AS installed_version,
    PostGIS_Full_Version() AS postgis_full_version
FROM pg_extension 
WHERE extname = 'postgis';

-- 5. Audit Migration History Log
SELECT 
    version,
    name,
    applied_at,
    description
FROM public._schema_migrations
ORDER BY applied_at DESC;
