import { z } from "zod";

export const PaginationSchema = z.object({
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().nullable(),
  total_count: z.number().optional(),
});

export const ConnectionStateSchema = z.object({
  connected: z.boolean(),
  config: z
    .object({
      server: z.string(),
      database: z.string().optional(),
      port: z.number(),
    })
    .nullable(),
  pool_info: z
    .object({
      size: z.number(),
      available: z.number(),
      pending: z.number(),
      borrowed: z.number(),
    })
    .nullable(),
});

export const ColumnInfoSchema = z.object({
  COLUMN_NAME: z.string(),
  DATA_TYPE: z.string(),
  CHARACTER_MAXIMUM_LENGTH: z.number().nullable(),
  NUMERIC_PRECISION: z.number().nullable(),
  NUMERIC_SCALE: z.number().nullable(),
  IS_NULLABLE: z.string(),
  COLUMN_DEFAULT: z.string().nullable(),
  ORDINAL_POSITION: z.number(),
});

export const SchemaObjectSchema = z.object({
  TABLE_SCHEMA: z.string(),
  TABLE_NAME: z.string(),
  TABLE_TYPE: z.string(),
  OBJECT_TYPE: z.string(),
});

// create_date is a JS Date from mssql; z.unknown() avoids type mismatch after JSON serialization.
export const DatabaseInfoSchema = z.object({
  name: z.string(),
  database_id: z.number(),
  create_date: z.unknown(),
  collation_name: z.string().nullable(),
  state_desc: z.string(),
  user_access_desc: z.string(),
  is_read_only: z.boolean(),
  recovery_model_desc: z.string(),
});
