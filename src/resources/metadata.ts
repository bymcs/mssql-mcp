import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPool } from "../db/connection.js";

function notConnectedText(): string {
  return JSON.stringify({ error: "Not connected. Use connect_database first." });
}

export function registerMetadataResources(server: McpServer): void {
  server.registerResource(
    "databases",
    "mssql://databases",
    {
      title: "Databases",
      description: "Snapshot list of all databases on the SQL Server instance.",
      mimeType: "application/json",
    },
    async () => {
      const pool = getPool();
      if (!pool?.connected) {
        return {
          contents: [
            { uri: "mssql://databases", text: notConnectedText(), mimeType: "application/json" },
          ],
        };
      }
      const result = await pool
        .request()
        .query(`SELECT name, state_desc FROM sys.databases ORDER BY name`);
      return {
        contents: [
          {
            uri: "mssql://databases",
            text: JSON.stringify(result.recordset, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  server.registerResource(
    "schemas",
    "mssql://schemas",
    {
      title: "Schemas",
      description: "Snapshot list of all schemas in the current database.",
      mimeType: "application/json",
    },
    async () => {
      const pool = getPool();
      if (!pool?.connected) {
        return {
          contents: [
            { uri: "mssql://schemas", text: notConnectedText(), mimeType: "application/json" },
          ],
        };
      }
      const result = await pool
        .request()
        .query(
          `SELECT SCHEMA_NAME, SCHEMA_OWNER FROM INFORMATION_SCHEMA.SCHEMATA ORDER BY SCHEMA_NAME`
        );
      return {
        contents: [
          {
            uri: "mssql://schemas",
            text: JSON.stringify(result.recordset, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
