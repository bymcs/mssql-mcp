import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfigFromEnv } from "../config.js";
import { connectPool, disconnectPool, getConnectionState } from "../db/connection.js";
import { toActionableError, toolError, toolSuccess } from "../utils/errors.js";
import { ConnectionStateSchema } from "../schemas/outputs.js";

export function registerConnectTools(server: McpServer): void {
  server.registerTool(
    "mssql_connect_database",
    {
      title: "Connect Database",
      description:
        "Connects to MS SQL Server using environment variables (DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD, " +
        "DB_PORT, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE). No credentials accepted as parameters — all " +
        "connection settings come from the server environment only. Idempotent: calling again reconnects.",
      inputSchema: {},
      outputSchema: ConnectionStateSchema,
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const config = loadConfigFromEnv();
        await connectPool(config);
        const state = getConnectionState();
        return toolSuccess(
          `✅ Connected to ${config.server}${config.database ? ` (database: ${config.database})` : ""}`,
          state as unknown as Record<string, unknown>
        );
      } catch (err) {
        const msg = toActionableError(err);
        console.error("mssql_connect_database failed:", msg);
        return toolError(`Connection failed: ${msg}`);
      }
    }
  );

  server.registerTool(
    "mssql_disconnect_database",
    {
      title: "Disconnect Database",
      description:
        "Closes the current database connection and releases the connection pool. " +
        "Safe to call even if not connected. Idempotent.",
      inputSchema: {},
      outputSchema: { message: z.string() },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        await disconnectPool();
        const msg = "✅ Disconnected from database.";
        return toolSuccess(msg, { message: msg });
      } catch (err) {
        return toolError(`Disconnect failed: ${toActionableError(err)}`);
      }
    }
  );
}

