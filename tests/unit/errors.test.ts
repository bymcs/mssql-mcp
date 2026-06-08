import { strict as assert } from "node:assert";
import { test } from "node:test";
import { McpToolError, toActionableError, toolError } from "../../src/utils/errors.js";

test("toolError - wraps message with error emoji", () => {
  const result = toolError("connection failed");
  assert.equal(result.content[0].type, "text");
  assert.ok(result.content[0].text.includes("❌"));
  assert.ok(result.content[0].text.includes("connection failed"));
});

test("toolError - sets isError flag to true", () => {
  const result = toolError("oops");
  assert.equal(result.isError, true);
});

test("toolError - content type is always 'text'", () => {
  const result = toolError("msg");
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
});

test("toActionableError - extracts message from Error instance", () => {
  const err = new Error("connection refused");
  assert.equal(toActionableError(err), "connection refused");
});

test("toActionableError - converts plain string to string", () => {
  assert.equal(toActionableError("plain string"), "plain string");
});

test("toActionableError - converts number to string", () => {
  assert.equal(toActionableError(42), "42");
});

test("toActionableError - converts null to string", () => {
  assert.equal(toActionableError(null), "null");
});

test("McpToolError - has correct name", () => {
  const err = new McpToolError("test error");
  assert.equal(err.name, "McpToolError");
});

test("McpToolError - is instanceof Error", () => {
  const err = new McpToolError("test error");
  assert.ok(err instanceof Error);
});

test("McpToolError - stores message", () => {
  const err = new McpToolError("something failed");
  assert.equal(err.message, "something failed");
});

test("McpToolError - stores cause when provided", () => {
  const cause = new Error("original cause");
  const err = new McpToolError("wrapper", cause);
  assert.equal(err.cause, cause);
});

test("McpToolError - cause is undefined when not provided", () => {
  const err = new McpToolError("no cause");
  assert.equal(err.cause, undefined);
});
