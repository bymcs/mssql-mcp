import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ConfigSchema, loadHttpConfig, loadConfigFromEnv } from "../../src/config.js";

// --- ConfigSchema ---

test("ConfigSchema - applies default port 1433", () => {
  const result = ConfigSchema.parse({ server: "localhost" });
  assert.equal(result.port, 1433);
});

test("ConfigSchema - applies default encrypt true", () => {
  const result = ConfigSchema.parse({ server: "localhost" });
  assert.equal(result.encrypt, true);
});

test("ConfigSchema - applies default trustServerCertificate false", () => {
  const result = ConfigSchema.parse({ server: "localhost" });
  assert.equal(result.trustServerCertificate, false);
});

test("ConfigSchema - applies default connectionTimeout 30000", () => {
  const result = ConfigSchema.parse({ server: "localhost" });
  assert.equal(result.connectionTimeout, 30000);
});

test("ConfigSchema - applies default requestTimeout 30000", () => {
  const result = ConfigSchema.parse({ server: "localhost" });
  assert.equal(result.requestTimeout, 30000);
});

test("ConfigSchema - accepts overridden port", () => {
  const result = ConfigSchema.parse({ server: "myserver", port: 1434 });
  assert.equal(result.port, 1434);
});

test("ConfigSchema - accepts encrypt false", () => {
  const result = ConfigSchema.parse({ server: "myserver", encrypt: false });
  assert.equal(result.encrypt, false);
});

test("ConfigSchema - accepts trustServerCertificate true", () => {
  const result = ConfigSchema.parse({ server: "myserver", trustServerCertificate: true });
  assert.equal(result.trustServerCertificate, true);
});

test("ConfigSchema - throws on empty server string", () => {
  assert.throws(() => ConfigSchema.parse({ server: "" }), /Server address is required/);
});

test("ConfigSchema - throws on missing server", () => {
  assert.throws(() => ConfigSchema.parse({}));
});

test("ConfigSchema - throws on port out of range", () => {
  assert.throws(() => ConfigSchema.parse({ server: "localhost", port: 0 }));
  assert.throws(() => ConfigSchema.parse({ server: "localhost", port: 65536 }));
});

// --- loadHttpConfig ---

test("loadHttpConfig - returns default host 127.0.0.1 when env not set", () => {
  const savedHost = process.env.MCP_HOST;
  const savedPort = process.env.MCP_PORT;
  delete process.env.MCP_HOST;
  delete process.env.MCP_PORT;
  try {
    const config = loadHttpConfig();
    assert.equal(config.host, "127.0.0.1");
  } finally {
    if (savedHost !== undefined) process.env.MCP_HOST = savedHost;
    if (savedPort !== undefined) process.env.MCP_PORT = savedPort;
  }
});

test("loadHttpConfig - returns default port 3001 when env not set", () => {
  const savedHost = process.env.MCP_HOST;
  const savedPort = process.env.MCP_PORT;
  delete process.env.MCP_HOST;
  delete process.env.MCP_PORT;
  try {
    const config = loadHttpConfig();
    assert.equal(config.port, 3001);
  } finally {
    if (savedHost !== undefined) process.env.MCP_HOST = savedHost;
    if (savedPort !== undefined) process.env.MCP_PORT = savedPort;
  }
});

test("loadHttpConfig - reads host from MCP_HOST", () => {
  const savedHost = process.env.MCP_HOST;
  process.env.MCP_HOST = "0.0.0.0";
  try {
    const config = loadHttpConfig();
    assert.equal(config.host, "0.0.0.0");
  } finally {
    if (savedHost !== undefined) process.env.MCP_HOST = savedHost;
    else delete process.env.MCP_HOST;
  }
});

test("loadHttpConfig - reads port from MCP_PORT", () => {
  const savedPort = process.env.MCP_PORT;
  process.env.MCP_PORT = "8080";
  try {
    const config = loadHttpConfig();
    assert.equal(config.port, 8080);
  } finally {
    if (savedPort !== undefined) process.env.MCP_PORT = savedPort;
    else delete process.env.MCP_PORT;
  }
});

// --- loadConfigFromEnv ---

test("loadConfigFromEnv - throws when DB_SERVER not set", () => {
  const saved = process.env.DB_SERVER;
  delete process.env.DB_SERVER;
  try {
    assert.throws(() => loadConfigFromEnv());
  } finally {
    if (saved !== undefined) process.env.DB_SERVER = saved;
  }
});

test("loadConfigFromEnv - reads DB_SERVER and applies defaults", () => {
  const savedServer = process.env.DB_SERVER;
  const savedEncrypt = process.env.DB_ENCRYPT;
  const savedTrustCert = process.env.DB_TRUST_SERVER_CERTIFICATE;
  process.env.DB_SERVER = "myserver";
  delete process.env.DB_ENCRYPT;
  delete process.env.DB_TRUST_SERVER_CERTIFICATE;
  try {
    const config = loadConfigFromEnv();
    assert.equal(config.server, "myserver");
    assert.equal(config.port, 1433);
    assert.equal(config.encrypt, true);
    assert.equal(config.trustServerCertificate, false);
  } finally {
    if (savedServer !== undefined) process.env.DB_SERVER = savedServer;
    else delete process.env.DB_SERVER;
    if (savedTrustCert !== undefined) process.env.DB_TRUST_SERVER_CERTIFICATE = savedTrustCert;
    else delete process.env.DB_TRUST_SERVER_CERTIFICATE;
    if (savedEncrypt !== undefined) process.env.DB_ENCRYPT = savedEncrypt;
  }
});

test("loadConfigFromEnv - DB_ENCRYPT=false disables encryption", () => {
  const savedServer = process.env.DB_SERVER;
  const savedEncrypt = process.env.DB_ENCRYPT;
  process.env.DB_SERVER = "myserver";
  process.env.DB_ENCRYPT = "false";
  try {
    const config = loadConfigFromEnv();
    assert.equal(config.encrypt, false);
  } finally {
    if (savedServer !== undefined) process.env.DB_SERVER = savedServer;
    else delete process.env.DB_SERVER;
    if (savedEncrypt !== undefined) process.env.DB_ENCRYPT = savedEncrypt;
    else delete process.env.DB_ENCRYPT;
  }
});

test("loadConfigFromEnv - DB_TRUST_SERVER_CERTIFICATE=true enables trust", () => {
  const savedServer = process.env.DB_SERVER;
  const savedTrust = process.env.DB_TRUST_SERVER_CERTIFICATE;
  process.env.DB_SERVER = "myserver";
  process.env.DB_TRUST_SERVER_CERTIFICATE = "true";
  try {
    const config = loadConfigFromEnv();
    assert.equal(config.trustServerCertificate, true);
  } finally {
    if (savedServer !== undefined) process.env.DB_SERVER = savedServer;
    else delete process.env.DB_SERVER;
    if (savedTrust !== undefined) process.env.DB_TRUST_SERVER_CERTIFICATE = savedTrust;
    else delete process.env.DB_TRUST_SERVER_CERTIFICATE;
  }
});
