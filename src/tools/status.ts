import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConnectionState } from "../db/connection.js";
import { toolSuccess } from "../utils/errors.js";
import { formatJson } from "../utils/format.js";

export function registerStatusTool(server: McpServer): void {
  server.registerTool(
    "connection_status",
    {
      title: "Connection Status",
      description:
        "Returns the current connection status, server address, database name, and connection pool metrics. " +
        "Read-only. Safe to call at any time.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const state = getConnectionState();
      return toolSuccess(formatJson(state), state as unknown as Record<string, unknown>);
    }
  );
}
