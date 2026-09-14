import { normalizeOutput } from "./format.js";

export class McpToolError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "McpToolError";
  }
}

export function toActionableError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const MAX_FATAL_STACK_LINES = 20;

// For logging a process-fatal error (uncaughtException/unhandledRejection):
// prints the message plus a bounded number of stack lines instead of the raw
// Error object, so a pathologically deep call stack can't make the shutdown
// path itself slow. See https://github.com/BYMCS/mssql-mcp/issues/5.
export function formatFatalError(error: unknown): string {
  if (error instanceof Error) {
    if (!error.stack) return error.message;
    const lines = error.stack.split("\n").slice(0, MAX_FATAL_STACK_LINES);
    return lines.join("\n");
  }
  return String(error);
}

export function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: `❌ ${message}` }],
    isError: true as const,
  };
}

export function toolSuccessMarkdown(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function toolSuccess(text: string, structuredContent?: Record<string, unknown>) {
  const result: {
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: Record<string, unknown>;
  } = {
    content: [{ type: "text" as const, text }],
  };
  if (structuredContent !== undefined) {
    result.structuredContent = normalizeOutput(structuredContent) as Record<string, unknown>;
  }
  return result;
}
