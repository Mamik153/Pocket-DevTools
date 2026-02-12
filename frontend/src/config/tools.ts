export type ToolId =
  | "audioscribe"
  | "json-beautifier"
  | "json-to-toon"
  | "json-compare"
  | "prompt-improver"
  | "url-encoder-decoder"
  | "url-shortener"
  | "jwt-decode"
  | "uuid-generator"
  | "password-generator"
  | "base64"
  | "regex-tester"
  | "timestamp-converter";

export type ToolPath =
  | "/audioscribe"
  | "/json-beautifier"
  | "/json-to-toon"
  | "/json-compare"
  | "/prompt-improver"
  | "/url-encoder-decoder"
  | "/url-shortener"
  | "/jwt-decode"
  | "/uuid-generator"
  | "/password-generator"
  | "/base64"
  | "/regex-tester"
  | "/timestamp-converter";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  path: ToolPath;
  ctaLabel: string;
}

export const tools: ToolDefinition[] = [
  {
    id: "audioscribe",
    name: "Audioscribe",
    description: "Preview markdown and generate spoken audio with local TTS jobs.",
    path: "/audioscribe",
    ctaLabel: "Launch"
  },
  {
    id: "json-beautifier",
    name: "JSON Beautifier",
    description: "Format, validate, and minify JSON payloads in one place.",
    path: "/json-beautifier",
    ctaLabel: "Open"
  },
  {
    id: "json-to-toon",
    name: "JSON to TOON",
    description: "Convert JSON objects into a TOON-friendly key/value layout.",
    path: "/json-to-toon",
    ctaLabel: "Open"
  },
  {
    id: "json-compare",
    name: "JSON Compare",
    description: "Diff two JSON blobs and inspect mismatched fields quickly.",
    path: "/json-compare",
    ctaLabel: "Open"
  },
  {
    id: "prompt-improver",
    name: "Prompt Improver",
    description: "Refine rough prompts into clearer, structured instructions.",
    path: "/prompt-improver",
    ctaLabel: "Open"
  },
  {
    id: "url-encoder-decoder",
    name: "URL Encoder/Decoder",
    description: "Convert URL strings between encoded and decoded formats.",
    path: "/url-encoder-decoder",
    ctaLabel: "Open"
  },
  {
    id: "url-shortener",
    name: "URL Shortener",
    description: "Generate short codes for long URLs and keep a small local history.",
    path: "/url-shortener",
    ctaLabel: "Open"
  },
  {
    id: "jwt-decode",
    name: "JWT Decode",
    description: "Decode JWT headers and payload claims for quick inspection.",
    path: "/jwt-decode",
    ctaLabel: "Open"
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate single or batch UUIDs for testing and identifiers.",
    path: "/uuid-generator",
    ctaLabel: "Open"
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Generate strong passwords with toggles for symbols, numbers, and advanced rules.",
    path: "/password-generator",
    ctaLabel: "Open"
  },
  {
    id: "base64",
    name: "Base64 Encoder/Decoder",
    description: "Convert text to Base64 and decode Base64 back to UTF-8 text.",
    path: "/base64",
    ctaLabel: "Open"
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regex patterns with flags and inspect exact matches.",
    path: "/regex-tester",
    ctaLabel: "Open"
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between epoch values and local date-time strings.",
    path: "/timestamp-converter",
    ctaLabel: "Open"
  }
];
