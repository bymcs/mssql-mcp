import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closePoolOnShutdown } from "../db/connection.js";

export async function runStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();

  let shuttingDown = false;
  const shutdown = async (reason: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`\nShutting down (${reason})...`);
    await closePoolOnShutdown();
    console.error("Server stopped.");
    process.exit(0);
  };

  // Per the MCP stdio spec, the client signals shutdown by closing the child's
  // stdin; the server is expected to exit when stdin reaches EOF. Windows does
  // not reliably deliver OS signals to child processes when the parent exits,
  // so we must also react to stdin EOF and transport close, otherwise orphaned
  // node processes accumulate. See https://github.com/BYMCS/mssql-mcp/issues/2
  transport.onclose = () => shutdown("stdio-close");
  process.stdin.on("end", () => shutdown("stdin-end"));
  process.stdin.on("close", () => shutdown("stdin-close"));

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGUSR2", () => shutdown("SIGUSR2"));
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    shutdown("unhandledRejection");
  });

  await server.connect(transport);
}
