export interface PaginationMeta {
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  total_count?: number;
}

export interface ToolResult<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
  pagination?: PaginationMeta;
  execution_time_ms?: number;
  truncated?: boolean;
  truncation_message?: string;
}

export interface DatabaseConfig {
  server: string;
  database?: string;
  user?: string;
  password?: string;
  port: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectionTimeout: number;
  requestTimeout: number;
}

export interface ConnectionState {
  connected: boolean;
  config: Pick<DatabaseConfig, "server" | "database" | "port"> | null;
  pool_info: {
    size: number;
    available: number;
    pending: number;
    borrowed: number;
  } | null;
}
