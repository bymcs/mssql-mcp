import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closePoolOnShutdown } from "../db/connection.js";

export async function runStdioTransport(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string) => {
    console.error(`\nShutting down (${signal})...`);
    await closePoolOnShutdown();
    console.error("Server stopped.");
    process.exit(0);
  };

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
