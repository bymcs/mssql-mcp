import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import sql from "mssql";
import { requirePool } from "../db/connection.js";
import { buildSchemaObjectsQuery } from "../db/query-builders.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson } from "../utils/format.js";
import { buildPaginationMeta, clampLimit } from "../utils/pagination.js";

export function registerSchemaTools(server: McpServer): void {
  server.registerTool(
    "list_schema_objects",
    {
      title: "List Schema Objects",
      description:
        "Lists tables, views, stored procedures, or functions in the connected database. " +
        "Read-only. Supports filtering by schema name and pagination. " +
        "Example: objectType='tables', schemaName='dbo', limit=20",
      inputSchema: {
        objectType: z
          .enum(["tables", "views", "procedures", "functions", "all"])
          .optional()
          .default("tables")
          .describe("Type of objects to list (default: tables)"),
        schemaName: z
          .string()
          .optional()
          .describe("Filter to a specific schema (e.g. 'dbo')"),
        limit: z.number().int().min(1).max(200).optional().default(20).describe("Max objects (default 20)"),
        offset: z.number().int().min(0).optional().default(0).describe("Skip N objects"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ objectType, schemaName, limit: rawLimit, offset }) => {
      try {
        const pool = requirePool();
        const limit = clampLimit(rawLimit);
        const query = buildSchemaObjectsQuery(objectType, schemaName);

        const request = pool.request();
        if (schemaName) {
          request.input("schemaName", sql.VarChar, schemaName);
        }
        const result = await request.query(query);

        const allRows: unknown[] = result.recordset ?? [];
        const page = allRows.slice(offset, offset + limit);
        const pagination = buildPaginationMeta(page.length, limit, offset, allRows.length);

        const structured: Record<string, unknown> = { objects: page, pagination };
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("list_schema_objects failed:", msg);
        return toolError(`Schema query failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "get_schema",
    {
      title: "Get Schema (deprecated — use list_schema_objects)",
      description: "Deprecated alias for list_schema_objects. Use list_schema_objects instead.",
      inputSchema: {
        objectType: z
          .enum(["tables", "views", "procedures", "functions", "all"])
          .optional()
          .default("tables"),
        schemaName: z.string().optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ objectType, schemaName }) => {
      try {
        const pool = requirePool();
        const query = buildSchemaObjectsQuery(objectType, schemaName);
        const request = pool.request();
        if (schemaName) {
          request.input("schemaName", sql.VarChar, schemaName);
        }
        const result = await request.query(query);
        return toolSuccess(formatJson(result.recordset ?? []));
      } catch (err) {
        return toolError(`Schema query failed: ${toActionableError(err)}`);
      }
    }
  );
}
