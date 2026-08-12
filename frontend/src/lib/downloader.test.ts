import { describe, expect, it } from "vitest";
import { mapErrorCode, normalizeCobaltResponse } from "@/lib/downloader";

describe("normalizeCobaltResponse", () => {
  it("treats tunnel as a forced download", () => {
    const result = normalizeCobaltResponse({
      status: "tunnel",
      url: "https://cobalt.example.com/tunnel?id=1",
      filename: "clip.mp4",
    });
    expect(result).toEqual({
      kind: "single",
      url: "https://cobalt.example.com/tunnel?id=1",
      filename: "clip.mp4",
      forcesDownload: true,
    });
  });

  it("treats redirect as a link that may open in a tab", () => {
    const result = normalizeCobaltResponse({
      status: "redirect",
      url: "https://cdn.example.com/video.mp4",
    });
    expect(result).toMatchObject({ kind: "single", forcesDownload: false });
  });

  it("returns every picker item", () => {
    const result = normalizeCobaltResponse({
      status: "picker",
      picker: [
        { type: "photo", url: "https://cdn.example.com/1.jpg" },
        { type: "video", url: "https://cdn.example.com/2.mp4", thumb: "https://cdn.example.com/2.jpg" },
      ],
    });
    expect(result).toMatchObject({ kind: "picker" });
    if (result.kind !== "picker") throw new Error("expected picker");
    expect(result.items).toHaveLength(2);
  });

  it("maps an error status to its code", () => {
    const result = normalizeCobaltResponse({
      status: "error",
      error: { code: "error.api.link.invalid" },
    });
    expect(result).toEqual({
      kind: "error",
      code: "error.api.link.invalid",
      message: "That doesn't look like a valid link.",
    });
  });

  it("treats a success status with no url as an empty result", () => {
    const result = normalizeCobaltResponse({ status: "tunnel" });
    expect(result).toMatchObject({ kind: "error", code: "error.api.fetch.empty" });
  });

  it("treats an empty picker as an empty result", () => {
    const result = normalizeCobaltResponse({ status: "picker", picker: [] });
    expect(result).toMatchObject({ kind: "error", code: "error.api.fetch.empty" });
  });

  it("falls back for an unrecognised status", () => {
    const result = normalizeCobaltResponse({ status: "something-new" });
    expect(result).toMatchObject({ kind: "error", code: "error.api.unknown" });
  });
});

describe("mapErrorCode", () => {
  it("returns friendly copy for a known code", () => {
    expect(mapErrorCode("error.api.content.too_long")).toBe(
      "That file is longer than this instance allows.",
    );
  });

  it("shows the raw code for an unknown one so failures stay diagnosable", () => {
    expect(mapErrorCode("error.api.brand.new")).toBe("Download failed (error.api.brand.new).");
  });
});
