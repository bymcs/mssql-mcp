import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";
import { disconnectPool } from "../../src/db/connection.js";

// This suite requires a real, reachable SQL Server instance configured via the
// same DB_* environment variables the server itself reads (see src/config.ts).
// It is skipped by default so `npm test` stays DB-free; CI runs it separately
// (see .github/workflows/ci.yml) against a SQL Server service container.
const hasDbConfig = Boolean(process.env.DB_SERVER);

type ToolCallResult = {
  content: Array<{ type: string; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function describeFailure(result: ToolCallResult): string {
  return result.content.map((c) => c.text).join("\n");
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {}
): Promise<ToolCallResult> {
  return (await client.callTool({ name, arguments: args })) as ToolCallResult;
}

// SQL Server service containers can report "started" before the engine is
// actually ready to accept logins, so retry the initial connect for a while
// instead of relying solely on the CI health check.
async function connectWithRetry(
  client: Client,
  attempts = 15,
  delayMs = 4000
): Promise<ToolCallResult> {
  let last: ToolCallResult | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await callTool(client, "mssql_connect_database");
    if (!last.isError) return last;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return last as ToolCallResult;
}

test(
  "mssql_connect_database -> mssql_run_sql_query -> mssql_list_databases -> mssql_disconnect_database (live SQL Server)",
  { skip: hasDbConfig ? false : "DB_SERVER not set; skipping integration test" },
  async () => {
    const server = createServer();
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "integration-test-client", version: "1.0.0" });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const connectResult = await connectWithRetry(client);
      assert.equal(connectResult.isError, undefined, `connect failed: ${describeFailure(connectResult)}`);
      assert.equal(connectResult.structuredContent?.connected, true);

      const queryResult = await callTool(client, "mssql_run_sql_query", {
        query: "SELECT 1 AS value",
      });
      assert.equal(queryResult.isError, undefined, `query failed: ${describeFailure(queryResult)}`);
      const recordset = queryResult.structuredContent?.recordset as Array<{ value: number }> | undefined;
      assert.equal(recordset?.[0]?.value, 1);

      const listResult = await callTool(client, "mssql_list_databases", { limit: 5 });
      assert.equal(listResult.isError, undefined, `list databases failed: ${describeFailure(listResult)}`);
      const databases = listResult.structuredContent?.databases as unknown[] | undefined;
      assert.ok(Array.isArray(databases) && databases.length > 0, "expected at least one database");

      const statusResult = await callTool(client, "mssql_connection_status");
      assert.equal(statusResult.isError, undefined);
      assert.equal(statusResult.structuredContent?.connected, true);

      const disconnectResult = await callTool(client, "mssql_disconnect_database");
      assert.equal(disconnectResult.isError, undefined);
    } finally {
      await client.close();
      await server.close();
      await disconnectPool();
    }
  }
);
