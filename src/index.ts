#!/usr/bin/env node

import dotenv from "dotenv";
import { createServer } from "./server.js";
import { runStdioTransport } from "./transports/stdio.js";
import { runHttpTransport } from "./transports/http.js";
import { loadHttpConfig } from "./config.js";
import { SERVER_VERSION } from "./constants.js";

dotenv.config();

async function main() {
  const transport = process.env.MCP_TRANSPORT ?? "stdio";
  const server = createServer();

  if (transport === "http") {
    const httpConfig = loadHttpConfig();
    console.error(`MSSQL MCP Server v${SERVER_VERSION} starting (HTTP mode)...`);
    await runHttpTransport(server, httpConfig);
  } else {
    console.error(`MSSQL MCP Server v${SERVER_VERSION} starting (stdio mode)...`);
    await runStdioTransport(server);
    console.error("Server ready.");
  }
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
