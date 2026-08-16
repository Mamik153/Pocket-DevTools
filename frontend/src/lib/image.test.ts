import { describe, expect, it } from "vitest";
import { isConvertibleImage, isEmbeddableImage, sniffImageFormat } from "@/lib/image";

const bytesOf = (text: string) => new TextEncoder().encode(text);
const withBytes = (...values: number[]) => new Uint8Array(values);

/** An ISO-BMFF header: 4-byte box size, "ftyp", then the brand. */
const ftyp = (brand: string) => bytesOf(`\0\0\0 ftyp${brand}    `);

describe("sniffImageFormat", () => {
  it("detects JPEG", () => {
    expect(sniffImageFormat(withBytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("detects PNG", () => {
    expect(sniffImageFormat(withBytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });

  it("detects GIF", () => {
    expect(sniffImageFormat(bytesOf("GIF89a..."))).toBe("gif");
  });

  it("detects BMP", () => {
    expect(sniffImageFormat(bytesOf("BM some bitmap"))).toBe("bmp");
  });

  it("detects WebP by its RIFF container", () => {
    expect(sniffImageFormat(bytesOf("RIFF????WEBPVP8 "))).toBe("webp");
  });

  it("rejects a RIFF container that is not WebP", () => {
    expect(sniffImageFormat(bytesOf("RIFF????WAVEfmt "))).toBeNull();
  });

  it("detects AVIF by its ftyp brand", () => {
    expect(sniffImageFormat(ftyp("avif"))).toBe("avif");
  });

  it("detects an AVIF image sequence", () => {
    expect(sniffImageFormat(ftyp("avis"))).toBe("avif");
  });

  it("rejects an MP4 sharing the ftyp box", () => {
    expect(sniffImageFormat(ftyp("isom"))).toBeNull();
  });

  it("detects a bare SVG root element", () => {
    expect(sniffImageFormat(bytesOf('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe("svg");
  });

  it("detects an SVG behind an XML prolog and doctype", () => {
    const svg = '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"><svg/>';
    expect(sniffImageFormat(bytesOf(svg))).toBe("svg");
  });

  it("detects an SVG behind a byte order mark and whitespace", () => {
    expect(sniffImageFormat(bytesOf('﻿\n  <svg width="8"/>'))).toBe("svg");
  });

  it("rejects HTML that merely contains an svg element", () => {
    expect(sniffImageFormat(bytesOf("<html><body><svg/></body></html>"))).toBeNull();
  });

  it("rejects XML that is not SVG", () => {
    expect(sniffImageFormat(bytesOf('<?xml version="1.0"?><rss version="2.0"/>'))).toBeNull();
  });

  it("rejects an element merely prefixed with svg", () => {
    expect(sniffImageFormat(bytesOf("<svgcatalog/>"))).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(sniffImageFormat(new Uint8Array(0))).toBeNull();
  });

  it("rejects a file shorter than the signature", () => {
    expect(sniffImageFormat(withBytes(0xff, 0xd8))).toBeNull();
  });
});

describe("isEmbeddableImage", () => {
  it("accepts a raster image", () => {
    expect(isEmbeddableImage(bytesOf("GIF89a"))).toBe(true);
  });

  // createImageBitmap rejects SVG blobs, so SVG must never reach imagesToPdf.
  it("rejects SVG", () => {
    expect(isEmbeddableImage(bytesOf("<svg/>"))).toBe(false);
  });
});

describe("isConvertibleImage", () => {
  it("accepts SVG", () => {
    expect(isConvertibleImage(bytesOf("<svg/>"))).toBe(true);
  });

  it("rejects a text file", () => {
    expect(isConvertibleImage(bytesOf("Dear team, please find attached"))).toBe(false);
  });
});
