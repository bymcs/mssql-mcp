# MS SQL Server MCP Server v2.1.1

🚀 **Model Context Protocol (MCP) server** for Microsoft SQL Server - compatible with Claude Desktop, Cursor, Windsurf and VS Code.

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

> Replace with your actual database credentials.

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `connect_database` | Connect to database using environment variables |
| `disconnect_database` | Close current database connection |
| `connection_status` | Check connection state with pool info |
| `execute_query` | Execute any SQL query with parameters |
| `get_schema` | List database objects (tables, views, procedures) |
| `describe_table` | Get detailed table structure |
| `get_table_data` | Retrieve data with pagination |
| `execute_procedure` | Execute stored procedures |
| `list_databases` | List all databases |

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_SERVER` | ✅ | - | SQL Server hostname |
| `DB_DATABASE` | ❌ | - | Database name |
| `DB_USER` | ❌ | - | Username |
| `DB_PASSWORD` | ❌ | - | Password |
| `DB_PORT` | ❌ | 1433 | SQL Server port |
| `DB_ENCRYPT` | ❌ | true | Enable TLS encryption (required for Azure SQL) |
| `DB_TRUST_SERVER_CERTIFICATE` | ❌ | false | Trust self-signed certificates |
| `DB_CONNECTION_TIMEOUT` | ❌ | 30000 | Connection timeout (ms) |
| `DB_REQUEST_TIMEOUT` | ❌ | 30000 | Request timeout (ms) |

### Azure SQL Configuration
For Azure SQL Database, use these settings:
```json
{
  "DB_ENCRYPT": "true",
  "DB_TRUST_SERVER_CERTIFICATE": "false"
}
```

### Local SQL Server (Self-signed cert)
For local development with self-signed certificates:
```json
{
  "DB_ENCRYPT": "true",
  "DB_TRUST_SERVER_CERTIFICATE": "true"
}
```

## 🏆 Features

- ✅ **MCP SDK 1.25.1**: Latest Model Context Protocol SDK
- ✅ **Azure SQL Compatible**: TLS encryption enabled by default
- ✅ **Complete SQL Support**: All database operations
- ✅ **Parameterized Queries**: SQL injection protection
- ✅ **Connection Pooling**: Efficient resource management
- ✅ **Performance Monitoring**: Execution time tracking

## 📋 Usage Examples

### Connect to Database
```
Use the connect_database tool to establish a connection.
```

### Execute a Query
```sql
SELECT TOP 10 * FROM Customers WHERE Country = @country
-- With parameters: { "country": "USA" }
```

### Get Table Schema
```
Use describe_table with tableName: "Customers" to see column details.
```

## 🔍 Troubleshooting

**❌ Connection failed**
- Verify all required environment variables are set
- Check server accessibility and credentials
- Ensure network connectivity to SQL Server

**❌ SSL/Certificate errors**
- For Azure SQL: Set `DB_ENCRYPT=true` (default)
- For self-signed certs: Set `DB_TRUST_SERVER_CERTIFICATE=true`
- For local dev without encryption: Set `DB_ENCRYPT=false`

## 📋 Version History

### v2.1.1 - Latest
- ✅ Added `DB_ENCRYPT` environment variable (Issue #1)
- ✅ Azure SQL Database compatibility improved
- ✅ Encryption enabled by default (`DB_ENCRYPT=true`)
- ✅ Fixed `DB_TRUST_SERVER_CERTIFICATE` default to `false`

### v2.1.0
- ✅ Updated to MCP SDK 1.25.1
- ✅ Migrated to `registerTool()` / `registerResource()` API
- ✅ Added tool titles for better UI display

### v2.0.3
- ✅ Documentation improvements

## 📄 License

MIT License

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/BYMCS/mssql-mcp/issues)
- **Repository**: [BYMCS/mssql-mcp](https://github.com/BYMCS/mssql-mcp)

---

**🎉 v2.1.1: Azure SQL compatibility with DB_ENCRYPT support**