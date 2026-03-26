import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConnectionState } from "../db/connection.js";

export function registerConnectionResource(server: McpServer): void {
  server.registerResource(
    "connection-info",
    "mssql://connection/info",
    {
      title: "Connection Info",
      description: "Current MSSQL connection status and configuration (no credentials exposed).",
      mimeType: "application/json",
    },
    async () => {
      const state = getConnectionState();
      return {
        contents: [
          {
            uri: "mssql://connection/info",
            text: JSON.stringify(state, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }
  );
}
