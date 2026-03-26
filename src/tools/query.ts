import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requirePool } from "../db/connection.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson, truncatePayload } from "../utils/format.js";

export function registerQueryTools(server: McpServer): void {
  server.registerTool(
    "run_sql_query",
    {
      title: "Run SQL Query",
      description:
        "Executes an arbitrary SQL statement against the connected database. " +
        "⚠️ WARNING: This tool can read AND modify data (INSERT, UPDATE, DELETE, DDL). " +
        "Always prefer parameterized inputs via the 'parameters' field — never embed user-supplied values " +
        "directly in the query string. " +
        "Example: query='SELECT * FROM dbo.Users WHERE Id = @id', parameters={id: 42}",
      inputSchema: {
        query: z.string().min(1).describe("SQL statement to execute"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe("Named parameters referenced in the query via @paramName"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ query, parameters }) => {
      try {
        const pool = requirePool();
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
        const structured: Record<string, unknown> = {
          recordset: data,
          rows_affected: result.rowsAffected,
          output: result.output,
          execution_time_ms: elapsed,
          parameters_used: parameters ? Object.keys(parameters).length : 0,
          truncated,
        };
        if (truncation_message) structured.truncation_message = truncation_message;
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("run_sql_query failed:", msg);
        return toolError(`Query failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "execute_query",
    {
      title: "Execute Query (deprecated — use run_sql_query)",
      description:
        "Deprecated alias for run_sql_query. Use run_sql_query instead. " +
        "⚠️ This tool can read AND modify data.",
      inputSchema: {
        query: z.string().min(1).describe("SQL query to execute"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe("Query parameters"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ query, parameters }) => {
      try {
        const pool = requirePool();
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
        const structured: Record<string, unknown> = {
          recordset: data,
          rows_affected: result.rowsAffected,
          output: result.output,
          execution_time_ms: elapsed,
          parameters_used: parameters ? Object.keys(parameters).length : 0,
          truncated,
        };
        if (truncation_message) structured.truncation_message = truncation_message;
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        return toolError(`Query failed: ${toActionableError(err)}`);
      }
    }
  );
}
