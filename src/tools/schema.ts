import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import sql from "mssql";
import { requirePool } from "../db/connection.js";
import { buildSchemaObjectsQuery } from "../db/query-builders.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson } from "../utils/format.js";
import { formatMarkdownTable } from "../utils/markdown.js";
import { buildPaginationMeta, clampLimit } from "../utils/pagination.js";
import { PaginationSchema, SchemaObjectSchema } from "../schemas/outputs.js";

export function registerSchemaTools(server: McpServer): void {
  server.registerTool(
    "mssql_list_schema_objects",
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
        response_format: z
          .enum(["json", "markdown"])
          .optional()
          .default("json")
          .describe("Output format: 'json' for structured data, 'markdown' for human-readable table"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      outputSchema: { objects: z.array(SchemaObjectSchema), pagination: PaginationSchema },
    },
    async ({ objectType, schemaName, limit: rawLimit, offset, response_format }) => {
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

        if (response_format === "markdown") {
          const rows = page as Record<string, unknown>[];
          let text = formatMarkdownTable(rows, `Schema Objects (${objectType})`);
          text += `\n\n*Showing ${page.length} of ${allRows.length} · offset ${offset}*`;
          return toolSuccess(text, structured);
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("mssql_list_schema_objects failed:", msg);
        return toolError(`Schema query failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "mssql_get_schema",
    {
      title: "Get Schema (deprecated — use mssql_list_schema_objects)",
      description: "Deprecated alias for mssql_list_schema_objects. Use mssql_list_schema_objects instead.",
      inputSchema: {
        objectType: z
          .enum(["tables", "views", "procedures", "functions", "all"])
          .optional()
          .default("tables"),
        schemaName: z.string().optional(),
        response_format: z.enum(["json", "markdown"]).optional().default("json"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ objectType, schemaName, response_format }) => {
      try {
        const pool = requirePool();
        const query = buildSchemaObjectsQuery(objectType, schemaName);
        const request = pool.request();
        if (schemaName) {
          request.input("schemaName", sql.VarChar, schemaName);
        }
        const result = await request.query(query);
        const rows = result.recordset ?? [];
        if (response_format === "markdown") {
          return toolSuccess(formatMarkdownTable(rows as Record<string, unknown>[]));
        }
        return toolSuccess(formatJson(rows));
      } catch (err) {
        return toolError(`Schema query failed: ${toActionableError(err)}`);
      }
    }
  );
}
