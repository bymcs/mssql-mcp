import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  formatMarkdownTable,
  formatMarkdownList,
  formatMarkdownMultiRecordsets,
} from "../../src/utils/markdown.js";

test("formatMarkdownTable - renders header and rows", () => {
  const rows = [
    { name: "Users", schema: "dbo" },
    { name: "Orders", schema: "sales" },
  ];
  const result = formatMarkdownTable(rows);
  assert.ok(result.includes("| name | schema |"), "header row missing");
  assert.ok(result.includes("| --- |"), "separator row missing");
  assert.ok(result.includes("| Users | dbo |"), "data row 1 missing");
  assert.ok(result.includes("| Orders | sales |"), "data row 2 missing");
});

test("formatMarkdownTable - includes title when provided", () => {
  const rows = [{ id: 1 }];
  const result = formatMarkdownTable(rows, "My Table");
  assert.ok(result.startsWith("**My Table**"), "title missing");
});

test("formatMarkdownTable - empty rows returns no results message", () => {
  const result = formatMarkdownTable([]);
  assert.ok(result.includes("No results found."));
});

test("formatMarkdownTable - empty rows with title includes title", () => {
  const result = formatMarkdownTable([], "Empty");
  assert.ok(result.includes("**Empty**"));
  assert.ok(result.includes("No results found."));
});

test("formatMarkdownTable - null/undefined values render as empty string", () => {
  const rows = [{ id: 1, value: null, flag: undefined }];
  const result = formatMarkdownTable(rows);
  assert.ok(result.includes("| 1 |"));
});

test("formatMarkdownTable - pipe characters in cell values are escaped", () => {
  const rows = [{ name: "foo | bar", status: "ok" }];
  const result = formatMarkdownTable(rows);
  assert.ok(result.includes("foo \\| bar"), "pipe not escaped");
  assert.ok(!result.includes("foo | bar"), "raw pipe should not appear in data row");
});

test("formatMarkdownTable - newlines in cell values are replaced with space", () => {
  const rows = [{ notes: "line1\nline2", other: "x" }];
  const result = formatMarkdownTable(rows);
  assert.ok(result.includes("line1 line2"), "newline not replaced");
  assert.ok(!result.includes("line1\nline2"), "raw newline should not appear");
});

test("formatMarkdownTable - CRLF in cell values are replaced with space", () => {
  const rows = [{ notes: "line1\r\nline2" }];
  const result = formatMarkdownTable(rows);
  assert.ok(result.includes("line1 line2"));
});

test("formatMarkdownList - renders key-value pairs", () => {
  const result = formatMarkdownList({ status: "connected", server: "localhost" });
  assert.ok(result.includes("**status**: connected"));
  assert.ok(result.includes("**server**: localhost"));
});

test("formatMarkdownList - includes title when provided", () => {
  const result = formatMarkdownList({ x: 1 }, "Info");
  assert.ok(result.startsWith("**Info**"));
});

test("formatMarkdownMultiRecordsets - renders multiple result sets", () => {
  const rs1 = [{ id: 1 }];
  const rs2 = [{ name: "foo" }];
  const result = formatMarkdownMultiRecordsets([rs1, rs2]);
  assert.ok(result.includes("Result Set 1"));
  assert.ok(result.includes("Result Set 2"));
});

test("formatMarkdownMultiRecordsets - empty recordsets returns message", () => {
  const result = formatMarkdownMultiRecordsets([]);
  assert.ok(result.includes("No result sets returned."));
});
