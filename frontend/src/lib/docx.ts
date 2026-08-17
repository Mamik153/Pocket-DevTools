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
