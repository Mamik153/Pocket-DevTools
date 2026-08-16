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

export interface IcoEntry {
  /** Square edge length in pixels, 1-256. */
  size: number;
  png: Uint8Array;
}

/** Offerable ICO sizes, and the subset ticked by default. */
export const ICO_SIZES = [16, 32, 48, 64, 128, 256] as const;
export const DEFAULT_ICO_SIZES = [16, 32, 48, 256] as const;

const ICONDIR_BYTES = 6;
const ICONDIRENTRY_BYTES = 16;

/**
 * Assemble an .ico from PNG payloads. PNG-compressed entries are what real
 * favicon generators emit and what every current reader supports, so there is
 * no BMP/DIB path here.
 *
 * Layout: ICONDIR, then one ICONDIRENTRY per image, then the payloads. Every
 * multi-byte field is little-endian.
 */
export const buildIco = (entries: readonly IcoEntry[]): Uint8Array => {
  if (entries.length === 0) throw new Error("An ICO needs at least one image.");

  const headerBytes = ICONDIR_BYTES + ICONDIRENTRY_BYTES * entries.length;
  const totalBytes = entries.reduce((sum, entry) => sum + entry.png.length, headerBytes);
  const out = new Uint8Array(totalBytes);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // 1 = icon (2 would be a cursor)
  view.setUint16(4, entries.length, true);

  let offset = headerBytes;
  entries.forEach((entry, index) => {
    const at = ICONDIR_BYTES + index * ICONDIRENTRY_BYTES;
    // 256 does not fit in a byte; the format spells it 0.
    const dimension = entry.size >= 256 ? 0 : entry.size;
    out[at] = dimension;
    out[at + 1] = dimension;
    out[at + 2] = 0; // palette entries, 0 for truecolour
    out[at + 3] = 0; // reserved
    view.setUint16(at + 4, 1, true); // colour planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.png.length, true);
    view.setUint32(at + 12, offset, true);
    out.set(entry.png, offset);
    offset += entry.png.length;
  });

  return out;
};

export interface ConvertSettings {
  target: ConvertTarget;
  /** 0-1. Ignored by PNG and ICO, which have no lossy knob. */
  quality: number;
  /** CSS colour, or null to keep transparency. JPEG must always pass a colour. */
  backdrop: string | null;
  maxWidth: number | null;
  maxHeight: number | null;
  icoSizes: readonly number[];
  /** Longest edge, in px, at which an SVG is rasterised. */
  svgRenderSize: number;
}

/** An SVG declaring enormous dimensions would otherwise allocate a huge canvas. */
export const MAX_SVG_RENDER_PX = 4096;
export const DEFAULT_SVG_RENDER_PX = 512;

const MIME: Record<Exclude<ConvertTarget, "ico">, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

const loadImageElement = (url: string, width?: number, height?: number) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be decoded."));
    if (width !== undefined) image.width = width;
    if (height !== undefined) image.height = height;
    image.src = url;
  });

/**
 * SVG has to go through <img>: createImageBitmap rejects SVG blobs. Loaded this
 * way the document renders in secure static mode — no scripts, no external
 * fetches — and the blob: URL is same-origin, so the canvas does not taint.
 *
 * Two passes: the first reads the intrinsic size, the second re-rasterises at
 * the target size. Drawing an <img> larger than it was laid out blurs it, and
 * the intrinsic size is not knowable before the first load.
 */
const decodeSvg = async (bytes: Uint8Array, renderSize: number): Promise<Decoded> => {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/svg+xml" }));
  try {
    const probe = await loadImageElement(url);
    // A viewBox-only SVG reports 0; fall back to a square at the render size.
    const intrinsicWidth = probe.naturalWidth || renderSize;
    const intrinsicHeight = probe.naturalHeight || renderSize;
    const capped = Math.min(renderSize, MAX_SVG_RENDER_PX);
    const scale = capped / Math.max(intrinsicWidth, intrinsicHeight);
    const width = Math.max(1, Math.round(intrinsicWidth * scale));
    const height = Math.max(1, Math.round(intrinsicHeight * scale));
    const sized = await loadImageElement(url, width, height);
    return { source: sized, width, height, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

const decodeRaster = async (bytes: Uint8Array): Promise<Decoded> => {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
};

const decodeImage = (
  bytes: Uint8Array,
  format: ImageFormat,
  renderSize: number,
): Promise<Decoded> => (format === "svg" ? decodeSvg(bytes, renderSize) : decodeRaster(bytes));

/** Draw onto a fresh canvas of the given size, optionally over a solid ground. */
const paint = (
  decoded: Decoded,
  canvasWidth: number,
  canvasHeight: number,
  placement: { dx: number; dy: number; dw: number; dh: number },
  backdrop: string | null,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get a 2D canvas context.");
  if (backdrop) {
    context.fillStyle = backdrop;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
  }
  context.drawImage(decoded.source, placement.dx, placement.dy, placement.dw, placement.dh);
  return canvas;
};

/** Free the backing store immediately rather than waiting for collection. */
const releaseCanvas = (canvas: HTMLCanvasElement): void => {
  canvas.width = 0;
  canvas.height = 0;
};

const encodeCanvas = async (
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob> => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Could not encode the image."))),
      mime,
      quality,
    );
  });
  // toBlob falls back to PNG when it cannot encode the requested type, which
  // would hand the user a .webp that is really a PNG. Refuse to ship that.
  if (blob.type !== mime) {
    throw new Error(`This browser cannot encode ${mime.replace("image/", "").toUpperCase()}.`);
  }
  return blob;
};

const toIco = async (decoded: Decoded, settings: ConvertSettings): Promise<Blob> => {
  const sizes = [...settings.icoSizes].sort((a, b) => a - b);
  if (sizes.length === 0) throw new Error("Pick at least one icon size.");

  const entries: IcoEntry[] = [];
  for (const size of sizes) {
    const canvas = paint(
      decoded,
      size,
      size,
      letterbox(decoded.width, decoded.height, size, size),
      settings.backdrop,
    );
    const png = await encodeCanvas(canvas, "image/png");
    releaseCanvas(canvas);
    entries.push({ size, png: new Uint8Array(await png.arrayBuffer()) });
  }
  return new Blob([buildIco(entries) as BlobPart], { type: "image/x-icon" });
};

/**
 * Convert one image. Everything happens on a canvas in this tab — no network
 * call anywhere in this path.
 */
export const convertImage = async (
  bytes: Uint8Array,
  settings: ConvertSettings,
): Promise<Blob> => {
  const format = sniffImageFormat(bytes);
  if (!format) throw new Error("This file is not an image we recognise.");

  // For an icon, rasterise the vector at the largest size we will actually
  // need rather than at the panel's render size.
  const renderSize =
    settings.target === "ico" && settings.icoSizes.length > 0
      ? Math.max(...settings.icoSizes)
      : settings.svgRenderSize;

  const decoded = await decodeImage(bytes, format, renderSize);
  try {
    if (settings.target === "ico") return await toIco(decoded, settings);

    const { width, height } = fitWithin(
      decoded.width,
      decoded.height,
      settings.maxWidth,
      settings.maxHeight,
    );
    const canvas = paint(
      decoded,
      width,
      height,
      { dx: 0, dy: 0, dw: width, dh: height },
      settings.backdrop,
    );
    const blob = await encodeCanvas(
      canvas,
      MIME[settings.target],
      settings.target === "png" ? undefined : settings.quality,
    );
    releaseCanvas(canvas);
    return blob;
  } finally {
    decoded.close();
  }
};
