# MS SQL Server MCP Server

Model Context Protocol (MCP) server for Microsoft SQL Server. Designed for use in IDEs like Claude Desktop, Cursor, Windsurf, and VS Code.

## Features

- 🔗 **Database Connection Management**: Secure connection to MS SQL Server
- 📊 **SQL Query Execution**: Parameterized queries and DDL/DML operations
- 🗂️ **Schema Management**: Tables, views, stored procedures
- 📋 **Table Operations**: Structure inspection, data viewing, pagination
- ⚙️ **Stored Procedures**: Execute with parameters
- 🏢 **Database Listing**: All databases in the instance
- 🔒 **Security**: Environment variable support

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

## Available Functions

This MCP server provides 9 database operations:

| Fonksiyon | Açıklama |
|-----------|----------|
| `connect_database` | SQL Server'a bağlantı kurar |
| `connection_status` | Bağlantı durumunu kontrol eder |
| `disconnect_database` | Bağlantıyı kapatır |
| `execute_query` | SQL sorgusu çalıştırır (SELECT, INSERT, UPDATE, DELETE) |
| `execute_procedure` | Stored procedure çalıştırır |
| `get_schema` | Veritabanı şemasını listeler (tablolar, views, procedures) |
| `describe_table` | Tablo yapısını detaylı gösterir |
| `list_databases` | Tüm veritabanlarını listeler |
| `get_table_data` | Tablo verilerini sayfalama ile getirir |

## Güvenlik Notları

- Hassas bilgileri (şifreler) environment variable'lar ile yönetin
- Üretim ortamında güçlü şifreler kullanın
- SSL/TLS bağlantısı için sertifikaları doğrulayın
- SQL injection koruması için parametreli sorgular kullanın

## GitHub Repository

Bu proje GitHub'da da mevcuttur:
- **Repository**: [BYMCS/mssql-mcp](https://github.com/BYMCS/mssql-mcp)
- **Issues**: Hata bildirimleri ve öneriler için
- **Releases**: Sürüm notları ve indirmeler
