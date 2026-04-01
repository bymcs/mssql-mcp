import sql from "mssql";
import type { DatabaseConfig, ConnectionState } from "../types.js";
import { POOL_MAX, POOL_MIN, POOL_IDLE_TIMEOUT_MS } from "../constants.js";

let pool: sql.ConnectionPool | null = null;
let currentConfig: DatabaseConfig | null = null;

export async function connectPool(config: DatabaseConfig): Promise<void> {
  if (pool) {
    console.error("Closing existing connection...");
    await pool.close();
    pool = null;
  }

  console.error(`Connecting to ${config.server}:${config.port}`);

  const newPool = new sql.ConnectionPool({
    server: config.server,
    database: config.database,
    user: config.user,
    password: config.password,
    port: config.port,
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      enableArithAbort: true,
      useUTC: false,
    },
    connectionTimeout: config.connectionTimeout,
    requestTimeout: config.requestTimeout,
    pool: { max: POOL_MAX, min: POOL_MIN, idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS },
  });

  newPool.on("error", (err: Error) => {
    console.error("Pool error:", err);
  });

  try {
    await newPool.connect();
    pool = newPool;
    currentConfig = config;
    console.error(`Connected to ${config.server}${config.database ? `/${config.database}` : ""}`);
  } catch (err) {
    try { await newPool.close(); } catch { /* ignore */ }
    throw err;
  }
}

export async function disconnectPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    currentConfig = null;
  }
}

export function getPool(): sql.ConnectionPool | null {
  return pool;
}

export function requirePool(): sql.ConnectionPool {
  if (!pool?.connected) {
    throw new Error("No active database connection. Use connect_database first.");
  }
  return pool;
}

export function getConnectionState(): ConnectionState {
  return {
    connected: pool?.connected ?? false,
    config: currentConfig
      ? { server: currentConfig.server, database: currentConfig.database, port: currentConfig.port }
      : null,
    pool_info: pool
      ? { size: pool.size, available: pool.available, pending: pool.pending, borrowed: pool.borrowed }
      : null,
  };
}

export async function closePoolOnShutdown(): Promise<void> {
  if (pool) {
    try { await pool.close(); } catch { /* ignore */ }
    pool = null;
    currentConfig = null;
  }
}
