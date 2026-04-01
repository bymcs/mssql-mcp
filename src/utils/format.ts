import { MAX_TEXT_PAYLOAD_BYTES } from "../constants.js";

type ColumnMetadata = Record<string, { type?: unknown; scale?: number }>;
type DateWithPrecision = Date & { nanosecondsDelta?: unknown; nanosecondDelta?: unknown };

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function getRecordsetColumns(value: unknown): ColumnMetadata | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const columns = (value as { columns?: unknown }).columns;
  if (!columns || typeof columns !== "object" || Array.isArray(columns)) {
    return undefined;
  }

  return columns as ColumnMetadata;
}

function getTypeName(column: { type?: unknown; scale?: number } | undefined): string | undefined {
  const type = column?.type;
  if (typeof type === "function") {
    return type.name || undefined;
  }
  if (type && typeof type === "object" && "name" in type) {
    const name = (type as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function getExtraFraction(date: DateWithPrecision): number {
  const raw = typeof date.nanosecondsDelta === "number"
    ? date.nanosecondsDelta
    : typeof date.nanosecondDelta === "number"
      ? date.nanosecondDelta
      : 0;

  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.min(9999, Math.round(raw * 10_000_000)));
}

function buildFraction(date: DateWithPrecision, milliseconds: number, scale?: number): string {
  const base = `${pad(milliseconds, 3)}${pad(getExtraFraction(date), 4)}`;
  const safeScale = scale === undefined ? undefined : Math.max(0, Math.min(7, scale));

  if (safeScale === 0) {
    return "";
  }

  if (safeScale !== undefined) {
    return base.slice(0, safeScale);
  }

  return base.replace(/0+$/, "");
}

function formatDateParts(date: Date, useUtcClock: boolean) {
  return {
    year: useUtcClock ? date.getUTCFullYear() : date.getFullYear(),
    month: (useUtcClock ? date.getUTCMonth() : date.getMonth()) + 1,
    day: useUtcClock ? date.getUTCDate() : date.getDate(),
    hours: useUtcClock ? date.getUTCHours() : date.getHours(),
    minutes: useUtcClock ? date.getUTCMinutes() : date.getMinutes(),
    seconds: useUtcClock ? date.getUTCSeconds() : date.getSeconds(),
    milliseconds: useUtcClock ? date.getUTCMilliseconds() : date.getMilliseconds(),
  };
}

function formatDateValue(date: Date, column?: { type?: unknown; scale?: number }): string {
  const typeName = getTypeName(column)?.toLowerCase();
  const useUtcClock = typeName === "datetimeoffset";
  const parts = formatDateParts(date, useUtcClock);
  const fraction = buildFraction(date as DateWithPrecision, parts.milliseconds, column?.scale);
  const dateText = `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}`;
  const timeText = `${pad(parts.hours, 2)}:${pad(parts.minutes, 2)}:${pad(parts.seconds, 2)}`;

  if (typeName === "date") {
    return dateText;
  }

  if (typeName === "time") {
    return fraction ? `${timeText}.${fraction}` : timeText;
  }

  return fraction ? `${dateText} ${timeText}.${fraction}` : `${dateText} ${timeText}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && !Buffer.isBuffer(value)
    && !(value instanceof Date);
}

function normalizeRecordRow(
  row: Record<string, unknown>,
  columns: ColumnMetadata
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, normalizeOutput(value, columns[key])])
  );
}

export function formatJson(data: unknown): string {
  return JSON.stringify(normalizeOutput(data), null, 2);
}

export function formatDisplayValue(value: unknown, column?: { type?: unknown; scale?: number }): string {
  const normalized = normalizeOutput(value, column);
  if (normalized == null) {
    return "";
  }
  if (typeof normalized === "object") {
    return JSON.stringify(normalized);
  }
  return String(normalized);
}

export function normalizeOutput(
  value: unknown,
  column?: { type?: unknown; scale?: number }
): unknown {
  if (value instanceof Date) {
    return formatDateValue(value, column);
  }

  const columns = getRecordsetColumns(value);
  if (Array.isArray(value)) {
    if (columns) {
      return value.map((row) => isPlainObject(row) ? normalizeRecordRow(row, columns) : normalizeOutput(row));
    }
    return value.map((entry) => normalizeOutput(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeOutput(entry)])
    );
  }

  return value;
}

export function truncatePayload(
  data: unknown[],
  maxBytes: number = MAX_TEXT_PAYLOAD_BYTES
): { data: unknown[]; truncated: boolean; truncation_message?: string } {
  const normalizedData = normalizeOutput(data) as unknown[];
  const full = JSON.stringify(normalizedData);
  if (Buffer.byteLength(full, "utf8") <= maxBytes) {
    return { data: normalizedData, truncated: false };
  }

  // Binary search for safe row count
  let lo = 0;
  let hi = normalizedData.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (Buffer.byteLength(JSON.stringify(normalizedData.slice(0, mid)), "utf8") <= maxBytes) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return {
    data: normalizedData.slice(0, lo),
    truncated: true,
    truncation_message: `Result truncated to ${lo} of ${normalizedData.length} rows to stay within ${maxBytes} byte limit.`,
  };
}
