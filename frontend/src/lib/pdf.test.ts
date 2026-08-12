import { describe, expect, it } from "vitest";
import {
  dpiToScale,
  formatBytes,
  isImageBytes,
  isPdfBytes,
  moveItem,
  pickSmaller,
  pxToPoints,
  sniffImageType,
} from "@/lib/pdf";

const bytesOf = (text: string) => new TextEncoder().encode(text);

describe("isPdfBytes", () => {
  it("accepts a real PDF header", () => {
    expect(isPdfBytes(bytesOf("%PDF-1.7\nrest of file"))).toBe(true);
  });

  it("rejects a renamed text file", () => {
    expect(isPdfBytes(bytesOf("Dear team, please find attached"))).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(isPdfBytes(new Uint8Array(0))).toBe(false);
  });

  it("rejects a file shorter than the header", () => {
    expect(isPdfBytes(bytesOf("%PDF"))).toBe(false);
  });
});

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item down", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item up", () => {
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns an equal list when the indices match", () => {
    expect(moveItem(list, 2, 2)).toEqual(list);
  });

  it("clamps a target above the last index", () => {
    expect(moveItem(list, 0, 99)).toEqual(["b", "c", "d", "a"]);
  });

  it("clamps a negative target", () => {
    expect(moveItem(list, 3, -5)).toEqual(["d", "a", "b", "c"]);
  });

  it("does not mutate the input", () => {
    const original = [...list];
    moveItem(list, 0, 3);
    expect(list).toEqual(original);
  });
});

describe("dpiToScale", () => {
  it("maps 72 DPI to 1x because a PDF unit is 1/72 inch", () => {
    expect(dpiToScale(72)).toBe(1);
  });

  it("maps 144 DPI to 2x", () => {
    expect(dpiToScale(144)).toBe(2);
  });

  it("maps 150 DPI to the expected fraction", () => {
    expect(dpiToScale(150)).toBeCloseTo(2.0833, 4);
  });
});

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("pickSmaller", () => {
  it("keeps the candidate when it is smaller", () => {
    const original = new Uint8Array(100);
    const candidate = new Uint8Array(60);
    const result = pickSmaller(original, candidate);
    expect(result.bytes).toBe(candidate);
    expect(result.saved).toBe(40);
  });

  it("keeps the original when the candidate is larger", () => {
    const original = new Uint8Array(878);
    const candidate = new Uint8Array(884);
    const result = pickSmaller(original, candidate);
    expect(result.bytes).toBe(original);
    expect(result.saved).toBe(0);
  });

  it("keeps the original when the sizes are equal", () => {
    const original = new Uint8Array(100);
    const result = pickSmaller(original, new Uint8Array(100));
    expect(result.bytes).toBe(original);
    expect(result.saved).toBe(0);
  });
});

import { PDFDocument } from "@cantoo/pdf-lib";
import {
  compressLossless,
  decryptPdf,
  inspectPdf,
  mergePdfs,
} from "@/lib/pdf";

/**
 * Build a PDF in memory. Pages get distinct widths so ordering is assertable.
 * `security` uses pdf-lib's own encrypt(), which removes the need for fixtures.
 */
const makePdf = async (
  sizes: Array<[number, number]>,
  security?: {
    ownerPassword?: string;
    userPassword?: string;
    permissions?: { copying?: boolean; printing?: boolean };
  },
) => {
  const doc = await PDFDocument.create();
  sizes.forEach(([width, height]) => doc.addPage([width, height]));
  if (security) doc.encrypt(security);
  return doc.save();
};

const widthsOf = async (bytes: Uint8Array) => {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => Math.round(page.getWidth()));
};

describe("inspectPdf", () => {
  it("reports page count for a plain PDF", async () => {
    const bytes = await makePdf([[100, 100], [100, 100]]);
    expect(await inspectPdf(bytes)).toEqual({ pageCount: 2, isEncrypted: false });
  });

  it("reports a permission-restricted PDF as encrypted", async () => {
    const bytes = await makePdf([[100, 100]], {
      ownerPassword: "owner-secret",
      permissions: { copying: false },
    });
    expect((await inspectPdf(bytes)).isEncrypted).toBe(true);
  });
});

describe("mergePdfs", () => {
  it("concatenates in the order given", async () => {
    const first = await makePdf([[100, 100]]);
    const second = await makePdf([[200, 200], [300, 300]]);
    const merged = await mergePdfs([second, first]);
    expect(await widthsOf(merged)).toEqual([200, 300, 100]);
  });

  it("reports progress once per input file", async () => {
    const a = await makePdf([[100, 100]]);
    const b = await makePdf([[200, 200]]);
    const calls: Array<[number, number]> = [];
    await mergePdfs([a, b], (done, total) => calls.push([done, total]));
    expect(calls).toEqual([[1, 2], [2, 2]]);
  });
});

describe("decryptPdf", () => {
  it("unlocks a permission-restricted PDF with an empty password", async () => {
    const bytes = await makePdf([[111, 222], [333, 444]], {
      ownerPassword: "owner-secret",
      permissions: { copying: false, printing: false },
    });
    const result = await decryptPdf(bytes, "");
    // A plain load throws EncryptedPDFError if any encryption survived.
    expect(await widthsOf(result.bytes)).toEqual([111, 333]);
    expect(result.rebuilt).toBe(false);
  });

  it("removes a user password", async () => {
    const bytes = await makePdf([[500, 600]], {
      userPassword: "hunter2",
      ownerPassword: "owner-secret",
    });
    const result = await decryptPdf(bytes, "hunter2");
    expect(await widthsOf(result.bytes)).toEqual([500]);
  });

  it("rejects a wrong password", async () => {
    const bytes = await makePdf([[100, 100]], { userPassword: "hunter2" });
    await expect(decryptPdf(bytes, "wrong")).rejects.toThrow();
  });

  it("rejects an empty password on a user-password PDF", async () => {
    const bytes = await makePdf([[100, 100]], { userPassword: "hunter2" });
    await expect(decryptPdf(bytes, "")).rejects.toThrow();
  });
});

describe("compressLossless", () => {
  it("never returns a file larger than the input", async () => {
    const bytes = await makePdf([[100, 100]]);
    const result = await compressLossless(bytes);
    expect(result.bytes.length).toBeLessThanOrEqual(bytes.length);
    if (result.saved === 0) expect(result.bytes).toBe(bytes);
  });

  it("keeps the page content intact", async () => {
    const bytes = await makePdf([[111, 222], [333, 444]]);
    const result = await compressLossless(bytes);
    expect(await widthsOf(result.bytes)).toEqual([111, 333]);
  });
});

describe("sniffImageType", () => {
  const withHeader = (...header: number[]) => Uint8Array.from([...header, 1, 2, 3, 4, 5, 6, 7, 8]);

  it("detects JPEG", () => {
    expect(sniffImageType(withHeader(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("detects PNG", () => {
    expect(sniffImageType(withHeader(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
  });

  it("detects GIF and BMP as re-encodable", () => {
    expect(sniffImageType(withHeader(0x47, 0x49, 0x46, 0x38))).toBe("other");
    expect(sniffImageType(withHeader(0x42, 0x4d))).toBe("other");
  });

  it("detects WebP, which needs the 8-byte offset check", () => {
    const webp = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(sniffImageType(webp)).toBe("other");
  });

  it("rejects a RIFF container that is not WebP", () => {
    const wav = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(sniffImageType(wav)).toBeNull();
  });

  it("rejects a PDF, a text file and an empty file", () => {
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("hello"))).toBeNull();
    expect(sniffImageType(new Uint8Array(0))).toBeNull();
  });

  it("does not read past the end on a truncated header", () => {
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });

  it("isImageBytes agrees with the sniffer", () => {
    expect(isImageBytes(withHeader(0xff, 0xd8, 0xff))).toBe(true);
    expect(isImageBytes(new TextEncoder().encode("%PDF-1.7"))).toBe(false);
  });
});

describe("pxToPoints", () => {
  it("converts 96 DPI pixels to 72 DPI points", () => {
    expect(pxToPoints(96)).toBe(72);
  });

  it("keeps a 1920x1080 image a sane page size", () => {
    expect(pxToPoints(1920)).toBe(1440);
    expect(pxToPoints(1080)).toBe(810);
  });

  it("handles zero", () => {
    expect(pxToPoints(0)).toBe(0);
  });
});
