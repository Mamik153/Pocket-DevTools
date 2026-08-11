import { describe, expect, it } from "vitest";
import {
  dpiToScale,
  formatBytes,
  isPdfBytes,
  moveItem,
  pickSmaller,
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
