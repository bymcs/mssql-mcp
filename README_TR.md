# MS SQL Server MCP Server

Microsoft SQL Server için Model Context Protocol (MCP) sunucusu. Claude Desktop, Cursor, Windsurf ve VS Code gibi IDE'lerde kullanılmak üzere gelişmiş güvenlik özellikleriyle tasarlanmıştır.

## 🆕 Sürüm 1.0.2 - Güvenlik & Güvenilirlik Güncellemeleri

- ✅ **SQL Injection Koruması**: Gelişmiş pattern tespiti ve parametreli sorgu zorlaması
- ✅ **Giriş Doğrulama**: Tablo adları, şema adları ve sorgu parametreleri için katı doğrulama
- ✅ **Güncel Bağımlılıklar**: En son @modelcontextprotocol/sdk (v1.17.1)
- ✅ **Daha İyi Hata Yönetimi**: Kapsamlı loglama ve zarif hata kurtarma
- ✅ **Performans İzleme**: Sorgu çalıştırma süresi takibi
- ✅ **Bağlantı Güvenliği**: Gelişmiş SSL/TLS ayarları ve bağlantı havuzu

## Özellikler

- 🔗 **Veritabanı Bağlantı Yönetimi**: MS SQL Server'a güvenli bağlantı
- 📊 **SQL Sorgu Çalıştırma**: Injection koruması ile parametreli sorgular ve DDL/DML işlemleri
- 🗂️ **Şema Yönetimi**: Tablolar, görünümler, stored procedure'lar
- 📋 **Tablo İşlemleri**: Yapı inceleme, veri görüntüleme, sayfalama
- ⚙️ **Stored Procedure**: Parametrelerle çalıştırma
- 🏢 **Veritabanı Listeleme**: Instance'daki tüm veritabanları
- 🔒 **Güvenlik**: SQL injection koruması, giriş doğrulama

## IDE Konfigürasyonu

Bu MCP sunucusu Claude Desktop, Cursor, Windsurf ve VS Code gibi IDE'lerde kullanılabilir.

### Konfigürasyon Dosyaları

**Claude Desktop için**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) veya `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**VS Code tabanlı IDE'ler için**: `.vscode/mcp.json`

### Temel Konfigürasyon

```json
{
  "mcpServers": {
    "mssql": {
      "command": "npx",
      "args": ["-y", "mssql-mcp-server@latest"],
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

> **Not**: VS Code tabanlı IDE'lerde `"mcpServers"` yerine `"servers"` kullanın.

### Platform Spesifik Ayarlar

- **macOS/Linux**: Yukarıdaki konfigürasyonu olduğu gibi kullanın
- **Windows**: `"command": "cmd"` ve `"args": ["/c", "npx", "-y", "mssql-mcp-server@latest"]` kullanın
- **WSL**: `"command": "wsl"` ve `"args": ["npx", "-y", "mssql-mcp-server@latest"]` kullanın

## Environment Variables

Aşağıdaki environment variable'ları kullanabilirsiniz:

- `DB_SERVER`: SQL Server adresi
- `DB_DATABASE`: Veritabanı adı
- `DB_USER`: Kullanıcı adı (Windows Authentication için boş bırakın)
- `DB_PASSWORD`: Şifre
- `DB_PORT`: Port numarası (varsayılan: 1433)
- `DB_TRUST_SERVER_CERTIFICATE`: SSL sertifikası güvenilirliği (true/false)

## Mevcut Fonksiyonlar

Bu MCP sunucusu 9 adet veritabanı işlemi sağlar:

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
