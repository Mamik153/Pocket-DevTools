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
