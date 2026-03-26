import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { closePoolOnShutdown } from "../db/connection.js";
import type { HttpConfig } from "../config.js";

export async function runHttpTransport(server: McpServer, config: HttpConfig): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const httpServer = createServer((req, res) => {
    // Origin validation: only allow localhost by default
    const origin = req.headers["origin"];
    if (origin) {
      const allowed = [
        "http://localhost",
        "http://127.0.0.1",
        `http://${config.host}`,
        `http://${config.host}:${config.port}`,
      ];
      const isAllowed = allowed.some((o) => origin.startsWith(o));
      if (!isAllowed) {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden: origin not allowed" }));
        return;
      }
    }

    transport.handleRequest(req, res);
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

  await server.connect(transport);

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.port, config.host, () => {
      console.error(`MCP HTTP server listening on http://${config.host}:${config.port}`);
      resolve();
    });
    httpServer.on("error", reject);
  });
}
