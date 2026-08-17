import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { docKindMessage, docxToMarkdown, isDocxBytes, sniffDocKind } from "@/lib/docx";

/** The three parts mammoth needs to treat a zip as a Word document. */
export const minimalDocx = (bodyXml: string): Uint8Array =>
  zipSync({
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    ),
    "word/document.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${bodyXml}</w:body></w:document>`,
    ),
  });

// A password-protected .docx is an OLE container too, which is why the message
// for this signature has to name both possibilities.
const OLE_HEADER = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);

describe("sniffDocKind", () => {
  it("accepts a zip containing word/document.xml", async () => {
    expect(await sniffDocKind(minimalDocx("<w:p/>"))).toBe("docx");
  });

  it("rejects a zip without word/document.xml as another Office file", async () => {
    const xlsx = zipSync({ "xl/workbook.xml": strToU8("<workbook/>") });
    expect(await sniffDocKind(xlsx)).toBe("other-zip");
  });

  it("detects a legacy .doc by its OLE header", async () => {
    expect(await sniffDocKind(OLE_HEADER)).toBe("legacy-doc");
  });

  it("rejects a plain text file", async () => {
    expect(await sniffDocKind(new TextEncoder().encode("Dear team,"))).toBe("unknown");
  });

  it("rejects an empty file", async () => {
    expect(await sniffDocKind(new Uint8Array(0))).toBe("unknown");
  });

  it("rejects a truncated header without reading past the end", async () => {
    expect(await sniffDocKind(new Uint8Array([0x50, 0x4b]))).toBe("unknown");
  });

  it("does not throw on a corrupt zip", async () => {
    const corrupt = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0xff, 0xff, 0xff]);
    expect(await sniffDocKind(corrupt)).toBe("other-zip");
  });
});

describe("isDocxBytes", () => {
  it("accepts a real docx", async () => {
    expect(await isDocxBytes(minimalDocx("<w:p/>"))).toBe(true);
  });

  it("rejects a legacy doc", async () => {
    expect(await isDocxBytes(OLE_HEADER)).toBe(false);
  });
});

describe("docKindMessage", () => {
  it("tells a .doc user exactly how to fix it", () => {
    expect(docKindMessage("legacy-doc")).toMatch(/Save As/i);
  });

  it("names password protection, since an encrypted docx is also OLE", () => {
    expect(docKindMessage("legacy-doc")).toMatch(/password/i);
  });

  it("distinguishes another Office file from junk", () => {
    expect(docKindMessage("other-zip")).toMatch(/spreadsheet|presentation/i);
    expect(docKindMessage("unknown")).not.toMatch(/spreadsheet/i);
  });
});

/** A Word paragraph carrying a named style. */
const styled = (style: string, text: string) =>
  `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;

describe("docxToMarkdown", () => {
  it("maps Word heading styles to Markdown headings", async () => {
    const { markdown } = await docxToMarkdown(minimalDocx(styled("Heading1", "Title")));
    expect(markdown).toContain("# Title");
  });

  it("preserves bold runs", async () => {
    const body =
      `<w:p><w:r><w:t xml:space="preserve">Hello </w:t></w:r>` +
      `<w:r><w:rPr><w:b/></w:rPr><w:t>world</w:t></w:r></w:p>`;
    const { markdown } = await docxToMarkdown(minimalDocx(body));
    expect(markdown).toContain("**world**");
  });

  it("preserves italic runs", async () => {
    const body = `<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>emphasis</w:t></w:r></w:p>`;
    const { markdown } = await docxToMarkdown(minimalDocx(body));
    expect(markdown).toMatch(/_emphasis_|\*emphasis\*/);
  });

  it("keeps paragraphs separated", async () => {
    const body = `<w:p><w:r><w:t>First</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p>`;
    const { markdown } = await docxToMarkdown(minimalDocx(body));
    expect(markdown).toContain("First\n\nSecond");
  });

  it("returns no images for a document that has none", async () => {
    const { images } = await docxToMarkdown(minimalDocx(styled("Heading1", "Title")));
    expect(images).toEqual([]);
  });

  // The minimal fixture declares no styles.xml, so mammoth warns that Heading1
  // was referenced but not defined. It still maps it to <h1> via the default
  // style map. Do NOT assert warnings is empty — this one is expected.
  it("reports mammoth's warnings rather than swallowing them", async () => {
    const { warnings } = await docxToMarkdown(minimalDocx(styled("Heading1", "Title")));
    expect(warnings.join(" ")).toMatch(/Heading1/);
  });

  it("rejects a file that is not a docx", async () => {
    await expect(docxToMarkdown(new TextEncoder().encode("nope"))).rejects.toThrow(
      /not a Word document/i,
    );
  });
});

describe("docxToMarkdown tables", () => {
  const cell = (text: string) => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
  const table =
    `<w:tbl>` +
    `<w:tr>${cell("Name")}${cell("Role")}</w:tr>` +
    `<w:tr>${cell("Ada")}${cell("Engineer")}</w:tr>` +
    `</w:tbl>`;

  // Word tables have no <th> row, so turndown-plugin-gfm keeps them as raw
  // HTML. Without our own rule every table in every document lands in the
  // Markdown as a wall of <table> markup.
  it("emits a GFM table, not raw HTML", async () => {
    const { markdown } = await docxToMarkdown(minimalDocx(table));
    expect(markdown).not.toContain("<table");
    expect(markdown).toContain("| Name | Role |");
    expect(markdown).toContain("| --- | --- |");
    expect(markdown).toContain("| Ada | Engineer |");
  });

  it("escapes pipes so they cannot break the column layout", async () => {
    const piped = `<w:tbl><w:tr>${cell("a|b")}${cell("c")}</w:tr></w:tbl>`;
    const { markdown } = await docxToMarkdown(minimalDocx(piped));
    expect(markdown).toContain("a\\|b");
  });
});
