import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FileSizePreview } from "./FileSizePreview";

describe("FileSizePreview", () => {
  it("compares actual output sizes and reports increases honestly", () => {
    expect(renderToStaticMarkup(<FileSizePreview originalSize={1000} outputSize={600} />)).toContain("40.0% smaller");
    expect(renderToStaticMarkup(<FileSizePreview originalSize={1000} outputSize={1200} />)).toContain("20.0% larger");
    expect(renderToStaticMarkup(<FileSizePreview originalSize={1000} outputSize={1000} />)).toContain("Same size");
  });

  it("does not present an old output as the preview while updating", () => {
    const html = renderToStaticMarkup(<FileSizePreview originalSize={1000} outputSize={600} pending />);
    expect(html).toContain("Original:");
    expect(html).toContain("Updating preview");
    expect(html).not.toContain("New:");
    expect(html).not.toContain("smaller");
  });

  it("does not invent savings without a result or divide by zero", () => {
    expect(renderToStaticMarkup(<FileSizePreview originalSize={1000} />)).not.toContain("New:");
    expect(renderToStaticMarkup(<FileSizePreview originalSize={0} outputSize={20} />)).not.toContain("Infinity");
  });
});
