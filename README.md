# MS SQL Server MCP Server v3.0.0

🚀 **Model Context Protocol (MCP) server** for Microsoft SQL Server - compatible with Claude Desktop, Cursor, Windsurf and VS Code.

[![CI](https://github.com/BYMCS/mssql-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/BYMCS/mssql-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/mssql-mcp.svg)](https://www.npmjs.com/package/mssql-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Standards Alignment

- Protocol target: [MCP draft/latest spec](https://modelcontextprotocol.io/specification/draft/server/tools)
- Transport spec: [Transports](https://modelcontextprotocol.io/specification/draft/basic/transports)
- Security: [Security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- SDK: `@modelcontextprotocol/sdk` pinned to `1.30.0`
- Requires Node.js >= 20

## 🚀 Quick Start

### 1. Install

```bash
npm install -g mssql-mcp
```

### 2. Configure IDE

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "mssql": {
      "command": "npx",
      "args": ["-y", "mssql-mcp@latest"],
      "env": {
        "DB_SERVER": "your-server.com",
        "DB_DATABASE": "your-database",
        "DB_USER": "your-username",
        "DB_PASSWORD": "your-password",
        "DB_ENCRYPT": "true",
        "DB_TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

**Cursor/Windsurf/VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "mssql": {
      "command": "npx",
      "args": ["-y", "mssql-mcp@latest"],
      "env": {
        "DB_SERVER": "your-server.com",
        "DB_DATABASE": "your-database",
        "DB_USER": "your-username",
        "DB_PASSWORD": "your-password",
        "DB_ENCRYPT": "true",
        "DB_TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

**HTTP transport** (remote/hosted scenarios):
```json
{
  "servers": {
    "mssql": {
      "type": "http",
      "url": "http://127.0.0.1:3001",
      "env": {}
    }
  }
}
```

> Replace with your actual database credentials. Credentials are read from the **server environment only** — never passed as tool parameters.

## ��️ Tool Catalog

### Primary tools (use these)

| Tool | Read-only | Description |
|------|-----------|-------------|
| `mssql_connect_database` | No | Connect using env variables. Idempotent. |
| `mssql_disconnect_database` | No | Close connection. Idempotent. |
| `mssql_connection_status` | ✅ | Connection state and pool metrics |
| `mssql_run_sql_query` | ⚠️ No | Execute arbitrary SQL. **May mutate data.** |
| `mssql_list_schema_objects` | ✅ | List tables/views/procedures/functions with pagination |
| `mssql_describe_table_columns` | ✅ | Column definitions for a table |
| `mssql_read_table_rows` | ✅ | Paginated rows with projection and safe WHERE |
| `mssql_execute_stored_procedure` | ⚠️ No | Execute a stored procedure |
| `mssql_list_databases` | ✅ | List all databases on the instance |

All data tools accept a `response_format` parameter (`"json"` | `"markdown"`, default `"json"`). Use `"markdown"` to get human-readable table output.

### Deprecated aliases (still registered for backward compatibility)

These are the only alias tool names the server actually registers (in `src/tools/*.ts`).
They behave the same as their replacement but are not documented in new integrations —
use the primary tool names above instead.

| Old name | Use instead |
|----------|-------------|
| `mssql_execute_query` | `mssql_run_sql_query` |
| `mssql_get_schema` | `mssql_list_schema_objects` |
| `mssql_describe_table` | `mssql_describe_table_columns` |
| `mssql_get_table_data` | `mssql_read_table_rows` |
| `mssql_execute_procedure` | `mssql_execute_stored_procedure` |

## 🚌 Transport Modes

| Mode | Use when |
|------|----------|
| `stdio` (default) | Local IDE integration (Claude Desktop, Cursor, VS Code) |
| `http` | Remote/hosted deployment, testing with MCP Inspector |

```bash
# stdio (default)
node dist/src/index.js

# HTTP on 127.0.0.1:3001
MCP_TRANSPORT=http node dist/src/index.js

# Custom HTTP host/port
MCP_TRANSPORT=http MCP_HOST=0.0.0.0 MCP_PORT=8080 node dist/src/index.js
```

## 🔧 Environment Variables

### Database connection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_SERVER` | ✅ | — | SQL Server hostname or IP |
| `DB_DATABASE` | ❌ | — | Database name |
| `DB_USER` | ❌ | — | Login username |
| `DB_PASSWORD` | ❌ | — | Login password |
| `DB_PORT` | ❌ | 1433 | TCP port |
| `DB_ENCRYPT` | ❌ | true | Enable TLS (required for Azure SQL) |
| `DB_TRUST_SERVER_CERTIFICATE` | ❌ | false | Trust self-signed certs |
| `DB_CONNECTION_TIMEOUT` | ❌ | 30000 | Connection timeout ms |
| `DB_REQUEST_TIMEOUT` | ❌ | 30000 | Query timeout ms |

### Transport

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `MCP_PORT` | `3001` | HTTP port |

## 🔒 Security Model

- **No credential parameters**: All connection settings come from environment variables only. Tool inputs cannot override connection config.
- **Identifier validation**: Schema, table, and procedure names are validated against a safe identifier pattern before interpolation into SQL.
- **Parameterized queries**: All user-supplied values (WHERE clause values, column values) must be passed as named parameters via `@paramName` — never embedded in query strings.
- **Origin validation**: HTTP transport validates `Origin` header and only allows localhost by default.
- **SQL risk labeling**: `run_sql_query` and `execute_stored_procedure` are explicitly labeled as non-read-only and open-world.

### ⚠️ SQL Risk Notes

`run_sql_query` accepts arbitrary SQL including DDL and DML. To minimize risk:
- Use a least-privilege SQL login (SELECT-only where possible)
- Never run the server with a `sysadmin` or `sa` account
- Consider network firewall rules to limit what the server can reach

## 📄 Pagination

All list tools return a `pagination` object:

```json
{
  "count": 20,
  "limit": 20,
  "offset": 0,
  "has_more": true,
  "next_offset": 20,
  "total_count": 150
}
```

Default page size: **20 rows**. Maximum: **200 rows**.

Results are also truncated if the serialized payload exceeds 100KB, with a `truncation_message` explaining how many rows were dropped.

## 🏗️ Architecture

```
src/
  index.ts          ← bootstrap (env, transport selection)
  server.ts         ← createServer() factory
  constants.ts      ← limits, defaults, protocol strings
  config.ts         ← env parsing
  types.ts          ← shared TypeScript interfaces
  db/
    connection.ts   ← connection pool singleton
    validators.ts   ← SQL identifier validation
    query-builders.ts ← safe parameterized query construction
  tools/            ← one file per tool group
  resources/        ← MCP resource handlers
  transports/       ← stdio and HTTP transports
  utils/
    errors.ts       ← error normalization helpers
    format.ts       ← JSON formatting, payload truncation
    markdown.ts     ← markdown table/list rendering helpers
    pagination.ts   ← pagination metadata helpers
```

## 🧪 Inspector Smoke Test

```bash
npx @modelcontextprotocol/inspector
```

Expected:
- stdio server connects
- Tool list renders with all tools
- `mssql_connection_status` returns JSON without a connection
- `mssql_connect_database` works when env variables are set

## 🔨 Development

```bash
npm install
cp .env.example .env  # fill in your test DB credentials
npm run typecheck     # type check only
npm run build         # compile TypeScript
npm test              # run unit tests
npm run ci            # typecheck + build + test
```

## License

[MIT](LICENSE) © BYMCS
