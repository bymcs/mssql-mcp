import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  isValidIdentifier,
  validateIdentifier,
  bracketIdentifier,
  validateOrderBy,
} from "../../src/db/validators.js";

test("isValidIdentifier - valid names", () => {
  assert.ok(isValidIdentifier("dbo"));
  assert.ok(isValidIdentifier("MyTable"));
  assert.ok(isValidIdentifier("_private"));
  assert.ok(isValidIdentifier("table_123"));
  assert.ok(isValidIdentifier("a$b"));
  assert.ok(isValidIdentifier("col#1"));
  assert.ok(isValidIdentifier("_@col"));
});

test("isValidIdentifier - invalid names", () => {
  assert.ok(!isValidIdentifier(""));
  assert.ok(!isValidIdentifier("1table"));
  assert.ok(!isValidIdentifier("ta ble"));
  assert.ok(!isValidIdentifier("ta'ble"));
  assert.ok(!isValidIdentifier("ta;ble"));
  assert.ok(!isValidIdentifier("ta--ble"));
  assert.ok(!isValidIdentifier("ta/*ble"));
  assert.ok(!isValidIdentifier("ta\nble"));
});

test("validateIdentifier - throws on invalid", () => {
  assert.throws(() => validateIdentifier("bad name", "test"), /Invalid test/);
  assert.throws(() => validateIdentifier("1start", "test"), /Invalid test/);
});

test("validateIdentifier - returns valid name", () => {
  assert.equal(validateIdentifier("dbo", "schema"), "dbo");
});

test("bracketIdentifier - wraps valid name", () => {
  assert.equal(bracketIdentifier("dbo"), "[dbo]");
  assert.equal(bracketIdentifier("MyTable"), "[MyTable]");
  assert.equal(bracketIdentifier("_col"), "[_col]");
});

test("bracketIdentifier - throws on invalid", () => {
  assert.throws(() => bracketIdentifier("bad name"), /Invalid identifier/);
  assert.throws(() => bracketIdentifier("1bad"), /Invalid identifier/);
});

test("validateOrderBy - valid clauses", () => {
  assert.equal(validateOrderBy("Name ASC"), "Name ASC");
  assert.equal(validateOrderBy("Id DESC, Name ASC"), "Id DESC, Name ASC");
  assert.equal(validateOrderBy("CreatedAt"), "CreatedAt");
  assert.equal(validateOrderBy("[Id] DESC"), "[Id] DESC");
  assert.equal(validateOrderBy("t.Name"), "t.Name");
});

test("validateOrderBy - invalid clauses", () => {
  assert.throws(() => validateOrderBy("1+1"), /Invalid ORDER BY/);
  assert.throws(() => validateOrderBy("Name; DROP TABLE"), /Invalid ORDER BY/);
  assert.throws(() => validateOrderBy("Name UNION SELECT"), /Invalid ORDER BY/);
  assert.throws(() => validateOrderBy("Name--comment"), /Invalid ORDER BY/);
});
