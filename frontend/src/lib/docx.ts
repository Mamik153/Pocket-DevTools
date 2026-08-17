/**
 * Word document conversion. Everything here runs in the browser; no bytes leave
 * the tab. Heavy libraries are loaded through dynamic import so they stay out
 * of the initial bundle, the same way lib/pdf.ts defers pdf-lib and fflate.
 */

export type DocKind = "docx" | "legacy-doc" | "other-zip" | "unknown";

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);

/** OLE2 compound file: a legacy .doc, and also an encrypted .docx. */
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** Local file header of any zip. .docx, .xlsx, .pptx and .jar all match. */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

const DOCUMENT_PART = "word/document.xml";

/**
 * Identify a file by its header. A zip header alone is not enough — .xlsx and
 * .pptx are zips too — so a zip is opened far enough to confirm it carries the
 * Word main document part.
 */
export const sniffDocKind = async (bytes: Uint8Array): Promise<DocKind> => {
  if (startsWith(bytes, OLE_MAGIC)) return "legacy-doc";
  if (!startsWith(bytes, ZIP_MAGIC)) return "unknown";

  const { unzipSync } = await import("fflate");
  try {
    // The filter decompresses only the one part we care about, not the whole
    // document, which for a large .docx is the difference that matters.
    const entries = unzipSync(bytes, { filter: (file) => file.name === DOCUMENT_PART });
    return DOCUMENT_PART in entries ? "docx" : "other-zip";
  } catch {
    // A truncated or damaged archive is still not a Word document.
    return "other-zip";
  }
};

export const isDocxBytes = async (bytes: Uint8Array): Promise<boolean> =>
  (await sniffDocKind(bytes)) === "docx";

/** Rejection copy. Each case tells the user what to actually do next. */
export const docKindMessage = (kind: DocKind): string => {
  switch (kind) {
    case "legacy-doc":
      return "Word 97-2003 .doc, or a password-protected .docx, is not supported. Open it in Word or Google Docs and Save As .docx.";
    case "other-zip":
      return "This looks like a spreadsheet or presentation, not a Word document.";
    case "unknown":
      return "This is not a Word document.";
    case "docx":
      return "";
  }
};

export interface DocxImage {
  /** Path used in the Markdown link and as the ZIP entry name. */
  name: string;
  bytes: Uint8Array;
}

export interface MarkdownResult {
  markdown: string;
  images: DocxImage[];
  /** mammoth's notes about anything it could not map. Shown, not swallowed. */
  warnings: string[];
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-emf": "emf",
  "image/x-wmf": "wmf",
};

/** Falls back to bin rather than inventing an extension from an unknown type. */
const extensionFor = (contentType: string): string =>
  EXTENSION_BY_TYPE[contentType.toLowerCase()] ?? "bin";

/**
 * Convert a .docx to Markdown.
 *
 * mammoth deliberately produces "simple HTML" — it maps Word styles onto plain
 * semantic elements and drops the rest. That is the right input for Markdown,
 * which cannot express fonts or colours anyway. Visual fidelity is the PDF
 * path's job, and it uses a different library for exactly that reason.
 *
 * Images are rewritten to images/image-N.<ext> as mammoth emits them, so no
 * post-processing pass over the HTML is needed.
 */
export const docxToMarkdown = async (bytes: Uint8Array): Promise<MarkdownResult> => {
  const kind = await sniffDocKind(bytes);
  if (kind !== "docx") throw new Error(docKindMessage(kind));

  const [{ default: mammoth }, { default: TurndownService }, { gfm }] = await Promise.all([
    import("mammoth"),
    import("turndown"),
    import("turndown-plugin-gfm"),
  ]);

  const images: DocxImage[] = [];
  const convertImage = mammoth.images.imgElement(async (image) => {
    const buffer = await image.readAsArrayBuffer();
    const name = `images/image-${images.length + 1}.${extensionFor(image.contentType)}`;
    images.push({ name, bytes: new Uint8Array(buffer) });
    return { src: name };
  });

  // Copy into a fresh buffer: a Uint8Array view may sit inside a larger
  // ArrayBuffer, and mammoth would then read the whole thing.
  const arrayBuffer = new Uint8Array(bytes).buffer;
  const { value: html, messages } = await mammoth.convertToHtml({ arrayBuffer }, { convertImage });

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  // Without the GFM plugin, turndown flattens tables into unreadable inline text.
  turndown.use(gfm);

  return {
    markdown: turndown.turndown(html),
    images,
    warnings: messages.filter((m) => m.type === "warning").map((m) => m.message),
  };
};
