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
