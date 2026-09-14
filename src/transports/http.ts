import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import {
  NodeStreamableHTTPServerTransport,
  originValidation,
  hostHeaderValidation,
} from "@modelcontextprotocol/node";
import type { McpServer } from "@modelcontextprotocol/server";
import { closePoolOnShutdown } from "../db/connection.js";
import { formatFatalError } from "../utils/errors.js";
import type { HttpConfig } from "../config.js";

export async function runHttpTransport(server: McpServer, config: HttpConfig): Promise<void> {
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  // Only allow localhost and the configured bind host by default, per the MCP
  // HTTP transport security guidance (Origin + Host header checks guard
  // against DNS rebinding).
  const allowedHostnames = ["localhost", "127.0.0.1", "[::1]", config.host];
  const validateOrigin = originValidation(allowedHostnames);
  const validateHost = hostHeaderValidation(allowedHostnames);

  const httpServer = createServer((req, res) => {
    if (!validateHost(req, res)) return;
    if (!validateOrigin(req, res)) return;
    void transport.handleRequest(req, res);
  });

  const shutdown = async (signal: string) => {
    console.error(`\nShutting down HTTP server (${signal})...`);
    httpServer.close();
    await transport.close();
    await closePoolOnShutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGUSR2", () => shutdown("SIGUSR2"));
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", formatFatalError(err));
    shutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", formatFatalError(reason));
    shutdown("unhandledRejection");
  });

  await server.connect(transport);

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.port, config.host, () => {
      console.error(`MCP HTTP server listening on http://${config.host}:${config.port}`);
      resolve();
    });
    httpServer.on("error", reject);
  });
}
