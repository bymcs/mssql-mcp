import { formatDisplayValue } from "./format.js";

type ColumnMetadata = Record<string, { type?: unknown; scale?: number }>;

function escapeCell(value: unknown, column?: { type?: unknown; scale?: number }): string {
  return formatDisplayValue(value, column)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\|/g, "\\|");
}

export function formatMarkdownTable(
  rows: Record<string, unknown>[],
  title?: string
): string {
  if (rows.length === 0) {
    return title ? `**${title}**\n\nNo results found.` : "No results found.";
  }
  const columns = ((rows as unknown as { columns?: ColumnMetadata }).columns) ?? undefined;
  const headers = Object.keys(rows[0]);
  const header = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${headers.map((h) => escapeCell(row[h], columns?.[h])).join(" | ")} |`)
    .join("\n");
  const table = [header, sep, body].join("\n");
  return title ? `**${title}**\n\n${table}` : table;
}

export function formatMarkdownList(obj: Record<string, unknown>, title?: string): string {
  const lines = Object.entries(obj).map(
    ([k, v]) => `- **${k}**: ${formatDisplayValue(v)}`
  );
  const list = lines.join("\n");
  return title ? `**${title}**\n\n${list}` : list;
}

export function formatMarkdownMultiRecordsets(
  recordsets: unknown[][],
  title?: string
): string {
  if (!recordsets || recordsets.length === 0) return "No result sets returned.";
  const parts = recordsets.map((rs, i) => {
    const rows = rs as Record<string, unknown>[];
    return formatMarkdownTable(rows, `Result Set ${i + 1}`);
  });
  const body = parts.join("\n\n");
  return title ? `**${title}**\n\n${body}` : body;
}
