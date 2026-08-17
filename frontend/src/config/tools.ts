export type ToolId =
  | "markdown-to-pdf"
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
  | "timestamp-converter"
  | "pdf-toolkit"
  | "downloader"
  | "image-converter"
  | "image-to-jpeg"
  | "image-to-png"
  | "image-to-webp"
  | "image-to-ico"
  | "docx-converter"
  | "docx-to-pdf"
  | "docx-to-markdown";

export type ToolPath =
  | "/markdown-to-pdf"
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
  | "/timestamp-converter"
  | "/pdf-toolkit"
  | "/downloader"
  | "/image-converter"
  | "/image-converter/to-jpeg"
  | "/image-converter/to-png"
  | "/image-converter/to-webp"
  | "/image-converter/to-ico"
  | "/docx-converter"
  | "/docx-converter/to-pdf"
  | "/docx-converter/to-markdown";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  path: ToolPath;
  ctaLabel: string;
  showOnHome?: boolean;
  /** Sitemap weight. Defaults to 0.8 when omitted. */
  sitemapPriority?: string;
  /** SEO: unique, benefit-led meta description (≤155 chars). Falls back to description + suffix if omitted. */
  metaDescription?: string;
  /** SEO: extra keywords for this tool. Merged with defaults. */
  metaKeywords?: string[];
}

export const tools: ToolDefinition[] = [
  {
    id: "markdown-to-pdf",
    sitemapPriority: "0.9",
    name: "Markdown to PDF",
    description: "Write markdown, preview it live, and export a print-ready PDF.",
    path: "/markdown-to-pdf",
    ctaLabel: "Open",
    metaDescription: "Convert markdown to PDF in the browser. Live preview, real fonts, wrapped code, visible table borders. No uploads.",
    metaKeywords: ["markdown to pdf", "md to pdf", "markdown preview", "markdown converter", "export markdown"],
  },
  {
    id: "pdf-toolkit",
    sitemapPriority: "0.9",
    name: "PDF Toolkit",
    description: "Merge, unlock, compress, and convert PDFs to images without uploading a file.",
    path: "/pdf-toolkit",
    ctaLabel: "Open",
    metaDescription: "Merge, unlock, compress PDFs and convert them to images in your browser. Nothing is uploaded.",
    metaKeywords: ["merge pdf", "unlock pdf", "compress pdf", "pdf to image", "pdf tools", "remove pdf password"],
  },
  {
    id: "downloader",
    name: "Downloader",
    description: "Grab a public video, track, or gallery from a link. A self-hosted fork of cobalt.",
    path: "/downloader",
    ctaLabel: "Open",
    // Hidden until a cobalt instance is deployed. Without COBALT_API_URL the
    // route answers 503, so advertising it on the home page just offers a
    // broken tool. Flip back to true once the instance is live.
    showOnHome: false,
    metaDescription:
      "Download public videos, audio, and galleries from a link. Self-hosted fork of cobalt, no ads and no tracking.",
    metaKeywords: [
      "video downloader",
      "media downloader",
      "cobalt",
      "cobalt fork",
      "download video",
      "download audio",
    ],
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
    sitemapPriority: "0.85",
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
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert images between JPEG, PNG, WebP and ICO without uploading a file.",
    path: "/image-converter",
    ctaLabel: "Open",
    sitemapPriority: "0.9",
    metaDescription:
      "Convert images between JPEG, PNG, WebP and ICO in your browser. Batch convert, resize, and build multi-size favicons. Nothing is uploaded.",
    metaKeywords: ["image converter", "png to jpg", "webp converter", "png to ico", "favicon generator"],
  },
  {
    id: "image-to-jpeg",
    name: "Convert Image to JPEG",
    description: "Turn PNG, WebP, AVIF, GIF, BMP or SVG images into JPEG.",
    path: "/image-converter/to-jpeg",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Convert PNG, WebP, AVIF, GIF, BMP and SVG to JPEG in your browser. Batch convert with quality and resize controls. No uploads.",
    metaKeywords: ["png to jpg", "webp to jpg", "convert to jpeg", "image to jpg"],
  },
  {
    id: "image-to-png",
    name: "Convert Image to PNG",
    description: "Turn JPEG, WebP, AVIF, GIF, BMP or SVG images into PNG.",
    path: "/image-converter/to-png",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Convert JPEG, WebP, AVIF, GIF, BMP and SVG to PNG in your browser. Keeps transparency. Batch convert with no uploads.",
    metaKeywords: ["jpg to png", "webp to png", "convert to png", "svg to png", "image to png"],
  },
  {
    id: "image-to-webp",
    name: "Convert Image to WebP",
    description: "Turn JPEG, PNG, AVIF, GIF, BMP or SVG images into WebP.",
    path: "/image-converter/to-webp",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Convert JPEG, PNG, AVIF, GIF, BMP and SVG to WebP in your browser. Smaller files for the web, with quality and resize controls.",
    metaKeywords: ["png to webp", "jpg to webp", "convert to webp", "webp converter"],
  },
  {
    id: "image-to-ico",
    name: "Convert Image to ICO",
    description: "Build a multi-size favicon.ico from any image.",
    path: "/image-converter/to-ico",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Build a multi-size favicon.ico from PNG, JPEG, WebP or SVG in your browser. Pick 16, 32, 48, 64, 128 and 256px. No uploads.",
    metaKeywords: ["png to ico", "favicon generator", "make favicon", "ico converter", "svg to ico"],
  },
  {
    id: "docx-converter",
    name: "DOCX Converter",
    description: "Convert Word documents to PDF or Markdown without uploading a file.",
    path: "/docx-converter",
    ctaLabel: "Open",
    sitemapPriority: "0.9",
    metaDescription:
      "Convert Word .docx files to PDF or Markdown in your browser. Keeps layout for PDF, structure for Markdown. Nothing is uploaded.",
    metaKeywords: ["docx to pdf", "word to pdf", "docx to markdown", "word to markdown", "docx converter"],
  },
  {
    id: "docx-to-pdf",
    name: "Convert DOCX to PDF",
    description: "Turn a Word document into a PDF, keeping its fonts, margins and page breaks.",
    path: "/docx-converter/to-pdf",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Convert Word .docx to PDF in your browser, keeping the document's own fonts, margins and page breaks. No uploads.",
    metaKeywords: ["docx to pdf", "word to pdf", "convert word to pdf", "doc to pdf"],
  },
  {
    id: "docx-to-markdown",
    name: "Convert DOCX to Markdown",
    description: "Turn a Word document into structured Markdown, images included.",
    path: "/docx-converter/to-markdown",
    ctaLabel: "Open",
    showOnHome: false,
    metaDescription:
      "Convert Word .docx to Markdown in your browser. Headings, tables and lists preserved, images exported alongside. No uploads.",
    metaKeywords: ["docx to markdown", "word to markdown", "docx to md", "convert word to markdown"],
  },
];
