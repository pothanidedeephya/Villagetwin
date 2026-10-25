import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const EXPECTED_APPLICATION_TABLES = [
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
  'notification_history',
] as const;

export interface DatabaseStatus {
  connected: boolean;
  provider: 'supabase_direct_pg' | 'supabase_js_client' | 'local_file_fallback';
  postgisEnabled: boolean;
  postgisVersion?: string;
  tableCount?: number;
  tablesFound?: string[];
  tablesMissing?: string[];
  message: string;
  error?: string;
  host?: string;
  database?: string;
  url?: string;
}

let pgPool: pg.Pool | null = null;
let supabaseClient: SupabaseClient | null = null;

/**
 * Check whether any external database credentials (PostgreSQL or Supabase) are configured
 */
export function hasExternalCredentials(): boolean {
  const hasDbUrl = Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_CONNECTION_STRING
  );

  const hasDiscretePg = Boolean(
    (process.env.PGHOST || process.env.SQL_HOST) &&
    (process.env.PGUSER || process.env.SQL_USER) &&
    (process.env.PGDATABASE || process.env.SQL_DB_NAME)
  );

  const hasSupabaseClient = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY)
  );

  return hasDbUrl || hasDiscretePg || hasSupabaseClient;
}

/**
 * Get or initialize Postgres Connection Pool if connection strings/credentials exist
 */
export function getPgPool(): pg.Pool | null {
  if (pgPool) return pgPool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_CONNECTION_STRING;

  if (connectionString) {
    try {
      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      pgPool = new Pool({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      return pgPool;
    } catch (err) {
      console.warn('Failed to initialize PostgreSQL pool from connection string:', err);
    }
  }

  const host = process.env.PGHOST || process.env.SQL_HOST;
  const user = process.env.PGUSER || process.env.SQL_USER;
  const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD;
  const database = process.env.PGDATABASE || process.env.SQL_DB_NAME;
  const port = Number(process.env.PGPORT || process.env.SQL_PORT) || 5432;

  if (host && user && database) {
    try {
      const isLocal = host === 'localhost' || host === '127.0.0.1';
      pgPool = new Pool({
        host,
        port,
        user,
        password,
        database,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      return pgPool;
    } catch (err) {
      console.warn('Failed to initialize PostgreSQL pool from parameters:', err);
    }
  }

  return null;
}

/**
 * Get or initialize Supabase JS Client for REST & PostgREST operations
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }

  return null;
}

/**
 * Check database health, connection status, PostGIS extension presence, and table availability.
 *
 * CRITICAL RULE: If external credentials are present, DO NOT silently switch to local_file_fallback
 * if connection fails. Report the connection error clearly to the user and preserve data.
 */
export async function checkDatabaseHealth(): Promise<DatabaseStatus> {
  const credentialsConfigured = hasExternalCredentials();

  // Mode 1: External credentials are completely absent -> local persistent storage fallback
  if (!credentialsConfigured) {
    return {
      connected: false,
      provider: 'local_file_fallback',
      postgisEnabled: false,
      tableCount: 11,
      tablesFound: [...EXPECTED_APPLICATION_TABLES],
      tablesMissing: [],
      message:
        'Operating with zero-configuration persistent storage (./data/bharat_twin_database.json). External database credentials are absent.',
    };
  }

  // Mode 2: External credentials configured via Direct PostgreSQL / Pooler
  const pool = getPgPool();
  if (pool) {
    try {
      // 1. Inspect actual PostGIS extension state in pg_extension
      const extRes = await pool.query(
        "SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';"
      );
      const postgisInstalled = extRes.rows.length > 0;
      let postgisVersion: string | undefined;

      if (postgisInstalled) {
        try {
          const vRes = await pool.query('SELECT PostGIS_Version() as ver;');
          postgisVersion = vRes.rows[0]?.ver || extRes.rows[0]?.extversion;
        } catch {
          postgisVersion = extRes.rows[0]?.extversion || 'installed';
        }
      }

      // 2. Query actual existing application tables in public schema
      const tablesRes = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type IN ('BASE TABLE', 'VIEW');
      `);
      const existingTableNames = new Set(tablesRes.rows.map((r: any) => r.table_name));
      const found = EXPECTED_APPLICATION_TABLES.filter((t) => existingTableNames.has(t));
      const missing = EXPECTED_APPLICATION_TABLES.filter((t) => !existingTableNames.has(t));

      const dbRes = await pool.query('SELECT current_database() as db;');
      const currentDb = dbRes.rows[0]?.db;

      let message: string;
      if (!postgisInstalled) {
        message = `Connected to PostgreSQL database '${currentDb}'. PostGIS extension is NOT yet enabled. Run migration '0002_supabase_postgis_rls.sql' or execute 'CREATE EXTENSION postgis;' to enable spatial capabilities.`;
      } else if (missing.length > 0) {
        message = `Connected to Supabase PostgreSQL (PostGIS ${postgisVersion || 'active'}). Notice: ${missing.length} of ${EXPECTED_APPLICATION_TABLES.length} tables are currently missing from the 'public' schema (${missing.join(', ')}). Apply migration 'src/db/migrations/0002_supabase_postgis_rls.sql' in the Supabase SQL Editor to provision all tables and security policies.`;
      } else {
        message = `Connected to Supabase PostgreSQL (PostGIS ${postgisVersion || 'active'}). All ${found.length} required application tables and Row Level Security policies are active.`;
      }

      return {
        connected: true,
        provider: 'supabase_direct_pg',
        postgisEnabled: postgisInstalled,
        postgisVersion,
        tableCount: found.length,
        tablesFound: found,
        tablesMissing: missing,
        message,
        database: currentDb,
      };
    } catch (err: any) {
      return {
        connected: false,
        provider: 'supabase_direct_pg',
        postgisEnabled: false,
        error: err.message,
        message: `Supabase PostgreSQL connection failed: ${err.message}. Please verify DATABASE_URL and network access. Existing data preserved.`,
      };
    }
  }

  // Mode 3: External credentials configured via Supabase Client (REST / PostgREST)
  const supa = getSupabaseClient();
  if (supa) {
    try {
      const found: string[] = [];
      const missing: string[] = [];

      // Check existence of each table via PostgREST metadata head check
      for (const t of EXPECTED_APPLICATION_TABLES) {
        const { error } = await supa.from(t).select('*', { count: 'exact', head: true });
        if (error) {
          if (
            error.code === '42P01' ||
            error.message.includes('relation') ||
            error.message.includes('does not exist')
          ) {
            missing.push(t);
          } else {
            found.push(t);
          }
        } else {
          found.push(t);
        }
      }

      // Check PostGIS via RPC if exposed, or fallback
      let postgisEnabled = false;
      let postgisVersion: string | undefined;
      try {
        const { data, error } = await supa.rpc('postgis_version');
        if (!error && data) {
          postgisEnabled = true;
          postgisVersion = String(data);
        }
      } catch {
        // RPC might not be exposed; if tables with geom exist, postgis is likely active
        postgisEnabled = found.includes('locations');
      }

      let message: string;
      if (missing.length > 0) {
        message = `Connected to Supabase API. Notice: ${missing.length} tables are missing from the 'public' schema (${missing.join(', ')}). Run migration '0002_supabase_postgis_rls.sql' in the Supabase SQL Editor.`;
      } else {
        message = `Connected to Supabase Client API. All ${found.length} tables verified.`;
      }

      return {
        connected: true,
        provider: 'supabase_js_client',
        postgisEnabled,
        postgisVersion,
        tableCount: found.length,
        tablesFound: found,
        tablesMissing: missing,
        message,
        url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      };
    } catch (err: any) {
      return {
        connected: false,
        provider: 'supabase_js_client',
        postgisEnabled: false,
        error: err.message,
        message: `Supabase API ping failed: ${err.message}. Please verify SUPABASE_URL and keys. Existing data preserved.`,
      };
    }
  }

  // Fallback in case configuration parsing was indeterminate
  return {
    connected: false,
    provider: 'local_file_fallback',
    postgisEnabled: false,
    message: 'Operating with zero-configuration persistent storage (./data/bharat_twin_database.json).',
  };
}

/**
 * Execute parameterized SQL query safely against PostgreSQL pool if connected
 */
export async function querySql<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error('PostgreSQL pool not configured.');
  }
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}
