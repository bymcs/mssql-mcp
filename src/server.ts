import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerConnectTools } from "./tools/connect.js";
import { registerStatusTool } from "./tools/status.js";
import { registerQueryTools } from "./tools/query.js";
import { registerSchemaTools } from "./tools/schema.js";
import { registerTableTools } from "./tools/table.js";
import { registerProcedureTools } from "./tools/procedure.js";
import { registerDatabasesTools } from "./tools/databases.js";
import { registerConnectionResource } from "./resources/connection.js";
import { registerMetadataResources } from "./resources/metadata.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerConnectTools(server);
  registerStatusTool(server);
  registerQueryTools(server);
  registerSchemaTools(server);
  registerTableTools(server);
  registerProcedureTools(server);
  registerDatabasesTools(server);
  registerConnectionResource(server);
  registerMetadataResources(server);

  return server;
}
