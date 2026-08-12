/**
 * Shared PDF logic. Every heavy library (@cantoo/pdf-lib, pdfjs-dist, fflate) is
 * loaded through a dynamic import inside this module so it stays out of the
 * initial bundle. Nothing here performs network I/O — all work is local.
 */

/** A PDF must start with "%PDF-". Extension and MIME type are attacker-controlled. */
export const isPdfBytes = (bytes: Uint8Array): boolean => {
  const header = "%PDF-";
  if (bytes.length < header.length) return false;
  for (let index = 0; index < header.length; index += 1) {
    if (bytes[index] !== header.charCodeAt(index)) return false;
  }
  return true;
};

/** Move one item within a list, returning a new array. `to` is clamped into range. */
export const moveItem = <T,>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.min(Math.max(to, 0), next.length - 1);
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};

/** pdf.js viewport scale. A PDF user space unit is 1/72 inch, so 72 DPI is 1x. */
export const dpiToScale = (dpi: number): number => dpi / 72;

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Compression can make a file bigger — object streams add overhead that a small
 * document never recovers. Measured: an 878-byte PDF saved back at 884 bytes.
 * Never hand the user a larger file labelled "compressed".
 */
export const pickSmaller = (
  original: Uint8Array,
  candidate: Uint8Array,
): { bytes: Uint8Array; saved: number } =>
  candidate.length < original.length
    ? { bytes: candidate, saved: original.length - candidate.length }
    : { bytes: original, saved: 0 };

export type PdfLib = typeof import("@cantoo/pdf-lib");

let pdfLibPromise: Promise<PdfLib> | null = null;

/** Load @cantoo/pdf-lib once, lazily. Keeps ~1MB out of the initial bundle. */
export const loadPdfLib = (): Promise<PdfLib> => {
  pdfLibPromise ??= import("@cantoo/pdf-lib");
  return pdfLibPromise;
};

export interface PdfInfo {
  pageCount: number;
  isEncrypted: boolean;
}

/** Read page count and encryption status without needing a password. */
export const inspectPdf = async (bytes: Uint8Array): Promise<PdfInfo> => {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { pageCount: doc.getPageCount(), isEncrypted: doc.isEncrypted };
};

/** Concatenate PDFs in the order given. Progress fires once per input file. */
export const mergePdfs = async (
  files: readonly Uint8Array[],
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> => {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let index = 0; index < files.length; index += 1) {
    const source = await PDFDocument.load(files[index]);
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((page) => out.addPage(page));
    onProgress?.(index + 1, files.length);
  }
  // ponytail: objectsPerTick yields to the event loop, which is enough for
  // ordinary files but still runs on the main thread. Move save() into a Web
  // Worker if merging very large PDFs measurably janks the UI.
  return out.save({ useObjectStreams: true, objectsPerTick: 200 });
};

/** True if the bytes still refuse a plain, optionless load. */
const isStillEncrypted = async (bytes: Uint8Array): Promise<boolean> => {
  const { PDFDocument } = await loadPdfLib();
  try {
    await PDFDocument.load(bytes);
    return false;
  } catch {
    return true;
  }
};

/**
 * Decrypt and return an unencrypted copy.
 *
 * Loading with the right password and calling save() is NOT enough: the original
 * encryption dictionary survives as an orphaned indirect object, and the output
 * reloads as encrypted. Verified experimentally against generated fixtures.
 *
 * Tier 1 deletes that dictionary, preserving the object graph so outlines,
 * bookmarks, form fields — and any pre-existing malformed-but-referenced objects
 * from older generators — survive untouched. Tier 2 rebuilds page-by-page, which
 * always clears encryption but drops those structures — hence `rebuilt`, which
 * the UI surfaces.
 */
export const decryptPdf = async (
  bytes: Uint8Array,
  password: string,
): Promise<{ bytes: Uint8Array; rebuilt: boolean }> => {
  const { PDFDocument, PDFDict, PDFName } = await loadPdfLib();

  // Throws on a wrong password — callers surface that as an inline field error.
  const doc = await PDFDocument.load(bytes, { password });

  doc.context.trailerInfo.Encrypt = undefined;
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const isEncryptionDict =
      object instanceof PDFDict && object.get(PDFName.of("Filter")) === PDFName.of("Standard");
    if (isEncryptionDict) {
      doc.context.delete(ref);
    }
  }

  const stripped = await doc.save({ useObjectStreams: true, objectsPerTick: 200 });
  if (!(await isStillEncrypted(stripped))) return { bytes: stripped, rebuilt: false };

  const reloaded = await PDFDocument.load(bytes, { password });
  return { bytes: await mergePdfsFromDocument(reloaded), rebuilt: true };
};

/** Page-level rebuild. Shared by the decrypt fallback. */
const mergePdfsFromDocument = async (
  source: Awaited<ReturnType<PdfLib["PDFDocument"]["load"]>>,
): Promise<Uint8Array> => {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, source.getPageIndices());
  pages.forEach((page) => out.addPage(page));
  return out.save({ useObjectStreams: true, objectsPerTick: 200 });
};

/**
 * Lossless pass: drop orphaned objects and incremental-update history, then
 * recompress. Text, links and searchability all survive. Often saves nothing.
 */
export const compressLossless = async (
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; saved: number }> => {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const candidate = await doc.save({
    useObjectStreams: true,
    rewrite: true,
    objectsPerTick: 200,
  });
  return pickSmaller(bytes, candidate);
};
