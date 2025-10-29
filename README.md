# MS SQL Server MCP Server v2.0.3

🚀 **Smart Trust-Based Model Context Protocol (MCP) server** for Microsoft SQL Server with intelligent auto-connection and AI-friendly design.

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
        "DB_TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

> Replace with your actual database credentials. Server auto-connects using these.

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `execute_query` | Execute any SQL query with parameters |
| `get_schema` | List database objects (tables, views, procedures) |
| `describe_table` | Get detailed table structure |
| `get_table_data` | Retrieve data with pagination |
| `execute_procedure` | Execute stored procedures |
| `list_databases` | List all databases |
| `connection_status` | Check connection state |
| `connect_database` | Manual connection (rarely needed) |
| `disconnect_database` | Close connection |
| `clear_cache` | Clear query cache |

All tools auto-connect using environment variables.

## 🔧 Environment Variables

| Variable | Required | Default |
|----------|----------|---------|
| `DB_SERVER` | ✅ | - |
| `DB_DATABASE` | ✅ | - |
| `DB_USER` | ✅ | - |
| `DB_PASSWORD` | ✅ | - |
| `DB_PORT` | ❌ | 1433 |
| `DB_TRUST_SERVER_CERTIFICATE` | ❌ | true |
| `DB_CONNECTION_TIMEOUT` | ❌ | 30000 |
| `DB_REQUEST_TIMEOUT` | ❌ | 30000 |

## 🛡️ Security

**✅ Supported:** All database operations (SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)

**🚨 Blocked:** Server-level operations only (SHUTDOWN, XP_CMDSHELL, RECONFIGURE)

## 🏆 Features

- ✅ **Auto-Connection**: Environment-based, no manual steps
- ✅ **Complete SQL Support**: All database operations
- ✅ **No Rate Limiting**: Natural workflow
- ✅ **Query Caching**: 5-minute TTL for SELECT queries
- ✅ **Performance Monitoring**: Execution time tracking
- ✅ **Latest MCP SDK**: v1.20.2 with 2025 protocol
- ✅ **Clean Logging**: Minimal console output, MCP protocol compatible

## 🔍 Troubleshooting

**❌ Auto-connection failed**
- Set all required environment variables
- Verify server accessibility and credentials
- Check network connectivity

**❌ SQL Security Alert**
- Only server operations are blocked
- Database operations should work normally

## 📋 Version History

### v2.0.3 - Latest
- ✅ Updated documentation with modern styling
- ✅ Improved troubleshooting section
- ✅ Enhanced feature descriptions

### v2.0.2 - Performance & Compatibility
- ✅ Simplified logging for MCP protocol compatibility
- ✅ All console output moved to stderr
- ✅ Clean, professional log messages
- ✅ Version bump to 2.0.2

## 📄 License

MIT License

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/BYMCS/mssql-mcp/issues)
- **Repository**: [BYMCS/mssql-mcp](https://github.com/BYMCS/mssql-mcp)

---

**🎉 v2.0.3: Enhanced documentation and user experience**