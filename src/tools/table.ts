import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import sql from "mssql";
import { requirePool } from "../db/connection.js";
import { validateIdentifier, bracketIdentifier, validateOrderBy, SAFE_IDENTIFIER_RE } from "../db/validators.js";
import { buildSelectQuery, buildSelectWithWhereQuery } from "../db/query-builders.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson, truncatePayload } from "../utils/format.js";
import { formatMarkdownTable } from "../utils/markdown.js";
import { buildPaginationMeta, clampLimit } from "../utils/pagination.js";
import { PaginationSchema, ColumnInfoSchema } from "../schemas/outputs.js";

export function registerTableTools(server: McpServer): void {
  server.registerTool(
    "mssql_describe_table_columns",
    {
      title: "Describe Table Columns",
      description:
        "Returns column definitions for a table: name, data type, length, nullability, default, and ordinal position. " +
        "Read-only. Uses parameterized queries to prevent injection.",
      inputSchema: {
        tableName: z.string().min(1).describe("Table name"),
        schemaName: z.string().optional().default("dbo").describe("Schema name (default: dbo)"),
        response_format: z
          .enum(["json", "markdown"])
          .optional()
          .default("json")
          .describe("Output format: 'json' for structured data, 'markdown' for human-readable table"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      outputSchema: { columns: z.array(ColumnInfoSchema), table: z.string() },
    },
    async ({ tableName, schemaName, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(tableName, "table name");
        validateIdentifier(schemaName, "schema name");

        const result = await pool
          .request()
          .input("tableName", sql.VarChar, tableName)
          .input("schemaName", sql.VarChar, schemaName)
          .query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
              NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE,
              COLUMN_DEFAULT, ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = @schemaName
            ORDER BY ORDINAL_POSITION
          `);

        const structured: Record<string, unknown> = {
          columns: result.recordset,
          table: `${schemaName}.${tableName}`,
        };

        if (response_format === "markdown") {
          const rows = result.recordset as Record<string, unknown>[];
          return toolSuccess(
            formatMarkdownTable(rows, `Columns: ${schemaName}.${tableName}`),
            structured
          );
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("mssql_describe_table_columns failed:", msg);
        return toolError(`Table description failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "mssql_describe_table",
    {
      title: "Describe Table (deprecated — use mssql_describe_table_columns)",
      description: "Deprecated alias for mssql_describe_table_columns.",
      inputSchema: {
        tableName: z.string().min(1),
        schemaName: z.string().optional().default("dbo"),
        response_format: z.enum(["json", "markdown"]).optional().default("json"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ tableName, schemaName, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(tableName, "table name");
        validateIdentifier(schemaName, "schema name");
        const result = await pool
          .request()
          .input("tableName", sql.VarChar, tableName)
          .input("schemaName", sql.VarChar, schemaName)
          .query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
              NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE,
              COLUMN_DEFAULT, ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName AND TABLE_SCHEMA = @schemaName
            ORDER BY ORDINAL_POSITION
          `);
        const rows = result.recordset ?? [];
        if (response_format === "markdown") {
          return toolSuccess(formatMarkdownTable(rows as Record<string, unknown>[]));
        }
        return toolSuccess(formatJson(rows));
      } catch (err) {
        return toolError(`Table description failed: ${toActionableError(err)}`);
      }
    }
  );

  const safeIdentifierPattern = SAFE_IDENTIFIER_RE;

  server.registerTool(
    "mssql_read_table_rows",
    {
      title: "Read Table Rows",
      description:
        "Returns rows from a table with optional column projection, WHERE filtering, ORDER BY, and pagination. " +
        "Read-only. Table and schema names are validated as safe identifiers. " +
        "WHERE clause values MUST be passed via 'parameters' using @paramName placeholders. " +
        "Pagination: limit (1-200, default 20) and offset. " +
        "Example: tableName='Orders', schemaName='dbo', columns=['OrderId','Total'], limit=50",
      inputSchema: {
        tableName: z
          .string()
          .min(1)
          .regex(safeIdentifierPattern, "Must be a valid SQL identifier")
          .describe("Table name"),
        schemaName: z
          .string()
          .regex(safeIdentifierPattern, "Must be a valid SQL identifier")
          .optional()
          .default("dbo")
          .describe("Schema name (default: dbo)"),
        columns: z
          .array(z.string().regex(safeIdentifierPattern))
          .optional()
          .describe("Columns to return (default: all)"),
        limit: z.number().int().min(1).max(200).optional().default(20).describe("Max rows (1-200)"),
        offset: z.number().int().min(0).optional().default(0).describe("Rows to skip"),
        whereClause: z
          .string()
          .optional()
          .describe(
            "WHERE predicate without WHERE keyword. Use @paramName for all values. " +
            "Example: 'Status = @status AND Amount > @minAmount'"
          ),
        orderBy: z
          .string()
          .optional()
          .describe("ORDER BY expression. Example: 'CreatedAt DESC, Id ASC'"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe("Values for WHERE clause @paramName placeholders"),
        response_format: z
          .enum(["json", "markdown"])
          .optional()
          .default("json")
          .describe("Output format: 'json' for structured data, 'markdown' for human-readable table"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      outputSchema: {
        data: z.array(z.record(z.unknown())),
        pagination: PaginationSchema,
        table: z.string(),
        execution_time_ms: z.number(),
        truncated: z.boolean().optional(),
        truncation_message: z.string().optional(),
      },
    },
    async ({ tableName, schemaName, columns, limit: rawLimit, offset, whereClause, orderBy, parameters, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(tableName, "table name");
        validateIdentifier(schemaName, "schema name");
        const limit = clampLimit(rawLimit);
        const safeOrderBy = orderBy ? validateOrderBy(orderBy) : null;

        const query = whereClause
          ? buildSelectWithWhereQuery(schemaName, tableName, columns ?? null, whereClause, safeOrderBy, offset, limit)
          : buildSelectQuery(schemaName, tableName, columns ?? null, safeOrderBy, offset, limit);

        const request = pool.request();
        if (parameters) {
          for (const [key, value] of Object.entries(parameters)) {
            request.input(key, value);
          }
        }

        const start = Date.now();
        const result = await request.query(query);
        const elapsed = Date.now() - start;

        const { data, truncated, truncation_message } = truncatePayload(result.recordset ?? []);
        const pagination = buildPaginationMeta(data.length, limit, offset);

        const structured: Record<string, unknown> = {
          data,
          pagination,
          table: `${schemaName}.${tableName}`,
          execution_time_ms: elapsed,
        };
        if (truncated) {
          structured.truncated = truncated;
          structured.truncation_message = truncation_message;
        }

        if (response_format === "markdown") {
          const rows = data as Record<string, unknown>[];
          let text = formatMarkdownTable(rows, `${schemaName}.${tableName}`);
          if (truncated) text += `\n\n> ⚠️ ${truncation_message}`;
          text += `\n\n*${rows.length} rows · offset ${offset} · ${elapsed}ms*`;
          return toolSuccess(text, structured);
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("mssql_read_table_rows failed:", msg);
        return toolError(`Read table rows failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "mssql_get_table_data",
    {
      title: "Get Table Data (deprecated — use mssql_read_table_rows)",
      description:
        "Deprecated alias for mssql_read_table_rows. Use mssql_read_table_rows instead. " +
        "⚠️ whereClause must use @paramName placeholders for all values.",
      inputSchema: {
        tableName: z
          .string()
          .min(1)
          .regex(SAFE_IDENTIFIER_RE, "Must be a valid SQL identifier"),
        schemaName: z
          .string()
          .regex(SAFE_IDENTIFIER_RE, "Must be a valid SQL identifier")
          .optional()
          .default("dbo"),
        limit: z.number().int().min(1).max(200).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
        whereClause: z.string().optional(),
        orderBy: z.string().optional(),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional(),
        response_format: z.enum(["json", "markdown"]).optional().default("json"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ tableName, schemaName, limit: rawLimit, offset, whereClause, orderBy, parameters, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(tableName, "table name");
        validateIdentifier(schemaName, "schema name");
        const limit = clampLimit(rawLimit);
        const safeOrderBy = orderBy ? validateOrderBy(orderBy) : null;

        const query = whereClause
          ? buildSelectWithWhereQuery(schemaName, tableName, null, whereClause, safeOrderBy, offset, limit)
          : buildSelectQuery(schemaName, tableName, null, safeOrderBy, offset, limit);

        const request = pool.request();
        if (parameters) {
          for (const [key, value] of Object.entries(parameters)) {
            request.input(key, value);
          }
        }

        const start = Date.now();
        const result = await request.query(query);
        const elapsed = Date.now() - start;

        const { data, truncated, truncation_message } = truncatePayload(result.recordset ?? []);
        const pagination = buildPaginationMeta(data.length, limit, offset);

        const structured: Record<string, unknown> = {
          data,
          metadata: { ...pagination, execution_time_ms: elapsed, table: `${schemaName}.${tableName}` },
        };
        if (truncated) {
          structured.truncated = truncated;
          structured.truncation_message = truncation_message;
        }
        if (response_format === "markdown") {
          return toolSuccess(
            formatMarkdownTable(data as Record<string, unknown>[])
          );
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        return toolError(`Get table data failed: ${toActionableError(err)}`);
      }
    }
  );
}

