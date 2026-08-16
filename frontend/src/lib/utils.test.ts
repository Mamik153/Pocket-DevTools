import { describe, expect, it } from "vitest";
import { parentPath } from "@/lib/utils";

describe("parentPath", () => {
  it("returns home for a top-level tool", () => {
    expect(parentPath("/base64")).toBe("/");
  });

  it("returns the parent tool for a sub-route", () => {
    expect(parentPath("/image-converter/to-ico")).toBe("/image-converter");
  });

  it("ignores a trailing slash", () => {
    expect(parentPath("/image-converter/to-ico/")).toBe("/image-converter");
  });

  it("stays at home when already there", () => {
    expect(parentPath("/")).toBe("/");
  });
});
