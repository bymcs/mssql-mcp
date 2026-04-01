import { MAX_TEXT_PAYLOAD_BYTES } from "../constants.js";

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function truncatePayload(
  data: unknown[],
  maxBytes: number = MAX_TEXT_PAYLOAD_BYTES
): { data: unknown[]; truncated: boolean; truncation_message?: string } {
  const full = JSON.stringify(data);
  if (Buffer.byteLength(full, "utf8") <= maxBytes) {
    return { data, truncated: false };
  }

  // Binary search for safe row count
  let lo = 0;
  let hi = data.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (Buffer.byteLength(JSON.stringify(data.slice(0, mid)), "utf8") <= maxBytes) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return {
    data: data.slice(0, lo),
    truncated: true,
    truncation_message: `Result truncated to ${lo} of ${data.length} rows to stay within ${maxBytes} byte limit.`,
  };
}
