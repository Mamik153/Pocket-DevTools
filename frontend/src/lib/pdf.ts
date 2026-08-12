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

/** Trigger a browser download. The object URL is revoked so the blob can be freed. */
export const downloadBytes = (bytes: Uint8Array, filename: string): void => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export interface RenderedPage {
  pageNumber: number;
  blob: Blob;
  url: string;
}

export interface RenderOptions {
  dpi: number;
  format: "png" | "jpeg";
  /** JPEG only, 0–1. Ignored for PNG. */
  quality: number;
  onProgress?: (done: number, total: number) => void;
}

/** Render every page to an image. Uses pdf.js, which does its work in a worker. */
export const renderPdfToImages = async (
  bytes: Uint8Array,
  { dpi, format, quality, onProgress }: RenderOptions,
): Promise<RenderedPage[]> => {
  const pdfjs = await import("pdfjs-dist");
  // Vite resolves this to a hashed worker asset at build time.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  // pdf.js takes ownership of the buffer, so hand it a copy.
  const loadingTask = pdfjs.getDocument({ data: bytes.slice() });
  const scale = dpiToScale(dpi);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const pages: RenderedPage[] = [];

  try {
    // Awaiting loadingTask.promise inside the try means a rejection here (e.g.
    // a locked PDF throwing PasswordException) still runs the finally below,
    // instead of leaking the PDFWorker that getDocument() spins up synchronously.
    const doc = await loadingTask.promise;
    try {
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        // pdf.js v6: `canvas` is the required parameter and `canvasContext` is the
        // legacy one. Passing both is ambiguous — the type docs state that if the
        // context is used, `canvas` must be null. Pass the canvas alone.
        await page.render({ canvas, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error("Could not encode the page."))),
            mimeType,
            format === "jpeg" ? quality : undefined,
          );
        });

        pages.push({ pageNumber, blob, url: URL.createObjectURL(blob) });
        page.cleanup();
        // Zero the canvas so a long document does not accumulate memory.
        canvas.width = 0;
        canvas.height = 0;
        onProgress?.(pageNumber, doc.numPages);
      }
    } catch (error) {
      // A page failing partway through (e.g. page 5 of 10) leaves earlier
      // pages' object URLs live with no reference left to revoke them. Revoke
      // what was already created before propagating the failure.
      pages.forEach((page) => URL.revokeObjectURL(page.url));
      throw error;
    }
  } finally {
    // PDFDocumentProxy has no destroy() of its own; only the loading task does.
    await loadingTask.destroy();
  }

  return pages;
};

/** Store-only ZIP. The images are already compressed, so deflate would only cost time. */
export const zipFiles = async (
  entries: Array<{ name: string; blob: Blob }>,
): Promise<Uint8Array> => {
  const { zipSync } = await import("fflate");
  const payload: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const entry of entries) {
    payload[entry.name] = [new Uint8Array(await entry.blob.arrayBuffer()), { level: 0 }];
  }
  return zipSync(payload);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
