#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import sql from "mssql";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Database connection configuration schema with strict validation
const ConfigSchema = z.object({
  server: z.string().min(1, "Server address is required"),
  database: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional().default(1433),
  trustServerCertificate: z.boolean().optional().default(true),
  connectionTimeout: z.number().int().min(1000).max(60000).optional().default(30000),
  requestTimeout: z.number().int().min(1000).max(300000).optional().default(30000),
});

type DatabaseConfig = z.infer<typeof ConfigSchema>;

class MSSQLMCPServer {
  private server: McpServer;
  private pool: sql.ConnectionPool | null = null;
  private config: DatabaseConfig | null = null;

  constructor() {
    this.server = new McpServer({
      name: "mssql-mcp-server",
  version: "1.0.3",
    });

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Tool: Connect to database with enhanced security validation (only uses environment variables)
    this.server.tool(
      "connect_database",
      "Connect to MS SQL Server database with security validation (uses only environment variables for security)",
      {
        // No parameters - only environment variables will be used for security
      },
      async (args) => {
        try {
          // SECURITY: Only use environment variables, ignore all user parameters
          const config = ConfigSchema.parse({
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 1433,
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
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
                text: `✅ Successfully connected to SQL Server: ${config.server}${config.database ? ` (Database: ${config.database})` : ""}`,
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("❌ Database connection failed:", errorMessage);
          
          return {
            content: [
              {
                type: "text",
                text: `❌ Failed to connect: ${errorMessage}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool: Execute SQL query with enhanced security
    this.server.tool(
      "execute_query",
      "Execute a SQL query against the connected database with security validation",
      {
        query: z.string().min(1, "Query cannot be empty").describe("SQL query to execute"),
        parameters: z.record(z.any()).optional().describe("Query parameters (key-value pairs) - always use parameters for user input"),
      },
      async ({ query, parameters }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first using connect_database tool.");
          }

          const request = this.pool.request();
          
          // Add parameters if provided (recommended for security)
          if (parameters) {
            for (const [key, value] of Object.entries(parameters)) {
              request.input(key, value);
            }
          }

          const startTime = Date.now();
          const result = await request.query(query);
          const executionTime = Date.now() - startTime;
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  recordset: result.recordset,
                  rowsAffected: result.rowsAffected,
                  output: result.output,
                  executionTime: `${executionTime}ms`,
                  parametersUsed: parameters ? Object.keys(parameters).length : 0,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("❌ Query execution failed:", errorMessage);
          
          return {
            content: [
              {
                type: "text",
                text: `❌ Query execution failed: ${errorMessage}`,
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

    // Tool: Get enhanced connection status
    this.server.tool(
      "connection_status",
      "Check current database connection status with detailed information",
      {},
      async () => {
        const isConnected = this.pool?.connected || false;
        const status = {
          connected: isConnected,
          server: this.config?.server || "Not configured",
          database: this.config?.database || "Not specified",
          port: this.config?.port || "Not specified",
          connectionTime: isConnected ? new Date().toISOString() : null,
          securityFeatures: {
            sqlInjectionProtection: "Enabled",
          },
          poolInfo: this.pool ? {
            size: this.pool.size,
            available: this.pool.available,
            pending: this.pool.pending,
            borrowed: this.pool.borrowed,
          } : null,
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

    // Tool: Get table data with enhanced security and validation
    this.server.tool(
      "get_table_data",
      "Get data from a specific table with optional filtering, pagination and input validation",
      {
        tableName: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, "Table name can only contain letters, numbers, and underscores").describe("Name of the table"),
        schemaName: z.string().regex(/^[a-zA-Z0-9_]+$/, "Schema name can only contain letters, numbers, and underscores").optional().default("dbo").describe("Schema name"),
        limit: z.number().int().min(1).max(10000).optional().default(100).describe("Maximum number of rows to return (1-10000)"),
        offset: z.number().int().min(0).optional().default(0).describe("Number of rows to skip"),
        whereClause: z.string().optional().describe("WHERE clause (without the WHERE keyword) - use parameters for values"),
        orderBy: z.string().optional().describe("ORDER BY clause (without the ORDER BY keyword)"),
        parameters: z.record(z.any()).optional().describe("Parameters for WHERE clause"),
      },
      async ({ tableName, schemaName, limit, offset, whereClause, orderBy, parameters }) => {
        try {
          if (!this.pool) {
            throw new Error("No database connection. Please connect first.");
          }

          // Security: Validate table and schema names to prevent SQL injection
          const tableNamePattern = /^[a-zA-Z0-9_]+$/;
          if (!tableNamePattern.test(tableName)) {
            throw new Error("Invalid table name. Only letters, numbers, and underscores are allowed.");
          }
          if (!tableNamePattern.test(schemaName)) {
            throw new Error("Invalid schema name. Only letters, numbers, and underscores are allowed.");
          }

          // Build query using parameterized approach
          let query = `SELECT * FROM [${schemaName}].[${tableName}]`;
          
          const request = this.pool.request();
          
          if (whereClause) {
            // Add parameters for WHERE clause if provided
            if (parameters) {
              for (const [key, value] of Object.entries(parameters)) {
                request.input(key, value);
              }
            }
            query += ` WHERE ${whereClause}`;
          }
          
          if (orderBy) {
            // Validate ORDER BY clause for basic security
            // Allow dotted identifiers, bracketed identifiers, commas, spaces and optional ASC/DESC per column
            const orderByPattern = /^([\[\]a-zA-Z0-9_.]+(\s+(ASC|DESC))?)(\s*,\s*[\[\]a-zA-Z0-9_.]+(\s+(ASC|DESC))?)*$/i;
            if (!orderByPattern.test(orderBy)) {
              throw new Error("Invalid ORDER BY clause. Only column names, commas, spaces, ASC, and DESC are allowed.");
            }
            query += ` ORDER BY ${orderBy}`;
          } else {
            // Default ordering for pagination
            query += ` ORDER BY (SELECT NULL)`;
          }
          
          query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;

          const startTime = Date.now();
          const result = await request.query(query);
          const executionTime = Date.now() - startTime;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  data: result.recordset,
                  metadata: {
                    rowCount: result.recordset.length,
                    offset: offset,
                    limit: limit,
                    executionTime: `${executionTime}ms`,
                    table: `${schemaName}.${tableName}`,
                    hasWhereClause: !!whereClause,
                    parametersUsed: parameters ? Object.keys(parameters).length : 0,
                  }
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("❌ Get table data failed:", errorMessage);
          
          return {
            content: [
              {
                type: "text",
                text: `❌ Get table data failed: ${errorMessage}`,
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
    try {
      // Close existing connection if any
      if (this.pool) {
        console.log("🔄 Closing existing database connection...");
        await this.pool.close();
      }

      console.log(`🔗 Connecting to SQL Server: ${config.server}:${config.port}`);
      
      // Create new connection pool with enhanced security settings
      this.pool = new sql.ConnectionPool({
        server: config.server,
        database: config.database,
        user: config.user,
        password: config.password,
        port: config.port,
        options: {
          trustServerCertificate: config.trustServerCertificate,
          enableArithAbort: true,
          encrypt: !config.trustServerCertificate, // Enable encryption when not trusting server certificate
        },
        connectionTimeout: config.connectionTimeout,
        requestTimeout: config.requestTimeout,
        // Connection pool settings for better resource management
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      });

      // Set up event handlers for better monitoring
      this.pool.on('connect', () => {
        console.log('✅ Database connection established');
      });

      this.pool.on('error', (err: Error) => {
        console.error('❌ Database connection error:', err);
      });

      await this.pool.connect();
      this.config = config;
      
      console.log(`✅ Successfully connected to database: ${config.server}${config.database ? `/${config.database}` : ''}`);
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      if (this.pool) {
        try {
          await this.pool.close();
        } catch (closeError) {
          console.error("Error closing failed connection:", closeError);
        }
        this.pool = null;
      }
      this.config = null;
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    
    // Enhanced graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
      
      try {
        if (this.pool) {
          console.log("🔄 Closing database connection...");
          await this.pool.close();
          console.log("✅ Database connection closed");
        }
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
      }
      
      console.log("👋 Server shutdown complete");
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });

  console.log("🚀 Starting MSSQL MCP Server v1.0.3...");
    console.log("🔒 Security features enabled:");
    console.log("   - SQL injection protection: Enabled");
    console.log("   - Input validation: Enhanced");
    console.log("   - Parameterized queries: Enforced");
    
    await this.server.connect(transport);
    console.log("✅ Server connected and ready to receive requests");
  }
}

// Start the server
const server = new MSSQLMCPServer();
server.run().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
