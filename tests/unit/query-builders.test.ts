import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  buildSelectQuery,
  buildSelectWithWhereQuery,
  buildSchemaObjectsQuery,
} from "../../src/db/query-builders.js";

test("buildSelectQuery - basic SELECT *", () => {
  const q = buildSelectQuery("dbo", "Users", null, null, 0, 20);
  assert.ok(q.includes("[dbo].[Users]"));
  assert.ok(q.includes("OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY"));
  assert.ok(q.includes("SELECT *"));
});

test("buildSelectQuery - with columns projection", () => {
  const q = buildSelectQuery("dbo", "Users", ["Id", "Name"], null, 0, 10);
  assert.ok(q.includes("[Id], [Name]"));
  assert.ok(!q.includes("SELECT *"));
});

test("buildSelectQuery - with orderBy", () => {
  const q = buildSelectQuery("dbo", "Users", null, "Name ASC", 0, 20);
  assert.ok(q.includes("ORDER BY Name ASC"));
});

test("buildSelectQuery - default ORDER BY fallback", () => {
  const q = buildSelectQuery("dbo", "Users", null, null, 0, 20);
  assert.ok(q.includes("ORDER BY (SELECT NULL)"));
});

test("buildSelectQuery - offset and limit", () => {
  const q = buildSelectQuery("dbo", "Orders", null, null, 40, 10);
  assert.ok(q.includes("OFFSET 40 ROWS FETCH NEXT 10 ROWS ONLY"));
});

test("buildSelectWithWhereQuery - includes WHERE", () => {
  const q = buildSelectWithWhereQuery("dbo", "Orders", null, "Status = @status", null, 0, 20);
  assert.ok(q.includes("WHERE Status = @status"));
  assert.ok(q.includes("[dbo].[Orders]"));
});

test("buildSelectQuery - rejects invalid schema", () => {
  assert.throws(() => buildSelectQuery("bad schema", "Users", null, null, 0, 20), /Invalid identifier/);
});

test("buildSelectQuery - rejects invalid table", () => {
  assert.throws(() => buildSelectQuery("dbo", "bad table", null, null, 0, 20), /Invalid identifier/);
});

test("buildSchemaObjectsQuery - tables only", () => {
  const q = buildSchemaObjectsQuery("tables");
  assert.ok(q.includes("INFORMATION_SCHEMA.TABLES"));
  assert.ok(!q.includes("INFORMATION_SCHEMA.VIEWS"));
  assert.ok(!q.includes("ROUTINES"));
});

test("buildSchemaObjectsQuery - views only", () => {
  const q = buildSchemaObjectsQuery("views");
  assert.ok(q.includes("INFORMATION_SCHEMA.VIEWS"));
  assert.ok(!q.includes("INFORMATION_SCHEMA.TABLES"));
});

test("buildSchemaObjectsQuery - all includes all types", () => {
  const q = buildSchemaObjectsQuery("all");
  assert.ok(q.includes("INFORMATION_SCHEMA.TABLES"));
  assert.ok(q.includes("INFORMATION_SCHEMA.VIEWS"));
  assert.ok(q.includes("ROUTINE_TYPE = 'PROCEDURE'"));
  assert.ok(q.includes("ROUTINE_TYPE = 'FUNCTION'"));
});

test("buildSchemaObjectsQuery - with schema filter uses @schemaName", () => {
  const q = buildSchemaObjectsQuery("all", "dbo");
  assert.ok(q.includes("@schemaName"));
});

test("buildSchemaObjectsQuery - without schema filter has no @schemaName", () => {
  const q = buildSchemaObjectsQuery("tables");
  assert.ok(!q.includes("@schemaName"));
});
