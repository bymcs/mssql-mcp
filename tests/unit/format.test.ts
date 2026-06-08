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
