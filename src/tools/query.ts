import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requirePool } from "../db/connection.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson, truncatePayload } from "../utils/format.js";
import { formatMarkdownTable } from "../utils/markdown.js";

type QueryParams = Record<string, string | number | boolean | null>;

const QueryOutputSchema = {
  recordset: z.array(z.record(z.unknown())),
  rows_affected: z.array(z.number()),
  output: z.record(z.unknown()),
  execution_time_ms: z.number(),
  parameters_used: z.number(),
  truncated: z.boolean(),
  truncation_message: z.string().optional(),
};

async function runSqlQueryCore(
  query: string,
  parameters: QueryParams | undefined,
  response_format: "json" | "markdown",
  logLabel: string
) {
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

    if (response_format === "markdown") {
      const rows = data as Record<string, unknown>[];
      let text = formatMarkdownTable(rows);
      if (truncated) text += `\n\n> ⚠️ ${truncation_message}`;
      text += `\n\n*Rows affected: ${(result.rowsAffected ?? []).join(", ")} · ${elapsed}ms*`;
      return toolSuccess(text, structured);
    }
    return toolSuccess(formatJson(structured), structured);
  } catch (err) {
    const msg = toActionableError(err);
    console.error(`${logLabel} failed:`, msg);
    return toolError(`Query failed: ${msg}`);
  }
}

export function registerQueryTools(server: McpServer): void {
  server.registerTool(
    "mssql_run_sql_query",
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
        response_format: z
          .enum(["json", "markdown"])
          .optional()
          .default("json")
          .describe("Output format: 'json' for structured data, 'markdown' for human-readable table"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
      outputSchema: QueryOutputSchema,
    },
    ({ query, parameters, response_format }) =>
      runSqlQueryCore(query, parameters, response_format, "mssql_run_sql_query")
  );

  // Backward-compatible alias
  server.registerTool(
    "mssql_execute_query",
    {
      title: "Execute Query (deprecated — use mssql_run_sql_query)",
      description:
        "Deprecated alias for mssql_run_sql_query. Use mssql_run_sql_query instead. " +
        "⚠️ This tool can read AND modify data.",
      inputSchema: {
        query: z.string().min(1).describe("SQL query to execute"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe("Query parameters"),
        response_format: z.enum(["json", "markdown"]).optional().default("json"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    ({ query, parameters, response_format }) =>
      runSqlQueryCore(query, parameters, response_format, "mssql_execute_query")
  );
}

