import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requirePool } from "../db/connection.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson } from "../utils/format.js";
import { buildPaginationMeta, clampLimit } from "../utils/pagination.js";

export function registerDatabasesTools(server: McpServer): void {
  server.registerTool(
    "list_databases",
    {
      title: "List Databases",
      description:
        "Lists all databases visible on the connected SQL Server instance with state and recovery information. " +
        "Read-only. Supports pagination.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional().default(20).describe("Max databases (default 20)"),
        offset: z.number().int().min(0).optional().default(0).describe("Skip N databases"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ limit: rawLimit, offset }) => {
      try {
        const pool = requirePool();
        const limit = clampLimit(rawLimit);

        const result = await pool.request().query(`
          SELECT name, database_id, create_date, collation_name,
                 state_desc, user_access_desc, is_read_only,
                 recovery_model_desc
          FROM sys.databases
          ORDER BY name
        `);

        const allRows: unknown[] = result.recordset ?? [];
        const page = allRows.slice(offset, offset + limit);
        const pagination = buildPaginationMeta(page.length, limit, offset, allRows.length);

        const structured: Record<string, unknown> = { databases: page, pagination };
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("list_databases failed:", msg);
        return toolError(`List databases failed: ${msg}`);
      }
    }
  );
}
