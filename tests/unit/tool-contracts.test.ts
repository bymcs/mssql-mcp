import { strict as assert } from "node:assert";
import { test } from "node:test";
import { toolSuccess, toolSuccessMarkdown } from "../../src/utils/errors.js";
import { buildPaginationMeta, clampLimit } from "../../src/utils/pagination.js";
import { formatJson, truncatePayload } from "../../src/utils/format.js";

function DateTime2() {}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function formatLocalDateTime(date: Date): string {
  return [
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`,
    `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}6938`,
  ].join(" ");
}

test("clampLimit - defaults to DEFAULT_PAGE_SIZE (20)", () => {
  assert.equal(clampLimit(undefined), 20);
});

test("clampLimit - enforces max (200)", () => {
  assert.equal(clampLimit(9999), 200);
  assert.equal(clampLimit(201), 200);
});

test("clampLimit - enforces min (1)", () => {
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(-5), 1);
});

test("clampLimit - passes through valid value", () => {
  assert.equal(clampLimit(50), 50);
  assert.equal(clampLimit(1), 1);
  assert.equal(clampLimit(200), 200);
});

test("buildPaginationMeta - has_more true when count === limit", () => {
  const p = buildPaginationMeta(20, 20, 0);
  assert.equal(p.has_more, true);
  assert.equal(p.next_offset, 20);
  assert.equal(p.offset, 0);
  assert.equal(p.count, 20);
  assert.equal(p.limit, 20);
});

test("buildPaginationMeta - has_more false when count < limit", () => {
  const p = buildPaginationMeta(5, 20, 0);
  assert.equal(p.has_more, false);
  assert.equal(p.next_offset, null);
});

test("buildPaginationMeta - includes total_count when provided", () => {
  const p = buildPaginationMeta(20, 20, 0, 100);
  assert.equal(p.total_count, 100);
});

test("buildPaginationMeta - next_offset uses offset correctly", () => {
  const p = buildPaginationMeta(20, 20, 40);
  assert.equal(p.next_offset, 60);
});

test("truncatePayload - no truncation for small data", () => {
  const data = [{ id: 1 }, { id: 2 }];
  const result = truncatePayload(data, 100_000);
  assert.equal(result.truncated, false);
  assert.equal(result.data.length, 2);
  assert.equal(result.truncation_message, undefined);
});

test("truncatePayload - truncates when over byte limit", () => {
  const largeRow = { data: "x".repeat(1000) };
  const rows = Array.from({ length: 200 }, (_, i) => ({ ...largeRow, id: i }));
  const result = truncatePayload(rows, 10_000);
  assert.equal(result.truncated, true);
  assert.ok(result.data.length < 200, `Expected < 200 rows, got ${result.data.length}`);
  assert.ok(result.truncation_message?.includes("truncated"));
  assert.ok(result.truncation_message?.includes("200"));
});

test("truncatePayload - empty array not truncated", () => {
  const result = truncatePayload([], 100_000);
  assert.equal(result.truncated, false);
  assert.equal(result.data.length, 0);
});

test("formatJson - recordset datetime values use SQL-like formatting", () => {
  const serverTime = new Date(2026, 3, 1, 10, 51, 23, 600);
  Object.defineProperty(serverTime, "nanosecondsDelta", { value: 0.0006938 });
  const rows = Object.assign([{ server_time: serverTime }], {
    columns: { server_time: { type: DateTime2, scale: 7 } },
  }) as Record<string, unknown>[] & {
    columns: Record<string, { type?: unknown; scale?: number }>;
  };

  const result = formatJson({ recordset: rows });

  assert.ok(result.includes(formatLocalDateTime(serverTime)));
  assert.ok(!result.includes("GMT"));
  assert.ok(!result.includes("T10:51:23"));
});

test("toolSuccessMarkdown - returns text content without structuredContent", () => {
  const result = toolSuccessMarkdown("| col |\n| --- |\n| value |") as {
    content: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  };

  assert.equal(result.content[0].type, "text");
  assert.ok(result.content[0].text.includes("| col |"));
  assert.equal(result.structuredContent, undefined);
});

test("toolSuccess - keeps structuredContent for json-style responses", () => {
  const result = toolSuccess("{\n  \"ok\": true\n}", { ok: true }) as {
    content: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  };

  assert.equal(result.content[0].type, "text");
  assert.equal(result.structuredContent?.ok, true);
});
