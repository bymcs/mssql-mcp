#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import sql from "mssql";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Database connection configuration schema
const ConfigSchema = z.object({
  server: z.string(),
  database: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  port: z.number().optional().default(1433),
  trustServerCertificate: z.boolean().optional().default(true),
  connectionTimeout: z.number().optional().default(30000),
  requestTimeout: z.number().optional().default(30000),
});

type DatabaseConfig = z.infer<typeof ConfigSchema>;

class MSSQLMCPServer {
  private server: McpServer;
  private pool: sql.ConnectionPool | null = null;
  private config: DatabaseConfig | null = null;

  constructor() {
    this.server = new McpServer({
      name: "mssql-mcp-server",
      version: "1.0.2",
    });

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {    // Tool: Connect to database with optional environment defaults
    this.server.tool(
      "connect_database",
      "Connect to MS SQL Server database",
      {
        server: z.string().optional().describe("SQL Server instance name or IP address (uses DB_SERVER env var if not provided)"),
        database: z.string().optional().describe("Database name (uses DB_DATABASE env var if not provided)"),
        user: z.string().optional().describe("Username (uses DB_USER env var if not provided, leave empty for Windows auth)"),
        password: z.string().optional().describe("Password (uses DB_PASSWORD env var if not provided)"),
        port: z.number().optional().describe("Port number (uses DB_PORT env var or defaults to 1433)"),
        trustServerCertificate: z.boolean().optional().describe("Trust server certificate (uses DB_TRUST_SERVER_CERTIFICATE env var or defaults to true)"),
      },
      async (args) => {
        try {
          // Use environment variables as defaults
          const config = ConfigSchema.parse({
            server: args.server || process.env.DB_SERVER,
            database: args.database || process.env.DB_DATABASE,
            user: args.user || process.env.DB_USER,
            password: args.password || process.env.DB_PASSWORD,
            port: args.port || (process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433),
            trustServerCertificate: args.trustServerCertificate ?? (process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'),
            connectionTimeout: process.env.DB_CONNECTION_TIMEOUT ? parseInt(process.env.DB_CONNECTION_TIMEOUT) : 30000,
            requestTimeout: process.env.DB_REQUEST_TIMEOUT ? parseInt(process.env.DB_REQUEST_TIMEOUT) : 30000,
          });

          if (!config.server) {
            throw new Error("Server is required. Provide it as parameter or set DB_SERVER environment variable.");
          }

          await this.connect(config);
          
          return {
            content: [
              {
                type: "text",
                text: `Successfully connected to SQL Server: ${config.server}${config.database ? ` (Database: ${config.database})` : ""}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Execute SQL query
    this.server.tool(
      "execute_query",
      "Execute a SQL query against the connected database",
      {
        query: z.string().describe("SQL query to execute"),
        parameters: z.record(z.any()).optional().describe("Query parameters (key-value pairs)"),
      },
      async ({ query, parameters }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first using connect_database tool.");
          }

          const request = this.pool.request();
          
          // Add parameters if provided
          if (parameters) {
            for (const [key, value] of Object.entries(parameters)) {
              request.input(key, value);
            }
          }

          const result = await request.query(query);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  recordset: result.recordset,
                  rowsAffected: result.rowsAffected,
                  output: result.output,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get database schema
    this.server.tool(
      "get_schema",
      "Get database schema information (tables, columns, etc.)",
      {
        objectType: z.enum(["tables", "views", "procedures", "functions", "all"]).optional().default("tables"),
        schemaName: z.string().optional().describe("Specific schema name to filter"),
      },
      async ({ objectType, schemaName }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          let query = "";
          
          if (objectType === "tables" || objectType === "all") {
            query += `
              SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE,
                'table' as OBJECT_TYPE
              FROM INFORMATION_SCHEMA.TABLES
              ${schemaName ? `WHERE TABLE_SCHEMA = '${schemaName}'` : ""}
            `;
          }

          if (objectType === "views" || objectType === "all") {
            if (query) query += " UNION ALL ";
            query += `
              SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                'VIEW' as TABLE_TYPE,
                'view' as OBJECT_TYPE
              FROM INFORMATION_SCHEMA.VIEWS
              ${schemaName ? `WHERE TABLE_SCHEMA = '${schemaName}'` : ""}
            `;
          }

          if (objectType === "procedures" || objectType === "all") {
            if (query) query += " UNION ALL ";
            query += `
              SELECT 
                ROUTINE_SCHEMA as TABLE_SCHEMA,
                ROUTINE_NAME as TABLE_NAME,
                'PROCEDURE' as TABLE_TYPE,
                'procedure' as OBJECT_TYPE
              FROM INFORMATION_SCHEMA.ROUTINES
              WHERE ROUTINE_TYPE = 'PROCEDURE'
              ${schemaName ? `AND ROUTINE_SCHEMA = '${schemaName}'` : ""}
            `;
          }

          if (objectType === "functions" || objectType === "all") {
            if (query) query += " UNION ALL ";
            query += `
              SELECT 
                ROUTINE_SCHEMA as TABLE_SCHEMA,
                ROUTINE_NAME as TABLE_NAME,
                'FUNCTION' as TABLE_TYPE,
                'function' as OBJECT_TYPE
              FROM INFORMATION_SCHEMA.ROUTINES
              WHERE ROUTINE_TYPE = 'FUNCTION'
              ${schemaName ? `AND ROUTINE_SCHEMA = '${schemaName}'` : ""}
            `;
          }

          query += " ORDER BY TABLE_SCHEMA, TABLE_NAME";

          const result = await this.pool.request().query(query);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.recordset, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Schema query failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get table structure
    this.server.tool(
      "describe_table",
      "Get detailed structure of a specific table",
      {
        tableName: z.string().describe("Name of the table"),
        schemaName: z.string().optional().default("dbo").describe("Schema name"),
      },
      async ({ tableName, schemaName }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          const query = `
            SELECT 
              COLUMN_NAME,
              DATA_TYPE,
              CHARACTER_MAXIMUM_LENGTH,
              NUMERIC_PRECISION,
              NUMERIC_SCALE,
              IS_NULLABLE,
              COLUMN_DEFAULT,
              ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @tableName 
            AND TABLE_SCHEMA = @schemaName
            ORDER BY ORDINAL_POSITION
          `;

          const result = await this.pool.request()
            .input('tableName', sql.VarChar, tableName)
            .input('schemaName', sql.VarChar, schemaName)
            .query(query);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.recordset, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Table description failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get connection status
    this.server.tool(
      "connection_status",
      "Check current database connection status",
      {},
      async () => {
        const isConnected = this.pool?.connected || false;
        const status = {
          connected: isConnected,
          server: this.config?.server || "Not configured",
          database: this.config?.database || "Not specified",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }
    );

    // Tool: Disconnect from database
    this.server.tool(
      "disconnect_database",
      "Disconnect from the current database",
      {},
      async () => {
        try {
          if (this.pool) {
            await this.pool.close();
            this.pool = null;
            this.config = null;
          }

          return {
            content: [
              {
                type: "text",
                text: "Successfully disconnected from database",
              },
            ],
          };        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get table data with pagination
    this.server.tool(
      "get_table_data",
      "Get data from a specific table with optional filtering and pagination",
      {
        tableName: z.string().describe("Name of the table"),
        schemaName: z.string().optional().default("dbo").describe("Schema name"),
        limit: z.number().optional().default(100).describe("Maximum number of rows to return"),
        offset: z.number().optional().default(0).describe("Number of rows to skip"),
        whereClause: z.string().optional().describe("WHERE clause (without the WHERE keyword)"),
        orderBy: z.string().optional().describe("ORDER BY clause (without the ORDER BY keyword)"),
      },
      async ({ tableName, schemaName, limit, offset, whereClause, orderBy }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          let query = `SELECT * FROM [${schemaName}].[${tableName}]`;
          
          if (whereClause) {
            query += ` WHERE ${whereClause}`;
          }
          
          if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
          } else {
            // Default ordering for pagination
            query += ` ORDER BY (SELECT NULL)`;
          }
          
          query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

          const result = await this.pool.request().query(query);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  data: result.recordset,
                  rowCount: result.recordset.length,
                  offset: offset,
                  limit: limit,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Get table data failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Execute stored procedure
    this.server.tool(
      "execute_procedure",
      "Execute a stored procedure with parameters",
      {
        procedureName: z.string().describe("Name of the stored procedure"),
        schemaName: z.string().optional().default("dbo").describe("Schema name"),
        parameters: z.record(z.any()).optional().describe("Procedure parameters (key-value pairs)"),
      },
      async ({ procedureName, schemaName, parameters }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          const request = this.pool.request();
          
          // Add parameters if provided
          if (parameters) {
            for (const [key, value] of Object.entries(parameters)) {
              request.input(key, value);
            }
          }

          const result = await request.execute(`[${schemaName}].[${procedureName}]`);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  recordsets: result.recordsets,
                  rowsAffected: result.rowsAffected,
                  output: result.output,
                  returnValue: result.returnValue,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Procedure execution failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Get database list
    this.server.tool(
      "list_databases",
      "List all databases on the connected SQL Server instance",
      {},
      async () => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          const query = `
            SELECT 
              name,
              database_id,
              create_date,
              collation_name,
              state_desc,
              user_access_desc,
              is_read_only,
              is_auto_close_on,
              is_auto_shrink_on,
              recovery_model_desc
            FROM sys.databases
            ORDER BY name
          `;

          const result = await this.pool.request().query(query);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result.recordset, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `List databases failed: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private setupResources() {
    // Resource: Current connection info
    this.server.resource(
      "connection-info",
      "mssql://connection/info",
      async () => {
        const info = {
          connected: this.pool?.connected || false,
          config: this.config ? {
            server: this.config.server,
            database: this.config.database,
            port: this.config.port,
          } : null,
        };

        return {
          contents: [
            {
              uri: "mssql://connection/info",
              text: JSON.stringify(info, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );
  }

  private async connect(config: DatabaseConfig) {
    // Close existing connection if any
    if (this.pool) {
      await this.pool.close();
    }

    // Create new connection pool
    this.pool = new sql.ConnectionPool({
      server: config.server,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port,
      options: {
        trustServerCertificate: config.trustServerCertificate,
        enableArithAbort: true,
      },
      connectionTimeout: config.connectionTimeout,
      requestTimeout: config.requestTimeout,
    });

    await this.pool.connect();
    this.config = config;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Handle cleanup on exit
    process.on('SIGINT', async () => {
      if (this.pool) {
        await this.pool.close();
      }
      process.exit(0);
    });
  }
}

// Start the server
const server = new MSSQLMCPServer();
server.run().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
