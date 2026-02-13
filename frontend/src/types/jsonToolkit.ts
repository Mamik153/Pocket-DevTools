export type JsonToolkitMode = "compare" | "beautify" | "toon" | "scaffold";

export interface JsonParseIssue {
  line: number;
  column: number;
  offset: number;
  message: string;
}
