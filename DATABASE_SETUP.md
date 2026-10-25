# Bharat Village Twin — Database Architecture & Supabase PostGIS Setup Guide

This document provides production setup, migration, security, and verification instructions for **Bharat Village Twin — Nationwide Multi-Hazard Digital Twin & AI-Powered Rural Infrastructure Planning System**.

---

## 1. Architecture & Schema Overview

The database layer utilizes **Supabase PostgreSQL 15+ with PostGIS 3.0+ spatial extensions** to power nationwide spatial queries, multi-hazard risk assessment persistence, hydrodynamic simulation logging, and infrastructure planning.

### Entity-Relationship Diagram (ERD)

```text
               +-------------------------------------------------------+
               |                       LOCATIONS                       |
               | (Administrative boundaries, Lat/Lng, PostGIS Geometry)|
               +---------------------------+---------------------------+
                                           |
         +-----------------+---------------+-----------------+------------------+
         | 1:N             | 1:N           | 1:N             | 1:N              | 1:N
+--------v--------+ +------v------+ +------v-------+ +-------v-------+ +--------v--------+
|   HISTORICAL    | |   WEATHER   | |   WEATHER    | |  GEOSPATIAL   | |      RISK        |
|    DISASTERS    | |OBSERVATIONS | |  FORECASTS   | |    ASSETS     | |  ASSESSMENTS     |
| (Empirical loss)| | (Real-time) | |(Issue vs Val)| |(OSM / DEM/GIS)| |(8 Hazard Models)|
+-----------------+ +-------------+ +--------------+ +---------------+ +--------+----------+
                                                                                |
         +-----------------+---------------+-----------------+------------------+
         | 1:N             | 1:N           | 1:N             | 1:N
+--------v--------+ +------v------+ +------v-------+ +-------v-------+
|   SIMULATION    | |INFRASTRUCTURE| |    ALERTS    | | NOTIFICATION  |
|      RUNS       | |RECOMMENDATNS| |(Govt Warnings| | SUBSCRIPTIONS |
| (Hydrodynamic)  | |(Candidate)  | | vs Model)    | | (User prefs)  |
+-----------------+ +-------------+ +------+-------+ +-------+-------+
                                           |                 |
                                           +--------+--------+
                                                    | 1:N
                                           +--------v--------+
                                           |  NOTIFICATION   |
                                           |     HISTORY     |
                                           | (Delivery audit)|
                                           +-----------------+
```

---

## 2. Table Specifications (11 Required Entities)

| # | Table | Purpose | Spatial Feature | RLS Policy |
| :- | :--- | :--- | :--- | :--- |
| 1 | **`locations`** | Nationwide villages, Gram Panchayats, mandals, and districts | `geom` (Point), `boundary_geom` (MultiPolygon) | Public read; Admin write |
| 2 | **`historical_disasters`** | NDMA, IMD, BMTPC, GSI verified disaster & damage records | `geom` (Point) | Public read; Admin write |
| 3 | **`weather_observations`** | Real-time meteorological station & satellite data | `observed_at`, metrics | Public read; Service write |
| 4 | **`weather_forecasts`** | Prognostics with separate issue time and valid time | Forecast horizon, rain prob | Public read; Service write |
| 5 | **`geospatial_assets`** | Buildings, roads, waterways, drainage, and elevation DEM | `geometry` (Geometry 4326) | Public read; Service write |
| 6 | **`risk_assessments`** | 8 hazard evaluations with model version & confidence | Composite & hazard scores | Public read; Service write |
| 7 | **`simulation_runs`** | Real hydrodynamic calculations (pending, completed, failed) | Inundation ha, depth, status | Public read; Service write |
| 8 | **`infrastructure_recommendations`** | Multi-criteria ranked candidate sites with ground-truthing notes | `candidate_geometry` (Point) | Public read; Service write |
| 9 | **`alerts`** | Authoritative warnings (distinguishes Official vs Model) | Deduplication hash | Public read; Service write |
| 10 | **`notification_subscriptions`**| User hazard alert channels and severity thresholds | In-app, SMS, email | User-isolated (`user_id = auth.uid()`) |
| 11 | **`notification_history`** | Delivery attempts and audit dispatch logs | Channel, status, failure notes | User-isolated (`user_id = auth.uid()`) |

---

## 3. Legacy Table Compatibility & Migration

Migration `src/db/migrations/0002_supabase_postgis_rls.sql` is designed to be completely non-destructive:
- It **does not drop or truncate tables**.
- It preserves existing data.
- It safely checks for legacy table names from migration `0001` and transitions them:
  - `weather_forecast_snapshots` &rarr; `weather_forecasts`
  - `geographic_assets` &rarr; `geospatial_assets`
  - `user_notification_preferences` &rarr; `notification_subscriptions`
- It creates **compatibility SQL views** (`CREATE OR REPLACE VIEW ...`) so any queries or services expecting legacy table names continue functioning seamlessly without code alterations.
- It adds any missing columns using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and harmonizes column names (e.g. `center_lat` &rarr; `latitude`, `fatalities` &rarr; `deaths`).

---

## 4. Row Level Security (RLS) Policy Design

All 11 tables enforce Row Level Security:
1. **Public Read Tables** (`locations`, `historical_disasters`, `weather_observations`, `weather_forecasts`, `geospatial_assets`, `risk_assessments`, `simulation_runs`, `infrastructure_recommendations`, `alerts`):
   - `FOR SELECT USING (true)` permits reading public hazard atlas data.
   - `FOR ALL` / `FOR INSERT` restricts modifications to `service_role` and PostgreSQL superusers (`current_user IN ('postgres', 'service_role', 'supabase_admin') OR auth.role() = 'service_role'`).
2. **Tenant-Isolated Tables** (`notification_subscriptions`, `notification_history`):
   - **No hardcoded session strings**: Enforces true authenticated user identity:
     ```sql
     (auth.uid() IS NOT NULL AND (auth.uid())::text = user_id)
     OR (auth.role() = 'service_role')
     OR (current_user IN ('postgres', 'service_role', 'supabase_admin'))
     ```
   - Only backend services can create or update notification delivery history logs to prevent client spoofing.
3. **Idempotent Re-runs**:
   - Every policy is preceded by `DROP POLICY IF EXISTS "Policy Name" ON table_name;` ensuring the migration script can be run repeatedly without encountering `ERROR: policy already exists`.

---

## 5. Step-by-Step Instructions to Apply Migration in Supabase

The migration architecture consists of three version-controlled SQL files designed for sequential execution in the **Supabase SQL Editor**:

1. **`src/db/migrations/0002_preflight_check.sql`** (Read-Only Safety Audit)
2. **`src/db/migrations/0002_supabase_postgis_rls.sql`** (Idempotent Schema Migration)
3. **`src/db/migrations/0002_verify_schema.sql`** (Post-Migration Verification)

### Step 1: Run the Preflight Check
1. Open your browser and navigate to [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select your project (e.g. `bharat-village-twin`).
3. Click on **SQL Editor** (`>_`) in the left navigation menu.
4. Click **+ New Query**, paste the contents of `src/db/migrations/0002_preflight_check.sql`, and click **Run**.
5. Check the output:
   - Verifies PostGIS and UUID extensions.
   - Audits which of the 11 tables exist in the `public` schema.
   - Detects whether any legacy tables (`weather_forecast_snapshots`, `geographic_assets`, `user_notification_preferences`) coexist.
   - Inspects existing tables for NULL values in coordinates or deduplication keys.

### Step 2: Apply the Corrected Schema Migration
1. In the Supabase SQL Editor, click **+ New Query**.
2. Copy and paste the entire contents of `src/db/migrations/0002_supabase_postgis_rls.sql`.
3. Click **Run** (`Ctrl + Enter` / `Cmd + Enter`).
4. Look for the success banner:
   ```text
   migration_status: MIGRATION_0002_SUCCESS
   ```

### Step 3: Run Post-Migration Verification
1. Click **+ New Query**, paste `src/db/migrations/0002_verify_schema.sql`, and click **Run**.
2. Confirm:
   - All 11 tables display status `ACTIVE` with `rls_enabled: true`.
   - Each table has active security policies (`active_policy_count > 0`).
   - Spatial columns (`Point`, `MultiPolygon`) are registered on `locations`, `historical_disasters`, `geospatial_assets`, and `infrastructure_recommendations`.
   - `_schema_migrations` records version `0002`.

---

## 6. Manual Verification SQL Queries

To verify the database state at any time in Supabase SQL Editor:

### Check Table Presence & RLS Status
```sql
SELECT 
    t.table_name,
    c.relrowsecurity AS rls_enabled,
    (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS policy_count
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
```

### Check PostGIS Extension Status
```sql
SELECT 
    extname, 
    extversion, 
    PostGIS_Full_Version() 
FROM pg_extension 
WHERE extname = 'postgis';
```

---

## 7. Connecting Your Node.js Application

Set your credentials in `.env` or the platform environment settings:

```env
# Mode A: Direct PostgreSQL Connection Pool (Recommended)
DATABASE_URL="postgresql://postgres.your-project-ref:your-db-password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

# Mode B: Supabase JavaScript Client API (REST)
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-secret-key"
SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

Once configured, verify the live status from your app:
```bash
curl http://localhost:3000/api/database/status
```
The endpoint inspects `pg_extension` and `information_schema.tables`, reporting whether PostGIS is active, how many tables are present, and whether any migrations are pending.
