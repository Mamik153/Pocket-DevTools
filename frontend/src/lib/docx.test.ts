import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { docKindMessage, isDocxBytes, sniffDocKind } from "@/lib/docx";

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
