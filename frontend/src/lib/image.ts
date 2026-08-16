/** Image formats we can decode. SVG is vector; everything else is raster. */
export type ImageFormat = "jpeg" | "png" | "gif" | "bmp" | "webp" | "avif" | "svg";

export const startsWith = (
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

const FTYP = [0x66, 0x74, 0x79, 0x70]; // "ftyp", at offset 4 of an ISO-BMFF box
const AVIF_BRANDS = [
  [0x61, 0x76, 0x69, 0x66], // "avif"
  [0x61, 0x76, 0x69, 0x73], // "avis", an image sequence
];

const isAvif = (bytes: Uint8Array): boolean =>
  startsWith(bytes, FTYP, 4) && AVIF_BRANDS.some((brand) => startsWith(bytes, brand, 8));

/** Enough to clear any prolog and doctype without decoding a whole file. */
const SVG_PROBE_BYTES = 1024;

/**
 * SVG is text, so there are no magic bytes to match. Accept only a document
 * whose ROOT element is <svg> — either directly, or after an XML prolog and
 * doctype. HTML that merely embeds an <svg> somewhere is not an SVG file, and
 * treating it as one would hand a hostile document to the renderer.
 */
const looksLikeSvg = (bytes: Uint8Array): boolean => {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, SVG_PROBE_BYTES))
    .replace(/^﻿/, "")
    .trimStart();

  if (head.startsWith("<svg")) return /^<svg[\s>/]/.test(head);
  if (!head.startsWith("<?xml")) return false;

  // Past the prolog, find the first real element. "<?" and "<!" are the
  // prolog and doctype, so only "<" followed by a letter counts.
  const firstElement = /<([a-zA-Z][^\s>/]*)/.exec(head);
  return firstElement?.[1].toLowerCase() === "svg";
};

/**
 * Sniff an image by its header. Extension and MIME type are user-controlled;
 * only the bytes are evidence.
 */
export const sniffImageFormat = (bytes: Uint8Array): ImageFormat | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (startsWith(bytes, [0x42, 0x4d])) return "bmp";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "webp";
  if (isAvif(bytes)) return "avif";
  if (looksLikeSvg(bytes)) return "svg";
  return null;
};

/**
 * What imagesToPdf can handle: pdf-lib embeds JPEG and PNG directly, and
 * everything else is rasterised through createImageBitmap — which rejects SVG.
 */
export const isEmbeddableImage = (bytes: Uint8Array): boolean => {
  const format = sniffImageFormat(bytes);
  return format !== null && format !== "svg";
};

/** What the converter can handle: everything, SVG included. */
export const isConvertibleImage = (bytes: Uint8Array): boolean =>
  sniffImageFormat(bytes) !== null;

/** What the converter can produce. */
export type ConvertTarget = "jpeg" | "png" | "webp" | "ico";

export const EXTENSION: Record<ConvertTarget, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  ico: "ico",
};

/**
 * Scale down to fit inside the given bounds, preserving aspect ratio.
 * Never upscales — enlarging a small source just makes a bigger blurry file.
 * A null or zero bound means "unconstrained on that axis".
 */
export const fitWithin = (
  width: number,
  height: number,
  maxWidth: number | null,
  maxHeight: number | null,
): { width: number; height: number } => {
  const scaleWidth = maxWidth && maxWidth > 0 ? maxWidth / width : 1;
  const scaleHeight = maxHeight && maxHeight > 0 ? maxHeight / height : 1;
  const scale = Math.min(1, scaleWidth, scaleHeight);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Centre an image inside a box, preserving aspect ratio and leaving bars on
 * the short axis. Unlike fitWithin this DOES upscale: an ICO entry has to fill
 * its declared size, so a 16px source still has to reach 256px.
 */
export const letterbox = (
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number,
): { dx: number; dy: number; dw: number; dh: number } => {
  const scale = Math.min(boxWidth / width, boxHeight / height);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  return {
    dx: Math.round((boxWidth - dw) / 2),
    dy: Math.round((boxHeight - dh) / 2),
    dw,
    dh,
  };
};

const splitExtension = (name: string): { stem: string; extension: string } => {
  const dot = name.lastIndexOf(".");
  // dot > 0 so a dotfile like ".gitignore" keeps its whole name as the stem.
  return dot > 0
    ? { stem: name.slice(0, dot), extension: name.slice(dot) }
    : { stem: name, extension: "" };
};

export const outputName = (original: string, target: ConvertTarget): string =>
  `${splitExtension(original).stem}.${EXTENSION[target]}`;

/**
 * Two sources named differently can convert to the same output name, and a ZIP
 * keyed by name would silently keep only the last one.
 *
 * ponytail: a source genuinely called "a-2.jpg" could still collide with a
 * generated "a-2.jpg". Add a uniqueness re-check if anyone ever hits it.
 */
export const dedupeNames = (names: readonly string[]): string[] => {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const used = seen.get(name) ?? 0;
    seen.set(name, used + 1);
    if (used === 0) return name;
    const { stem, extension } = splitExtension(name);
    return `${stem}-${used + 1}${extension}`;
  });
};
