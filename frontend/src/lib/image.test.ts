import { describe, expect, it } from "vitest";
import {
  buildIco,
  dedupeNames,
  fitWithin,
  isConvertibleImage,
  isEmbeddableImage,
  letterbox,
  outputName,
  sniffImageFormat,
} from "@/lib/image";

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

describe("fitWithin", () => {
  it("returns the original size when no bound is set", () => {
    expect(fitWithin(1600, 900, null, null)).toEqual({ width: 1600, height: 900 });
  });

  it("never upscales a small image to fill a large bound", () => {
    expect(fitWithin(100, 50, 1000, 1000)).toEqual({ width: 100, height: 50 });
  });

  it("constrains on width alone", () => {
    expect(fitWithin(2000, 1000, 1000, null)).toEqual({ width: 1000, height: 500 });
  });

  it("constrains on height alone", () => {
    expect(fitWithin(2000, 1000, null, 250)).toEqual({ width: 500, height: 250 });
  });

  it("uses whichever bound binds harder", () => {
    expect(fitWithin(2000, 1000, 1000, 100)).toEqual({ width: 200, height: 100 });
  });

  it("never collapses a dimension to zero", () => {
    expect(fitWithin(1000, 10, 5, null)).toEqual({ width: 5, height: 1 });
  });

  it("ignores a zero bound rather than dividing by it", () => {
    expect(fitWithin(800, 600, 0, 0)).toEqual({ width: 800, height: 600 });
  });
});

describe("letterbox", () => {
  it("fills the box exactly when the aspect ratios match", () => {
    expect(letterbox(64, 64, 32, 32)).toEqual({ dx: 0, dy: 0, dw: 32, dh: 32 });
  });

  it("centres a wide image with bars above and below", () => {
    expect(letterbox(64, 32, 32, 32)).toEqual({ dx: 0, dy: 8, dw: 32, dh: 16 });
  });

  it("centres a tall image with bars left and right", () => {
    expect(letterbox(32, 64, 32, 32)).toEqual({ dx: 8, dy: 0, dw: 16, dh: 32 });
  });

  // Unlike fitWithin, this one DOES upscale: a 16px source still has to fill
  // a 256px ICO entry.
  it("upscales a source smaller than the box", () => {
    expect(letterbox(16, 16, 256, 256)).toEqual({ dx: 0, dy: 0, dw: 256, dh: 256 });
  });
});

describe("outputName", () => {
  it("swaps the extension", () => {
    expect(outputName("shot.png", "jpeg")).toBe("shot.jpg");
  });

  it("only replaces the final extension", () => {
    expect(outputName("archive.tar.png", "webp")).toBe("archive.tar.webp");
  });

  it("appends when there is no extension", () => {
    expect(outputName("screenshot", "png")).toBe("screenshot.png");
  });

  it("uses .ico for the icon target", () => {
    expect(outputName("logo.svg", "ico")).toBe("logo.ico");
  });
});

describe("dedupeNames", () => {
  it("leaves distinct names alone", () => {
    expect(dedupeNames(["a.jpg", "b.jpg"])).toEqual(["a.jpg", "b.jpg"]);
  });

  it("suffixes repeats so a ZIP does not silently drop entries", () => {
    expect(dedupeNames(["a.jpg", "a.jpg", "a.jpg"])).toEqual(["a.jpg", "a-2.jpg", "a-3.jpg"]);
  });

  it("suffixes before the extension", () => {
    expect(dedupeNames(["report.tar.gz", "report.tar.gz"])).toEqual([
      "report.tar.gz",
      "report.tar-2.gz",
    ]);
  });
});

/** Reads back what buildIco wrote, so the test asserts the real byte layout. */
const parseIco = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4, true);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const at = 6 + index * 16;
    entries.push({
      width: bytes[at],
      height: bytes[at + 1],
      planes: view.getUint16(at + 4, true),
      bitCount: view.getUint16(at + 6, true),
      byteLength: view.getUint32(at + 8, true),
      offset: view.getUint32(at + 12, true),
    });
  }
  return { reserved: view.getUint16(0, true), type: view.getUint16(2, true), count, entries };
};

describe("buildIco", () => {
  const small = new Uint8Array(10).fill(0xaa);
  const large = new Uint8Array(20).fill(0xbb);
  const ico = buildIco([
    { size: 16, png: small },
    { size: 256, png: large },
  ]);
  const parsed = parseIco(ico);

  it("writes a well-formed ICONDIR", () => {
    expect(parsed.reserved).toBe(0);
    expect(parsed.type).toBe(1);
    expect(parsed.count).toBe(2);
  });

  it("sizes the file as header plus directory plus payloads", () => {
    expect(ico.length).toBe(6 + 16 * 2 + 10 + 20);
  });

  it("records each entry's dimensions", () => {
    expect(parsed.entries[0].width).toBe(16);
    expect(parsed.entries[0].height).toBe(16);
  });

  // 256 does not fit in a byte. The format spells it 0, and readers that get
  // this wrong render a 256px icon as a broken 0px one.
  it("spells 256 as a zero byte", () => {
    expect(parsed.entries[1].width).toBe(0);
    expect(parsed.entries[1].height).toBe(0);
  });

  it("declares 32-bit truecolour with one plane", () => {
    expect(parsed.entries[0].planes).toBe(1);
    expect(parsed.entries[0].bitCount).toBe(32);
  });

  it("points each entry at its own payload", () => {
    expect(parsed.entries[0].offset).toBe(6 + 16 * 2);
    expect(parsed.entries[0].byteLength).toBe(10);
    expect(parsed.entries[1].offset).toBe(6 + 16 * 2 + 10);
    expect(parsed.entries[1].byteLength).toBe(20);
  });

  it("round-trips each payload byte for byte", () => {
    const [first, second] = parsed.entries;
    expect(ico.slice(first.offset, first.offset + first.byteLength)).toEqual(small);
    expect(ico.slice(second.offset, second.offset + second.byteLength)).toEqual(large);
  });

  it("refuses to build an empty icon", () => {
    expect(() => buildIco([])).toThrow(/at least one/i);
  });
});
