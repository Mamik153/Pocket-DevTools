import type { JsonParseIssue } from "@/types/jsonToolkit";

export type JsonValidationResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      issue: JsonParseIssue;
    };

interface ParsedLocation {
  line: number;
  column: number;
  offset: number;
}

const POSITION_REGEX = /position\s+(\d+)/i;
const LINE_COLUMN_REGEX = /line\s+(\d+)\s+column\s+(\d+)/i;

function sanitizeMessage(message: string): string {
  return message.replace(/\s+at\s+position\s+\d+/i, "").trim();
}

function getLineColumnFromOffset(input: string, offset: number): ParsedLocation {
  if (offset < 0) {
    return { line: 1, column: 1, offset: 0 };
  }

  const normalizedOffset = Math.min(offset, input.length);
  let line = 1;
  let column = 1;

  for (let index = 0; index < normalizedOffset; index += 1) {
    const char = input[index];
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column, offset: normalizedOffset };
}

function getOffsetFromLineColumn(input: string, line: number, column: number): number {
  const normalizedLine = Math.max(1, line);
  const normalizedColumn = Math.max(1, column);
  let currentLine = 1;
  let currentColumn = 1;

  for (let index = 0; index < input.length; index += 1) {
    if (currentLine === normalizedLine && currentColumn === normalizedColumn) {
      return index;
    }

    if (input[index] === "\n") {
      currentLine += 1;
      currentColumn = 1;
    } else {
      currentColumn += 1;
    }
  }

  return input.length;
}

function parseIssueLocation(input: string, message: string): ParsedLocation {
  const positionMatch = message.match(POSITION_REGEX);
  if (positionMatch) {
    const parsedOffset = Number(positionMatch[1]);
    if (Number.isFinite(parsedOffset)) {
      return getLineColumnFromOffset(input, parsedOffset);
    }
  }

  const lineColumnMatch = message.match(LINE_COLUMN_REGEX);
  if (lineColumnMatch) {
    const parsedLine = Number(lineColumnMatch[1]);
    const parsedColumn = Number(lineColumnMatch[2]);
    if (Number.isFinite(parsedLine) && Number.isFinite(parsedColumn)) {
      return {
        line: Math.max(1, parsedLine),
        column: Math.max(1, parsedColumn),
        offset: getOffsetFromLineColumn(input, parsedLine, parsedColumn),
      };
    }
  }

  return { line: 1, column: 1, offset: 0 };
}

function createParseIssue(input: string, message: string): JsonParseIssue {
  const location = parseIssueLocation(input, message);

  return {
    line: location.line,
    column: location.column,
    offset: location.offset,
    message: sanitizeMessage(message),
  };
}

export function validateJson(input: string): JsonValidationResult {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON input.";
    return {
      ok: false,
      issue: createParseIssue(input, message),
    };
  }
}

export function beautifyJson(input: string, spacing = 2): JsonValidationResult & { output?: string } {
  const validation = validateJson(input);
  if (!validation.ok) {
    return validation;
  }

  return {
    ...validation,
    output: JSON.stringify(validation.value, null, spacing),
  };
}

export function minifyJson(input: string): JsonValidationResult & { output?: string } {
  const validation = validateJson(input);
  if (!validation.ok) {
    return validation;
  }

  return {
    ...validation,
    output: JSON.stringify(validation.value),
  };
}
