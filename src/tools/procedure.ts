import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requirePool } from "../db/connection.js";
import { validateIdentifier, bracketIdentifier } from "../db/validators.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { formatJson } from "../utils/format.js";
import { formatMarkdownMultiRecordsets } from "../utils/markdown.js";

export function registerProcedureTools(server: McpServer): void {
  server.registerTool(
    "mssql_execute_stored_procedure",
    {
      title: "Execute Stored Procedure",
      description:
        "Executes a stored procedure by name. " +
        "⚠️ May modify data — use only when an action is intended. " +
        "Schema and procedure names are validated as safe identifiers. " +
        "Pass all value parameters via 'parameters'.",
      inputSchema: {
        procedureName: z.string().min(1).describe("Stored procedure name"),
        schemaName: z.string().optional().default("dbo").describe("Schema name (default: dbo)"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe("Procedure input parameters (key-value pairs)"),
        response_format: z
          .enum(["json", "markdown"])
          .optional()
          .default("json")
          .describe("Output format: 'json' for structured data, 'markdown' for human-readable tables"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ procedureName, schemaName, parameters, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(procedureName, "procedure name");
        validateIdentifier(schemaName, "schema name");

        const qualifiedName = `${bracketIdentifier(schemaName)}.${bracketIdentifier(procedureName)}`;
        const request = pool.request();
        if (parameters) {
          for (const [key, value] of Object.entries(parameters)) {
            request.input(key, value);
          }
        }

        const result = await request.execute(qualifiedName);
        const structured: Record<string, unknown> = {
          recordsets: result.recordsets,
          rows_affected: result.rowsAffected,
          output: result.output,
          return_value: result.returnValue,
        };

        if (response_format === "markdown") {
          return toolSuccess(
            formatMarkdownMultiRecordsets(result.recordsets as unknown[][], qualifiedName)
          );
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        const msg = toActionableError(err);
        console.error("mssql_execute_stored_procedure failed:", msg);
        return toolError(`Procedure execution failed: ${msg}`);
      }
    }
  );

  // Backward-compatible alias
  server.registerTool(
    "mssql_execute_procedure",
    {
      title: "Execute Procedure (deprecated — use mssql_execute_stored_procedure)",
      description: "Deprecated alias for mssql_execute_stored_procedure.",
      inputSchema: {
        procedureName: z.string().describe("Name of the stored procedure"),
        schemaName: z.string().optional().default("dbo"),
        parameters: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional(),
        response_format: z.enum(["json", "markdown"]).optional().default("json"),
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ procedureName, schemaName, parameters, response_format }) => {
      try {
        const pool = requirePool();
        validateIdentifier(procedureName, "procedure name");
        validateIdentifier(schemaName, "schema name");
        const qualifiedName = `${bracketIdentifier(schemaName)}.${bracketIdentifier(procedureName)}`;
        const request = pool.request();
        if (parameters) {
          for (const [key, value] of Object.entries(parameters)) {
            request.input(key, value);
          }
        }
        const result = await request.execute(qualifiedName);
        const structured: Record<string, unknown> = {
          recordsets: result.recordsets,
          rowsAffected: result.rowsAffected,
          output: result.output,
          returnValue: result.returnValue,
        };
        if (response_format === "markdown") {
          return toolSuccess(
            formatMarkdownMultiRecordsets(result.recordsets as unknown[][])
          );
        }
        return toolSuccess(formatJson(structured), structured);
      } catch (err) {
        return toolError(`Procedure execution failed: ${toActionableError(err)}`);
      }
    }
  );
}

