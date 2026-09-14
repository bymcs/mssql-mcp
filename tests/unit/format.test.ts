import { strict as assert } from "node:assert";
import { test } from "node:test";
import { formatDisplayValue, normalizeOutput } from "../../src/utils/format.js";

// Type stubs — getTypeName() uses function.name lowercased,
// or falls back to object.name property.
const DateType = { name: "Date" };
const TimeType = { name: "Time" };

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function formatLocalDate(d: Date): string {
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

function formatLocalTime(d: Date): string {
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
}

function formatLocalDateTime(d: Date): string {
  return `${formatLocalDate(d)} ${formatLocalTime(d)}`;
}

// --- formatDisplayValue ---

test("formatDisplayValue - null returns empty string", () => {
  assert.equal(formatDisplayValue(null), "");
});

test("formatDisplayValue - undefined returns empty string", () => {
  assert.equal(formatDisplayValue(undefined), "");
});

test("formatDisplayValue - string returns itself", () => {
  assert.equal(formatDisplayValue("hello"), "hello");
});

test("formatDisplayValue - number returns string representation", () => {
  assert.equal(formatDisplayValue(42), "42");
  assert.equal(formatDisplayValue(3.14), "3.14");
});

test("formatDisplayValue - boolean returns string representation", () => {
  assert.equal(formatDisplayValue(true), "true");
  assert.equal(formatDisplayValue(false), "false");
});

test("formatDisplayValue - object returns JSON string", () => {
  assert.equal(formatDisplayValue({ a: 1 }), JSON.stringify({ a: 1 }));
});

// --- normalizeOutput: SQL date types ---

test("normalizeOutput - 'date' type returns date-only string", () => {
  const d = new Date(2026, 3, 1, 10, 51, 23, 600);
  const result = normalizeOutput(d, { type: DateType });
  assert.equal(result, formatLocalDate(d));
});

test("normalizeOutput - 'time' type with scale=0 returns time without fraction", () => {
  const d = new Date(2026, 3, 1, 10, 51, 23, 0);
  const result = normalizeOutput(d, { type: TimeType, scale: 0 });
  assert.equal(result, "10:51:23");
});

test("normalizeOutput - 'time' type with scale=3 includes milliseconds", () => {
  const d = new Date(2026, 3, 1, 10, 51, 23, 600);
  const result = normalizeOutput(d, { type: TimeType, scale: 3 });
  assert.equal(result, "10:51:23.600");
});

test("normalizeOutput - datetime with scale=0 returns no fraction", () => {
  const d = new Date(2026, 3, 1, 10, 51, 23, 600);
  const result = normalizeOutput(d, { scale: 0 });
  assert.equal(result, `${formatLocalDate(d)} ${formatLocalTime(d)}`);
});

test("normalizeOutput - datetime with scale=3 returns 3-digit fraction", () => {
  const d = new Date(2026, 3, 1, 10, 51, 23, 600);
  const result = normalizeOutput(d, { scale: 3 });
  assert.equal(result, `${formatLocalDateTime(d)}.600`);
});

test("normalizeOutput - datetime with no column metadata trims trailing zeros", () => {
  // 600ms → base "6000000" → trimmed to "6"
  const d = new Date(2026, 3, 1, 10, 51, 23, 600);
  const result = normalizeOutput(d) as string;
  assert.ok(result.startsWith(formatLocalDate(d)));
  assert.ok(!result.endsWith("0"), `Trailing zeros not trimmed: ${result}`);
});

test("normalizeOutput - datetime with zero milliseconds and no scale returns no fraction", () => {
  // 0ms → base "0000000" → trimmed to "" → no fraction
  const d = new Date(2026, 3, 1, 10, 51, 23, 0);
  const result = normalizeOutput(d);
  assert.equal(result, `${formatLocalDateTime(d)}`);
});

// --- normalizeOutput: primitives & structures ---

test("normalizeOutput - passes through number", () => {
  assert.equal(normalizeOutput(42), 42);
});

test("normalizeOutput - passes through string", () => {
  assert.equal(normalizeOutput("hello"), "hello");
});

test("normalizeOutput - passes through null", () => {
  assert.equal(normalizeOutput(null), null);
});

test("normalizeOutput - passes through boolean", () => {
  assert.equal(normalizeOutput(true), true);
});

test("normalizeOutput - normalizes Date inside plain object", () => {
  const d = new Date(2026, 3, 1, 10, 0, 0, 0);
  const result = normalizeOutput({ created: d }) as Record<string, unknown>;
  assert.equal(result.created, `${formatLocalDateTime(d)}`);
});

test("normalizeOutput - normalizes array of primitives unchanged", () => {
  const result = normalizeOutput([1, "two", null]) as unknown[];
  assert.deepEqual(result, [1, "two", null]);
});

test("normalizeOutput - normalizes Date values inside array", () => {
  const d = new Date(2026, 3, 1, 10, 0, 0, 0);
  const result = normalizeOutput([d]) as unknown[];
  assert.equal(result[0], `${formatLocalDateTime(d)}`);
});

// --- normalizeOutput: depth limit & circular reference guard (issue #5) ---

test("normalizeOutput - bounds recursion depth instead of overflowing the stack", () => {
  let root: Record<string, unknown> = { value: "leaf" };
  for (let i = 0; i < 5000; i++) {
    root = { nested: root };
  }
  const result = normalizeOutput(root) as unknown;
  assert.doesNotThrow(() => JSON.stringify(result));
});

test("normalizeOutput - replaces content past the max depth with a placeholder", () => {
  let root: Record<string, unknown> = { value: "leaf" };
  for (let i = 0; i < 200; i++) {
    root = { nested: root };
  }
  const json = JSON.stringify(normalizeOutput(root));
  assert.ok(json.includes("max depth exceeded"));
  assert.ok(!json.includes("leaf"));
});

test("normalizeOutput - shallow objects are unaffected by the depth limit", () => {
  const result = normalizeOutput({ a: { b: { c: "leaf" } } }) as Record<string, unknown>;
  assert.deepEqual(result, { a: { b: { c: "leaf" } } });
});

test("normalizeOutput - detects a circular object reference", () => {
  const obj: Record<string, unknown> = { name: "root" };
  obj.self = obj;
  const result = normalizeOutput(obj) as Record<string, unknown>;
  assert.equal(result.name, "root");
  assert.equal(result.self, "[circular reference]");
});

test("normalizeOutput - detects a circular array reference", () => {
  const arr: unknown[] = [1, 2];
  arr.push(arr);
  const result = normalizeOutput(arr) as unknown[];
  assert.equal(result[0], 1);
  assert.equal(result[2], "[circular reference]");
});

test("normalizeOutput - same object appearing twice (not a cycle) is normalized both times", () => {
  const shared = { id: 1 };
  const result = normalizeOutput({ a: shared, b: shared }) as Record<string, unknown>;
  assert.deepEqual(result.a, { id: 1 });
  assert.deepEqual(result.b, { id: 1 });
});
