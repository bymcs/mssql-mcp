# MS SQL Server MCP Server

Model Context Protocol (MCP) server for Microsoft SQL Server. Designed for use in IDEs like Claude Desktop, Cursor, Windsurf, and VS Code with enhanced security features.

## 🆕 Version 1.0.2 - Security & Reliability Updates

- ✅ **SQL Injection Protection**: Advanced pattern detection and parameterized query enforcement
- ✅ **Input Validation**: Strict validation for table names, schema names, and query parameters
- ✅ **Updated Dependencies**: Latest @modelcontextprotocol/sdk (v1.17.1)
- ✅ **Better Error Handling**: Comprehensive logging and graceful error recovery
- ✅ **Performance Monitoring**: Query execution time tracking
- ✅ **Connection Security**: Enhanced SSL/TLS settings and connection pooling

## Features

- 🔗 **Database Connection Management**: Secure connection to MS SQL Server
- 📊 **SQL Query Execution**: Parameterized queries and DDL/DML operations with injection protection
- 🗂️ **Schema Management**: Tables, views, stored procedures
- 📋 **Table Operations**: Structure inspection, data viewing, pagination
- ⚙️ **Stored Procedures**: Execute with parameters
- 🏢 **Database Listing**: All databases in the instance
- 🔒 **Security**: SQL injection protection, input validation

## IDE Configuration

This MCP server can be used in IDEs like Claude Desktop, Cursor, Windsurf, and VS Code.

### Configuration Files

**For Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**For VS Code-based IDEs**: `.vscode/mcp.json`

### Basic Configuration

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
        "DB_PORT": "1433",
        "DB_TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

> **Note**: Use `"servers"` instead of `"mcpServers"` in VS Code-based IDEs.

### Platform Specific Settings

- **macOS/Linux**: Use the configuration above as is
- **Windows**: Use `"command": "cmd"` and `"args": ["/c", "npx", "-y", "mssql-mcp@latest"]`
- **WSL**: Use `"command": "wsl"` and `"args": ["npx", "-y", "mssql-mcp@latest"]`

## Environment Variables

You can use the following environment variables:

- `DB_SERVER`: SQL Server address
- `DB_DATABASE`: Database name
- `DB_USER`: Username (leave empty for Windows Authentication)
- `DB_PASSWORD`: Password
- `DB_PORT`: Port number (default: 1433)
- `DB_TRUST_SERVER_CERTIFICATE`: SSL certificate trust (true/false)
- `DB_CONNECTION_TIMEOUT`: Connection timeout in milliseconds (default: 30000)
- `DB_REQUEST_TIMEOUT`: Request timeout in milliseconds (default: 30000)

## Available Functions

This MCP server provides 9 database operations:

| Function | Description |
|----------|-------------|
| `connect_database` | Establishes connection to SQL Server |
| `connection_status` | Checks connection status |
| `disconnect_database` | Closes the connection |
| `execute_query` | Executes SQL queries (SELECT, INSERT, UPDATE, DELETE) |
| `execute_procedure` | Executes stored procedures |
| `get_schema` | Lists database schema (tables, views, procedures) |
| `describe_table` | Shows detailed table structure |
| `list_databases` | Lists all databases |
| `get_table_data` | Retrieves table data with pagination |

## Security Notes

- **SQL Injection Protection**: The server includes pattern detection and enforces parameterized queries
- **Input Validation**: All user inputs are validated and sanitized
- **SSL/TLS**: Enable encryption for production environments
- **Connection Pooling**: Automatic connection management with timeout settings
- **Error Handling**: Comprehensive error logging without exposing sensitive information
- **Parameterized Queries**: Always use parameters for user input to prevent SQL injection

### 🚨 Important Security Recommendations

1. **Use strong passwords and consider Windows Authentication**
2. **Enable SSL/TLS encryption when possible**
3. **Use parameterized queries for all user input**
4. **Monitor logs for security warnings**
5. **Regularly update the package for security fixes**

## GitHub Repository

This project is also available on GitHub:
- **Repository**: [BYMCS/mssql-mcp](https://github.com/BYMCS/mssql-mcp)
- **Issues**: For bug reports and suggestions
- **Releases**: Release notes and downloads
