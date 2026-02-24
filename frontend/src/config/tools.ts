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
  showOnHome?: boolean;
  /** SEO: unique, benefit-led meta description (≤155 chars). Falls back to description + suffix if omitted. */
  metaDescription?: string;
  /** SEO: extra keywords for this tool. Merged with defaults. */
  metaKeywords?: string[];
}

export const tools: ToolDefinition[] = [
  {
    id: "audioscribe",
    name: "Audioscribe",
    description: "Preview markdown and generate spoken audio with local TTS jobs.",
    path: "/audioscribe",
    ctaLabel: "Open",
    metaDescription: "Preview markdown and generate spoken audio with TTS in the browser. No uploads, local processing.",
    metaKeywords: ["markdown to speech", "text to speech", "tts", "markdown preview"],
  },
  {
    id: "json-beautifier",
    name: "JSON Beautifier",
    description: "Format, validate, and minify JSON payloads in one place.",
    path: "/json-beautifier",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription: "Format, validate, and minify JSON in the browser. Pretty-print or compact with one click.",
    metaKeywords: ["json formatter", "json validator", "json minify", "pretty print json"],
  },
  {
    id: "json-to-toon",
    name: "JSON to TOON",
    description: "Convert JSON objects into a TOON-friendly key/value layout.",
    path: "/json-to-toon",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription: "Convert JSON to TOON key/value layout. One-click transform for TOON integrations.",
    metaKeywords: ["json to toon", "toon format", "json convert"],
  },
  {
    id: "json-compare",
    name: "JSON Toolkit",
    description: "Compare, beautify, scaffold, and convert JSON with malformed-line debugging.",
    path: "/json-compare",
    ctaLabel: "Open",
    metaDescription: "Compare two JSON files, beautify, scaffold, and find malformed lines. Full JSON toolkit in one place.",
    metaKeywords: ["json diff", "json compare", "json beautifier", "json scaffold", "json validator"],
  },
  {
    id: "prompt-improver",
    name: "Prompt Improver",
    description: "Refine rough prompts into clearer, structured instructions.",
    path: "/prompt-improver",
    ctaLabel: "Open",
    metaDescription: "Refine AI prompts into clearer, structured instructions. Improve clarity and structure in seconds.",
    metaKeywords: ["prompt engineering", "ai prompt", "prompt improve", "llm prompt"],
  },
  {
    id: "url-encoder-decoder",
    name: "URL Encoder/Decoder",
    description: "Convert URL strings between encoded and decoded formats.",
    path: "/url-encoder-decoder",
    ctaLabel: "Open",
    metaDescription: "Encode and decode URL strings instantly. Handle special characters and query params safely.",
    metaKeywords: ["url encode", "url decode", "percent encoding", "url encoder"],
  },
  {
    id: "url-shortener",
    name: "URL Shortener",
    description: "Generate short codes for long URLs and keep a small local history.",
    path: "/url-shortener",
    ctaLabel: "Open",
    metaDescription: "Create short codes for long URLs. Local history, no account required.",
    metaKeywords: ["url shortener", "short url", "link shortener"],
  },
  {
    id: "jwt-decode",
    name: "JWT Decode",
    description: "Decode JWT headers and payload claims for quick inspection.",
    path: "/jwt-decode",
    ctaLabel: "Open",
    metaDescription: "Decode JWT headers and payload in the browser. Inspect claims and expiry. No server, no upload.",
    metaKeywords: ["jwt decoder", "jwt decode", "jwt debug", "jwt parser", "jwt payload"],
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate single or batch UUIDs for testing and identifiers.",
    path: "/uuid-generator",
    ctaLabel: "Open",
    metaDescription: "Generate UUIDs v4 in bulk. Copy one or many. Perfect for testing and unique IDs.",
    metaKeywords: ["uuid generator", "uuid v4", "generate uuid", "guid generator"],
  },
  {
    id: "password-generator",
    name: "Password Generator",
    description: "Generate strong passwords with toggles for symbols, numbers, and advanced rules.",
    path: "/password-generator",
    ctaLabel: "Open",
    metaDescription: "Generate strong passwords with length, symbols, numbers. Copy in one click. No data sent.",
    metaKeywords: ["password generator", "strong password", "random password", "secure password"],
  },
  {
    id: "base64",
    name: "Base64 Encoder/Decoder",
    description: "Convert text to Base64 and decode Base64 back to UTF-8 text.",
    path: "/base64",
    ctaLabel: "Open",
    metaDescription: "Encode text to Base64 and decode Base64 to UTF-8. Fast, client-side, no uploads.",
    metaKeywords: ["base64 encode", "base64 decode", "base64 encoder", "base64 decoder"],
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    description: "Test regex patterns with flags and inspect exact matches.",
    path: "/regex-tester",
    ctaLabel: "Open",
    metaDescription: "Test regex patterns live. Set flags, see matches and groups. Debug regular expressions in the browser.",
    metaKeywords: ["regex tester", "regex test", "regular expression", "regex debug"],
  },
  {
    id: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between epoch values and local date-time strings.",
    path: "/timestamp-converter",
    ctaLabel: "Open",
    metaDescription: "Convert Unix timestamps to dates and back. Epoch to human-readable, any timezone.",
    metaKeywords: ["timestamp converter", "epoch converter", "unix timestamp", "epoch to date"],
  },
];
