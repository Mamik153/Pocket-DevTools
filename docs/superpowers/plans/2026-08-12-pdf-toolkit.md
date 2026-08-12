# PDF Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/pdf-toolkit` route to Pocket DevTools with four fully client-side PDF features — Merge, Unlock, PDF to Image, and Compress.

**Architecture:** One route, one page, four tabs, four panel components. All PDF work happens in the browser; no file is uploaded. Pure logic lives in `src/lib/pdf.ts` and is unit-tested; panels are thin React components over those helpers. Heavy libraries are dynamically imported so they load only when a tab needs them.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Router, Tailwind v4, framer-motion 12 (already installed), `@cantoo/pdf-lib`, `pdfjs-dist`, `fflate`, `vitest`.

**Spec:** `docs/superpowers/specs/2026-08-12-pdf-toolkit-design.md`

## Global Constraints

- All work is client-side. No file, password, or derived artifact is ever sent to a server. No new network calls of any kind.
- Working directory for every command is `frontend/`.
- In application code, `@cantoo/pdf-lib`, `pdfjs-dist`, and `fflate` must only ever be loaded through `await import(...)` inside `src/lib/pdf.ts`. No top-level import of them in any component. This keeps them out of the initial bundle. Test files (`*.test.ts`) are exempt and may import them statically — they are never bundled.
- Licences: `@cantoo/pdf-lib` MIT, `pdfjs-dist` Apache-2.0, `fflate` MIT. Do not add `mupdf` — it is AGPL-3.0 and incompatible with this MIT repo.
- Springs use `bounce: 0` everywhere, with exactly one exception: the Merge row settle after a drag release, which uses `{ type: "spring", bounce: 0.2, duration: 0.4 }`.
- Every animated component must call `useReducedMotion()` and degrade to instant/no-bounce. Follow the existing pattern in `src/routes/HomePage.tsx`.
- Passwords live in React state only. Never log them, never put them in a URL, never persist them to storage.
- Never offer a download whose bytes are larger than the input. See Task 9.
- Tool copy must not claim the tool can crack or guess passwords. It cannot.
- `npm run build` must pass at the end of every task. It runs `generate-sitemap.mjs`, then `tsc -b`, then `vite build`.

---

### Task 1: Dependencies and test harness

Installs the four packages and gets `vitest` running with one trivial passing test, so every later task has somewhere to put tests.

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` command. `src/lib/pdf.ts` and `src/lib/pdf.test.ts` exist from Task 2 onward.

- [ ] **Step 1: Install runtime dependencies**

```bash
cd frontend
npm install @cantoo/pdf-lib@^2.8.1 pdfjs-dist@^6.2.108 fflate@^0.8.3
```

- [ ] **Step 2: Install vitest as a dev dependency**

```bash
cd frontend
npm install -D vitest@^4.1.10
```

- [ ] **Step 3: Add the test script**

In `frontend/package.json`, add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` block, immediately after the existing `"generate-sitemap"` entry:

```json
  "scripts": {
    "dev": "vite",
    "build": "node scripts/generate-sitemap.mjs && tsc -b && vite build",
    "generate-sitemap": "node scripts/generate-sitemap.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  },
```

No `vitest.config.ts` is needed. Vitest reads the existing `vite.config.ts`, which already defines the `@` alias.

- [ ] **Step 4: Write a smoke test that proves the harness and the alias work**

Create `frontend/src/lib/pdf.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("test harness", () => {
  it("resolves the @ alias", () => {
    expect(cn("a", "b")).toBe("a b");
  });
});
```

Note: `vitest` is imported explicitly rather than relying on globals, so no `types` change is needed in `tsconfig.app.json`.

- [ ] **Step 5: Run the test**

Run: `cd frontend && npm test`
Expected: PASS, 1 test.

- [ ] **Step 6: Verify the build still passes**

Run: `cd frontend && npm run build`
Expected: exit 0. `src/lib/pdf.test.ts` is inside `include: ["src"]`, so this also confirms the test file typechecks.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/pdf.test.ts
git commit -m "chore: add pdf dependencies and vitest harness"
```

---

### Task 2: Pure helpers in `src/lib/pdf.ts`

The logic that passes typecheck while being wrong. TDD, no PDF libraries involved yet.

**Files:**
- Create: `frontend/src/lib/pdf.ts`
- Modify: `frontend/src/lib/pdf.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isPdfBytes(bytes: Uint8Array): boolean`
  - `moveItem<T>(items: readonly T[], from: number, to: number): T[]`
  - `dpiToScale(dpi: number): number`
  - `formatBytes(bytes: number): string`
  - `pickSmaller(original: Uint8Array, candidate: Uint8Array): { bytes: Uint8Array; saved: number }`

- [ ] **Step 1: Write the failing tests**

Replace the contents of `frontend/src/lib/pdf.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test`
Expected: FAIL — `Failed to resolve import "@/lib/pdf"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/pdf.ts`:

```ts
/**
 * Shared PDF logic. Every heavy library (@cantoo/pdf-lib, pdfjs-dist, fflate) is
 * loaded through a dynamic import inside this module so it stays out of the
 * initial bundle. Nothing here performs network I/O — all work is local.
 */

/** A PDF must start with "%PDF-". Extension and MIME type are attacker-controlled. */
export const isPdfBytes = (bytes: Uint8Array): boolean => {
  const header = "%PDF-";
  if (bytes.length < header.length) return false;
  for (let index = 0; index < header.length; index += 1) {
    if (bytes[index] !== header.charCodeAt(index)) return false;
  }
  return true;
};

/** Move one item within a list, returning a new array. `to` is clamped into range. */
export const moveItem = <T,>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const target = Math.min(Math.max(to, 0), next.length - 1);
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};

/** pdf.js viewport scale. A PDF user space unit is 1/72 inch, so 72 DPI is 1x. */
export const dpiToScale = (dpi: number): number => dpi / 72;

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Compression can make a file bigger — object streams add overhead that a small
 * document never recovers. Measured: an 878-byte PDF saved back at 884 bytes.
 * Never hand the user a larger file labelled "compressed".
 */
export const pickSmaller = (
  original: Uint8Array,
  candidate: Uint8Array,
): { bytes: Uint8Array; saved: number } =>
  candidate.length < original.length
    ? { bytes: candidate, saved: original.length - candidate.length }
    : { bytes: original, saved: 0 };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test`
Expected: PASS, 20 tests.

- [ ] **Step 5: Verify the build**

Run: `cd frontend && npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/pdf.ts frontend/src/lib/pdf.test.ts
git commit -m "feat: add pure pdf helpers with tests"
```

---

### Task 3: Document operations — load, merge, decrypt

The core PDF logic, TDD'd against PDFs the tests generate themselves. No fixtures, no mocking.

**Files:**
- Modify: `frontend/src/lib/pdf.ts`
- Modify: `frontend/src/lib/pdf.test.ts`

**Interfaces:**
- Consumes: `isPdfBytes`, `pickSmaller` from Task 2.
- Produces:
  - `type PdfLib = typeof import("@cantoo/pdf-lib")`
  - `loadPdfLib(): Promise<PdfLib>`
  - `inspectPdf(bytes: Uint8Array): Promise<{ pageCount: number; isEncrypted: boolean }>`
  - `mergePdfs(files: readonly Uint8Array[], onProgress?: (done: number, total: number) => void): Promise<Uint8Array>`
  - `decryptPdf(bytes: Uint8Array, password: string): Promise<{ bytes: Uint8Array; rebuilt: boolean }>`
  - `compressLossless(bytes: Uint8Array): Promise<{ bytes: Uint8Array; saved: number }>`

- [ ] **Step 1: Write the failing tests**

Append to `frontend/src/lib/pdf.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test`
Expected: FAIL — `inspectPdf`, `mergePdfs`, `decryptPdf`, `compressLossless` are not exported.

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/lib/pdf.ts`:

```ts
export type PdfLib = typeof import("@cantoo/pdf-lib");

let pdfLibPromise: Promise<PdfLib> | null = null;

/** Load @cantoo/pdf-lib once, lazily. Keeps ~1MB out of the initial bundle. */
export const loadPdfLib = (): Promise<PdfLib> => {
  pdfLibPromise ??= import("@cantoo/pdf-lib");
  return pdfLibPromise;
};

export interface PdfInfo {
  pageCount: number;
  isEncrypted: boolean;
}

/** Read page count and encryption status without needing a password. */
export const inspectPdf = async (bytes: Uint8Array): Promise<PdfInfo> => {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { pageCount: doc.getPageCount(), isEncrypted: doc.isEncrypted };
};

/** Concatenate PDFs in the order given. Progress fires once per input file. */
export const mergePdfs = async (
  files: readonly Uint8Array[],
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> => {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let index = 0; index < files.length; index += 1) {
    const source = await PDFDocument.load(files[index]);
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((page) => out.addPage(page));
    onProgress?.(index + 1, files.length);
  }
  // ponytail: objectsPerTick yields to the event loop, which is enough for
  // ordinary files but still runs on the main thread. Move save() into a Web
  // Worker if merging very large PDFs measurably janks the UI.
  return out.save({ useObjectStreams: true, objectsPerTick: 200 });
};

/** True if the bytes still refuse a plain, optionless load. */
const isStillEncrypted = async (bytes: Uint8Array): Promise<boolean> => {
  const { PDFDocument } = await loadPdfLib();
  try {
    await PDFDocument.load(bytes);
    return false;
  } catch {
    return true;
  }
};

/**
 * Decrypt and return an unencrypted copy.
 *
 * Loading with the right password and calling save() is NOT enough: the original
 * encryption dictionary survives as an orphaned indirect object alongside a
 * PDFInvalidObject remnant, and the output reloads as encrypted. Verified
 * experimentally against generated fixtures.
 *
 * Tier 1 deletes those objects, preserving the object graph so outlines, bookmarks
 * and form fields survive. Tier 2 rebuilds page-by-page, which always clears
 * encryption but drops those structures — hence `rebuilt`, which the UI surfaces.
 */
export const decryptPdf = async (
  bytes: Uint8Array,
  password: string,
): Promise<{ bytes: Uint8Array; rebuilt: boolean }> => {
  const { PDFDocument, PDFDict, PDFInvalidObject, PDFName } = await loadPdfLib();

  // Throws on a wrong password — callers surface that as an inline field error.
  const doc = await PDFDocument.load(bytes, { password });

  doc.context.trailerInfo.Encrypt = undefined;
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const isEncryptionDict =
      object instanceof PDFDict && object.get(PDFName.of("Filter")) === PDFName.of("Standard");
    if (isEncryptionDict || object instanceof PDFInvalidObject) {
      doc.context.delete(ref);
    }
  }

  const stripped = await doc.save({ useObjectStreams: true, objectsPerTick: 200 });
  if (!(await isStillEncrypted(stripped))) return { bytes: stripped, rebuilt: false };

  const reloaded = await PDFDocument.load(bytes, { password });
  return { bytes: await mergePdfsFromDocument(reloaded), rebuilt: true };
};

/** Page-level rebuild. Shared by the decrypt fallback. */
const mergePdfsFromDocument = async (
  source: InstanceType<PdfLib["PDFDocument"]>,
): Promise<Uint8Array> => {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, source.getPageIndices());
  pages.forEach((page) => out.addPage(page));
  return out.save({ useObjectStreams: true, objectsPerTick: 200 });
};

/**
 * Lossless pass: drop orphaned objects and incremental-update history, then
 * recompress. Text, links and searchability all survive. Often saves nothing.
 */
export const compressLossless = async (
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; saved: number }> => {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const candidate = await doc.save({
    useObjectStreams: true,
    rewrite: true,
    objectsPerTick: 200,
  });
  return pickSmaller(bytes, candidate);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test`
Expected: PASS, 30 tests.

- [ ] **Step 5: Verify the build**

Run: `cd frontend && npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/pdf.ts frontend/src/lib/pdf.test.ts
git commit -m "feat: add pdf load, merge, decrypt and lossless compress"
```

---

### Task 4: Global button press state

One line, but it changes all thirteen existing tools, so it stands alone for review.

**Files:**
- Modify: `frontend/src/components/ui/button.tsx:6`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new. Behavioural change only.

- [ ] **Step 1: Add the press state to the base variant**

In `frontend/src/components/ui/button.tsx`, the `cva` base string currently starts:

```
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
```

Insert `active:scale-[0.98] motion-reduce:active:scale-100` immediately after `transition-all`, giving:

```
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
```

`:active` fires on pointer-down, which is the point — feedback must not wait for release. `transition-all` is already present and short. `motion-reduce:` honours `prefers-reduced-motion`.

- [ ] **Step 2: Verify by hand**

Run: `cd frontend && npm run dev`

Open `http://localhost:5173`, press and hold any button on the home page. It must visibly shrink on press-down, before release. Press and hold a `variant="outline"` button in the JSON Toolkit and confirm the same.

- [ ] **Step 3: Verify the build**

Run: `cd frontend && npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/button.tsx
git commit -m "feat: add press-down feedback to shared Button"
```

---

### Task 5: Route registration and tab shell

Ends with `/pdf-toolkit` reachable, on the home page, in the sitemap, with four switchable but empty tabs.

**Files:**
- Modify: `frontend/src/config/tools.ts`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/routes/HomePage.tsx`
- Modify: `frontend/scripts/generate-sitemap.mjs`
- Create: `frontend/src/routes/PdfToolkitPage.tsx`
- Create: `frontend/src/components/pdf/PdfToolkit.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `PdfToolkitPage` (named export) from `@/routes/PdfToolkitPage`
  - `PdfToolkit` (named export) from `@/components/pdf/PdfToolkit`
  - `type PdfMode = "merge" | "unlock" | "to-image" | "compress"`

- [ ] **Step 1: Register the tool**

In `frontend/src/config/tools.ts`, add `| "pdf-toolkit"` to the end of the `ToolId` union and `| "/pdf-toolkit"` to the end of the `ToolPath` union. Then append this entry to the `tools` array, immediately after the `markdown-to-pdf` entry:

```ts
  {
    id: "pdf-toolkit",
    name: "PDF Toolkit",
    description: "Merge, unlock, compress, and convert PDFs to images without uploading a file.",
    path: "/pdf-toolkit",
    ctaLabel: "Open",
    metaDescription: "Merge, unlock, compress PDFs and convert them to images in your browser. Nothing is uploaded.",
    metaKeywords: ["merge pdf", "unlock pdf", "compress pdf", "pdf to image", "pdf tools", "remove pdf password"],
  },
```

`src/config/seo.ts` derives titles, descriptions, canonical URLs and schema from this array automatically. It needs no edit.

- [ ] **Step 2: Add the sitemap entry**

In `frontend/scripts/generate-sitemap.mjs`, add this line to the `entries` array immediately after the `/markdown-to-pdf` line:

```js
  { path: "/pdf-toolkit", changefreq: "weekly", priority: "0.9" },
```

- [ ] **Step 3: Add the home page icon**

In `frontend/src/routes/HomePage.tsx`, add `FileStack` to the existing `lucide-react` import block (keep the list alphabetical: it goes after `Fingerprint`), then add this entry to the `toolIcons` record:

```ts
  "pdf-toolkit": FileStack,
```

- [ ] **Step 4: Create the tab shell**

Create `frontend/src/components/pdf/PdfToolkit.tsx`:

```tsx
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileStack, Image as ImageIcon, Shrink, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type PdfMode = "merge" | "unlock" | "to-image" | "compress";

interface ModeConfig {
  id: PdfMode;
  label: string;
  icon: LucideIcon;
}

const MODES: ModeConfig[] = [
  { id: "merge", label: "Merge", icon: FileStack },
  { id: "unlock", label: "Unlock", icon: Unlock },
  { id: "to-image", label: "To Image", icon: ImageIcon },
  { id: "compress", label: "Compress", icon: Shrink },
];

export function PdfToolkit() {
  const [mode, setMode] = useState<PdfMode>("merge");
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="PDF tools"
      >
        {MODES.map(({ id, label, icon: Icon }) => {
          const isActive = mode === id;
          return (
            <Button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`pdf-panel-${id}`}
              id={`pdf-tab-${id}`}
              variant={isActive ? "default" : "outline"}
              onClick={() => setMode(id)}
              className="relative"
            >
              {/*
                layoutId lets the indicator physically travel between tabs rather
                than blinking out and in — the spatial relationship stays legible.
              */}
              {isActive && !prefersReducedMotion && (
                <motion.span
                  layoutId="pdf-tab-indicator"
                  className="absolute inset-0 -z-10 rounded-xl bg-primary"
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
              )}
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Button>
          );
        })}
      </div>

      {/*
        Cross-fade rather than slide. Merge and Unlock have no spatial
        relationship, so a slide would imply one that does not exist.
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          id={`pdf-panel-${mode}`}
          role="tabpanel"
          aria-labelledby={`pdf-tab-${mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {mode} panel coming in a later task.
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 5: Create the route page**

Create `frontend/src/routes/PdfToolkitPage.tsx`:

```tsx
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { PdfToolkit } from "@/components/pdf/PdfToolkit";

export function PdfToolkitPage() {
  return (
    <ToolPageLayout
      title="PDF Toolkit"
      description="Merge, unlock, compress, and convert PDFs to images. Every file is processed in your browser and never uploaded."
    >
      <PdfToolkit />
    </ToolPageLayout>
  );
}
```

- [ ] **Step 6: Wire the router**

In `frontend/src/router.tsx`, add the lazy import after the existing `MarkdownToPdfPage` block:

```tsx
const PdfToolkitPage = lazy(() =>
  import("@/routes/PdfToolkitPage").then((module) => ({
    default: module.PdfToolkitPage,
  })),
);
```

Add the route definition after `markdownToPdfRoute`:

```tsx
const pdfToolkitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pdf-toolkit",
  component: withLazySuspense(PdfToolkitPage)
});
```

Add `pdfToolkitRoute,` to the `rootRoute.addChildren([...])` array, immediately after `markdownToPdfRoute,`.

- [ ] **Step 7: Verify by hand**

Run: `cd frontend && npm run dev`

- Home page shows a "PDF Toolkit" card with a stacked-files icon.
- Clicking it opens `/pdf-toolkit`.
- All four tabs switch, and the filled indicator slides between them.
- The browser tab title reads "PDF Toolkit | Pocket DevTools".
- Tab through the four buttons with the keyboard and confirm the focus ring is visible.

- [ ] **Step 8: Verify the sitemap and the build**

Run: `cd frontend && npm run build && grep pdf-toolkit public/sitemap.xml`
Expected: exit 0, and the grep prints a `<loc>` line containing `/pdf-toolkit`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/config/tools.ts frontend/src/router.tsx frontend/src/routes/HomePage.tsx \
        frontend/scripts/generate-sitemap.mjs frontend/src/routes/PdfToolkitPage.tsx \
        frontend/src/components/pdf/PdfToolkit.tsx frontend/public/sitemap.xml
git commit -m "feat: add /pdf-toolkit route and tab shell"
```

---

### Task 6: Shared dropzone

The file-intake component every panel uses. Validates by magic bytes, not by extension.

**Files:**
- Create: `frontend/src/components/pdf/PdfDropzone.tsx`

**Interfaces:**
- Consumes: `isPdfBytes`, `formatBytes` from `@/lib/pdf`.
- Produces:
  - `interface AcceptedPdf { id: string; name: string; size: number; bytes: Uint8Array }`
  - `PdfDropzone` (named export) with props
    `{ multiple?: boolean; label?: string; onAccept: (files: AcceptedPdf[]) => void }`
  - `LARGE_FILE_WARNING_BYTES` constant

- [ ] **Step 1: Create the component**

Create `frontend/src/components/pdf/PdfDropzone.tsx`:

```tsx
import { useCallback, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload } from "lucide-react";
import { formatBytes, isPdfBytes } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export interface AcceptedPdf {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
}

/** Above this, a browser may run out of memory. We warn; we never block. */
export const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

interface PdfDropzoneProps {
  multiple?: boolean;
  label?: string;
  onAccept: (files: AcceptedPdf[]) => void;
}

export function PdfDropzone({
  multiple = false,
  label = "Drop a PDF here, or click to choose",
  onAccept,
}: PdfDropzoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const prefersReducedMotion = useReducedMotion();

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const accepted: AcceptedPdf[] = [];
      const rejected: string[] = [];
      const oversized: string[] = [];

      for (const file of Array.from(fileList)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Extension and MIME type are user-controlled. Only the header is evidence.
        if (!isPdfBytes(bytes)) {
          rejected.push(`${file.name} is not a PDF.`);
          continue;
        }
        if (file.size > LARGE_FILE_WARNING_BYTES) {
          oversized.push(
            `${file.name} is ${formatBytes(file.size)}. Large files may exhaust your browser's memory.`,
          );
        }
        accepted.push({
          id: `${file.name}-${file.size}-${accepted.length}`,
          name: file.name,
          size: file.size,
          bytes,
        });
      }

      setErrors(rejected);
      setWarnings(oversized);
      if (accepted.length > 0) onAccept(accepted);
    },
    [onAccept],
  );

  return (
    <div className="space-y-2">
      <motion.div
        // Highlight the instant the file is over the zone, not on drop.
        onDragEnter={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: isOver && !prefersReducedMotion ? 1.01 : 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/20",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={inputId} className="cursor-pointer text-sm text-muted-foreground">
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            // Reset so re-picking the same file fires change again.
            event.target.value = "";
          }}
        />
      </motion.div>

      {errors.map((message) => (
        <p key={message} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}
      {warnings.map((message) => (
        <p key={message} className="text-sm text-muted-foreground">
          {message}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the shell temporarily to verify**

In `frontend/src/components/pdf/PdfToolkit.tsx`, replace the placeholder `<CardContent>` body with a dropzone so it can be exercised. This mount is transient scaffolding — Task 7 replaces it with `MergePanel`. Accepted files are rendered into the page rather than logged, so there is no debug output to leave behind.

Add `import { useState } from "react";` (already imported), `import { PdfDropzone } from "@/components/pdf/PdfDropzone";`, and inside the component add:

```tsx
  const [acceptedNames, setAcceptedNames] = useState<string[]>([]);
```

Then change the `CardContent` block to:

```tsx
            <CardContent className="space-y-3 py-6">
              <PdfDropzone
                multiple
                onAccept={(files) => setAcceptedNames(files.map((file) => file.name))}
              />
              <ul className="text-sm text-muted-foreground">
                {acceptedNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </CardContent>
```

- [ ] **Step 3: Verify by hand**

Run: `cd frontend && npm run dev`, open `/pdf-toolkit`, then check all four:

- Dragging a PDF over the zone highlights it **while hovering**, before dropping.
- Dropping a real PDF lists its name under the dropzone.
- Dropping a `.txt` file renamed to `.pdf` shows "… is not a PDF." and lists nothing.
- Clicking the zone opens the file picker, and picking the same file twice in a row fires both times.

- [ ] **Step 4: Verify the build**

Run: `cd frontend && npm run build`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/pdf/PdfDropzone.tsx frontend/src/components/pdf/PdfToolkit.tsx
git commit -m "feat: add shared PDF dropzone with magic-byte validation"
```

---

### Task 7: Merge panel

**Files:**
- Create: `frontend/src/components/pdf/MergePanel.tsx`
- Modify: `frontend/src/components/pdf/PdfToolkit.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `AcceptedPdf`, `PdfDropzone` from Task 6; `mergePdfs`, `inspectPdf`, `moveItem`, `formatBytes` from `@/lib/pdf`.
- Produces: `MergePanel` (named export), `downloadBytes(bytes: Uint8Array, filename: string): void` added to `@/lib/pdf`, and a `reduced-transparency:` Tailwind variant.

- [ ] **Step 0: Add a `prefers-reduced-transparency` variant**

Tailwind v4 ships `motion-reduce:` and `contrast-more:` but has no built-in variant for `prefers-reduced-transparency`, and that is the query the translucent action bar needs — reduced *motion* is a different user preference. Add a custom variant to `frontend/src/index.css`, immediately after the `@plugin "@tailwindcss/typography";` line:

```css
/* Tailwind has no built-in variant for this preference. Used by translucent
   surfaces so they fall back to solid for users who ask for less transparency. */
@custom-variant reduced-transparency (@media (prefers-reduced-transparency: reduce));
```

- [ ] **Step 1: Add the download helper**

Append to `frontend/src/lib/pdf.ts`:

```ts
/** Trigger a browser download. The object URL is revoked so the blob can be freed. */
export const downloadBytes = (bytes: Uint8Array, filename: string): void => {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 2: Create the panel**

Create `frontend/src/components/pdf/MergePanel.tsx`:

```tsx
import { useCallback, useState } from "react";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Download, GripVertical, Loader2, X } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { downloadBytes, formatBytes, inspectPdf, mergePdfs, moveItem } from "@/lib/pdf";

interface MergeRow extends AcceptedPdf {
  pageCount: number | null;
  error: string | null;
}

export function MergePanel() {
  const [rows, setRows] = useState<MergeRow[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const addFiles = useCallback(async (files: AcceptedPdf[]) => {
    // PdfDropzone already assigns a collision-free id, so do not override it here.
    const pending: MergeRow[] = files.map((file) => ({
      ...file,
      pageCount: null,
      error: null,
    }));
    setRows((current) => [...current, ...pending]);

    // Inspect each file individually: one corrupt or locked file must not
    // invalidate the others.
    for (const row of pending) {
      let patch: Partial<MergeRow>;
      try {
        const info = await inspectPdf(row.bytes);
        patch = info.isEncrypted
          ? { error: "Locked. Unlock it in the Unlock tab first." }
          : { pageCount: info.pageCount };
      } catch {
        patch = { error: "Could not be read. It may be corrupt." };
      }
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, ...patch } : item)),
      );
    }
  }, []);

  const usable = rows.filter((row) => row.error === null);

  const onExport = async () => {
    setFailure(null);
    setProgress({ done: 0, total: usable.length });
    try {
      const merged = await mergePdfs(
        usable.map((row) => row.bytes),
        (done, total) => setProgress({ done, total }),
      );
      downloadBytes(merged, "merged.pdf");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Merge failed.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <PdfDropzone
        multiple
        label={
          rows.length === 0
            ? "Drop PDFs here, or click to choose"
            : "Add more PDFs"
        }
        onAccept={(files) => void addFiles(files)}
      />

      {rows.length > 0 && (
        <Reorder.Group axis="y" values={rows} onReorder={setRows} className="space-y-2">
          {rows.map((row) => (
            <MergeRowItem
              key={row.id}
              row={row}
              index={rows.findIndex((item) => item.id === row.id)}
              total={rows.length}
              onMove={(from, to) => setRows((current) => moveItem(current, from, to))}
              onRemove={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            />
          ))}
        </Reorder.Group>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {rows.length > 0 && (
        // Translucent action bar with the list scrolling under it.
        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur-md reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
          <p className="text-sm text-muted-foreground tabular-nums">
            {progress
              ? `Merging file ${progress.done} of ${progress.total}`
              : `${usable.length} file${usable.length === 1 ? "" : "s"} ready`}
          </p>
          <Button onClick={() => void onExport()} disabled={usable.length < 2 || progress !== null}>
            {progress ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export merged PDF
          </Button>
        </div>
      )}
    </div>
  );
}

interface MergeRowItemProps {
  row: MergeRow;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

function MergeRowItem({ row, index, total, onMove, onRemove }: MergeRowItemProps) {
  const controls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  return (
    <Reorder.Item
      value={row}
      // Drag only from the grip, so the rest of the row stays clickable.
      dragListener={false}
      dragControls={controls}
      // Bounce is earned here: a drag release carries real momentum.
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", bounce: 0.2, duration: 0.4 }
      }
      whileDrag={prefersReducedMotion ? undefined : { scale: 1.02, zIndex: 1 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
    >
      <button
        type="button"
        aria-label={`Reorder ${row.name}`}
        // Lift on pointer-down, so the grab registers before any movement.
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {row.error
            ? row.error
            : `${formatBytes(row.size)}${row.pageCount === null ? "" : ` · ${row.pageCount} page${row.pageCount === 1 ? "" : "s"}`}`}
        </p>
      </div>

      {/* Reorder is pointer-only, so keyboard users get explicit controls. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${row.name} up`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${row.name} down`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Remove ${row.name}`} onClick={onRemove}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Reorder.Item>
  );
}
```

- [ ] **Step 3: Mount it in the shell**

In `frontend/src/components/pdf/PdfToolkit.tsx`, remove the Task 6 scaffolding: the `PdfDropzone` import, the `acceptedNames` state, and the `<ul>`. Import `MergePanel`, and replace the `<Card>…</Card>` block inside the `motion.div` with:

```tsx
          {mode === "merge" && <MergePanel />}
          {mode !== "merge" && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {mode} panel coming in a later task.
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 4: Verify by hand**

Run: `cd frontend && npm run dev`, open `/pdf-toolkit`, Merge tab:

- Drop three PDFs. Each row shows its size and page count.
- Drag the third row to the top by its grip. Neighbours move aside **during** the drag, and the row settles with a slight overshoot.
- Try dragging from the filename rather than the grip: it must not drag.
- Use the ↑/↓ buttons; they are disabled at the ends.
- Click "Export merged PDF". The downloaded `merged.pdf` page order matches the on-screen order.
- Drop a password-protected PDF: its row shows "Locked. Unlock it in the Unlock tab first." and it is excluded from the count. The other files still export.
- With macOS System Settings → Accessibility → Display → Reduce motion enabled, reload: dragging still works, with no overshoot.

- [ ] **Step 5: Verify tests and build**

Run: `cd frontend && npm test && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/pdf.ts frontend/src/index.css \
        frontend/src/components/pdf/MergePanel.tsx frontend/src/components/pdf/PdfToolkit.tsx
git commit -m "feat: add PDF merge panel with drag reorder"
```

---

### Task 8: Unlock panel

**Files:**
- Create: `frontend/src/components/pdf/UnlockPanel.tsx`
- Modify: `frontend/src/components/pdf/PdfToolkit.tsx`

**Interfaces:**
- Consumes: `PdfDropzone`, `AcceptedPdf` from Task 6; `inspectPdf`, `decryptPdf`, `downloadBytes` from `@/lib/pdf`.
- Produces: `UnlockPanel` (named export).

- [ ] **Step 1: Create the panel**

Create `frontend/src/components/pdf/UnlockPanel.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, LockOpen } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decryptPdf, downloadBytes, inspectPdf } from "@/lib/pdf";

type Status =
  | { kind: "idle" }
  | { kind: "not-encrypted" }
  | { kind: "needs-password" }
  | { kind: "working" }
  | { kind: "done"; bytes: Uint8Array; rebuilt: boolean }
  | { kind: "error"; message: string };

export function UnlockPanel() {
  const [file, setFile] = useState<AcceptedPdf | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // The password never outlives the component.
  useEffect(() => () => setPassword(""), []);

  const attempt = useCallback(async (target: AcceptedPdf, candidate: string) => {
    setStatus({ kind: "working" });
    try {
      const result = await decryptPdf(target.bytes, candidate);
      setStatus({ kind: "done", bytes: result.bytes, rebuilt: result.rebuilt });
    } catch {
      setStatus(
        candidate === ""
          ? { kind: "needs-password" }
          : { kind: "error", message: "That password did not work. Try again." },
      );
    }
  }, []);

  const onAccept = useCallback(
    async ([accepted]: AcceptedPdf[]) => {
      setFile(accepted);
      setPassword("");
      setStatus({ kind: "working" });
      try {
        const info = await inspectPdf(accepted.bytes);
        if (!info.isEncrypted) {
          setStatus({ kind: "not-encrypted" });
          return;
        }
        // An empty password clears the whole permission-restricted class with
        // no prompt at all.
        await attempt(accepted, "");
      } catch {
        setStatus({ kind: "error", message: "This PDF could not be read. It may be corrupt." });
      }
    },
    [attempt],
  );

  return (
    <div className="space-y-4">
      <PdfDropzone label="Drop a locked PDF here, or click to choose" onAccept={(files) => void onAccept(files)} />

      <p className="text-xs text-muted-foreground">
        Works on PDFs you can already open, and on password-protected PDFs when you
        enter the password. It does not guess or crack passwords.
      </p>

      {status.kind === "working" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Working…
        </p>
      )}

      {status.kind === "not-encrypted" && (
        <p className="text-sm text-muted-foreground">
          {file?.name} is not locked — there is nothing to remove.
        </p>
      )}

      {(status.kind === "needs-password" || status.kind === "error") && file && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void attempt(file, password);
          }}
        >
          <Label htmlFor="pdf-password">Password for {file.name}</Label>
          <div className="flex gap-2">
            <Input
              id="pdf-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter the PDF password"
            />
            <Button type="submit" disabled={password.length === 0}>
              <LockOpen className="h-4 w-4" aria-hidden="true" />
              Unlock
            </Button>
          </div>
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
        </form>
      )}

      {status.kind === "done" && file && (
        <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm">Unlocked. The copy has no password and no restrictions.</p>
          {status.rebuilt && (
            <p className="text-sm text-muted-foreground">
              This file needed a page-level rebuild, so bookmarks and form fields may
              not have carried over.
            </p>
          )}
          <Button onClick={() => downloadBytes(status.bytes, `unlocked-${file.name}`)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download unlocked PDF
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the shell**

In `frontend/src/components/pdf/PdfToolkit.tsx`, import `UnlockPanel` and add `{mode === "unlock" && <UnlockPanel />}` alongside the merge line. Update the fallback condition to `{mode !== "merge" && mode !== "unlock" && (`.

- [ ] **Step 3: Create test PDFs to verify against**

Run this from the repo root to generate three files in `/tmp`:

```bash
cd frontend && node -e '
const { PDFDocument } = require("@cantoo/pdf-lib");
const fs = require("fs");
(async () => {
  const plain = await PDFDocument.create(); plain.addPage([300,300]);
  fs.writeFileSync("/tmp/plain.pdf", await plain.save());

  const perm = await PDFDocument.create(); perm.addPage([300,300]);
  perm.encrypt({ ownerPassword: "owner", permissions: { copying: false, printing: false } });
  fs.writeFileSync("/tmp/restricted.pdf", await perm.save());

  const pw = await PDFDocument.create(); pw.addPage([300,300]); pw.addPage([300,300]);
  pw.encrypt({ userPassword: "hunter2", ownerPassword: "owner" });
  fs.writeFileSync("/tmp/locked.pdf", await pw.save());
  console.log("wrote /tmp/plain.pdf /tmp/restricted.pdf /tmp/locked.pdf");
})();
'
```

- [ ] **Step 4: Verify by hand**

Run: `cd frontend && npm run dev`, open `/pdf-toolkit`, Unlock tab:

- Drop `/tmp/plain.pdf` → "is not locked — there is nothing to remove." No password field.
- Drop `/tmp/restricted.pdf` → unlocks with **no password prompt**. Download it and confirm it opens.
- Drop `/tmp/locked.pdf` → a password field appears. Type `wrong` → inline error, and both the file and the field stay put. Type `hunter2` → unlocks. The downloaded file opens with no password prompt.
- Confirm the password field never appears in the URL and nothing is logged to the console.

- [ ] **Step 5: Verify tests and build**

Run: `cd frontend && npm test && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/pdf/UnlockPanel.tsx frontend/src/components/pdf/PdfToolkit.tsx
git commit -m "feat: add PDF unlock panel"
```

---

### Task 9: PDF to Image panel

**Files:**
- Modify: `frontend/src/lib/pdf.ts`
- Create: `frontend/src/components/pdf/ToImagePanel.tsx`
- Modify: `frontend/src/components/pdf/PdfToolkit.tsx`

**Interfaces:**
- Consumes: `PdfDropzone`, `AcceptedPdf` from Task 6; `dpiToScale` from `@/lib/pdf`.
- Produces:
  - `renderPdfToImages(bytes, options): Promise<RenderedPage[]>` where
    `options = { dpi: number; format: "png" | "jpeg"; quality: number; onProgress?: (done: number, total: number) => void }`
  - `interface RenderedPage { pageNumber: number; blob: Blob; url: string }`
  - `zipFiles(entries: Array<{ name: string; blob: Blob }>): Promise<Uint8Array>`
  - `downloadBlob(blob: Blob, filename: string): void`
  - `ToImagePanel` (named export)

- [ ] **Step 1: Add the render and zip helpers**

Append to `frontend/src/lib/pdf.ts`:

```ts
export interface RenderedPage {
  pageNumber: number;
  blob: Blob;
  url: string;
}

export interface RenderOptions {
  dpi: number;
  format: "png" | "jpeg";
  /** JPEG only, 0–1. Ignored for PNG. */
  quality: number;
  onProgress?: (done: number, total: number) => void;
}

/** Render every page to an image. Uses pdf.js, which does its work in a worker. */
export const renderPdfToImages = async (
  bytes: Uint8Array,
  { dpi, format, quality, onProgress }: RenderOptions,
): Promise<RenderedPage[]> => {
  const pdfjs = await import("pdfjs-dist");
  // Vite resolves this to a hashed worker asset at build time.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  // pdf.js takes ownership of the buffer, so hand it a copy.
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const scale = dpiToScale(dpi);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const pages: RenderedPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      // pdf.js v6: `canvas` is the required parameter and `canvasContext` is the
      // legacy one. Passing both is ambiguous — the type docs state that if the
      // context is used, `canvas` must be null. Pass the canvas alone.
      await page.render({ canvas, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Could not encode the page."))),
          mimeType,
          format === "jpeg" ? quality : undefined,
        );
      });

      pages.push({ pageNumber, blob, url: URL.createObjectURL(blob) });
      page.cleanup();
      // Zero the canvas so a long document does not accumulate memory.
      canvas.width = 0;
      canvas.height = 0;
      onProgress?.(pageNumber, doc.numPages);
    }
  } finally {
    await doc.destroy();
  }

  return pages;
};

/** Store-only ZIP. The images are already compressed, so deflate would only cost time. */
export const zipFiles = async (
  entries: Array<{ name: string; blob: Blob }>,
): Promise<Uint8Array> => {
  const { zipSync } = await import("fflate");
  const payload: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const entry of entries) {
    payload[entry.name] = [new Uint8Array(await entry.blob.arrayBuffer()), { level: 0 }];
  }
  return zipSync(payload);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 2: Create the panel**

Create `frontend/src/components/pdf/ToImagePanel.tsx`:

```tsx
import { useCallback, useEffect, useState } from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { downloadBlob, renderPdfToImages, zipFiles, type RenderedPage } from "@/lib/pdf";

const DPI_PRESETS = [
  { dpi: 72, label: "72 DPI (screen)" },
  { dpi: 150, label: "150 DPI (print)" },
  { dpi: 300, label: "300 DPI (high)" },
];

export function ToImagePanel() {
  const [file, setFile] = useState<AcceptedPdf | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.85);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Object URLs are not garbage collected. Revoke them when they are replaced.
  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages]);

  const render = useCallback(
    async (target: AcceptedPdf) => {
      setFailure(null);
      setPages([]);
      setProgress({ done: 0, total: 0 });
      try {
        const rendered = await renderPdfToImages(target.bytes, {
          dpi,
          format,
          quality,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        setPages(rendered);
      } catch {
        setFailure("This PDF could not be rendered. If it is locked, unlock it first.");
      } finally {
        setProgress(null);
      }
    },
    [dpi, format, quality],
  );

  const baseName = file?.name.replace(/\.pdf$/i, "") ?? "page";
  const extension = format === "png" ? "png" : "jpg";

  return (
    <div className="space-y-4">
      <PdfDropzone
        label="Drop a PDF here, or click to choose"
        onAccept={([accepted]) => {
          setFile(accepted);
          void render(accepted);
        }}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Format</Label>
          <div className="flex gap-2">
            {(["png", "jpeg"] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={format === option ? "default" : "outline"}
                onClick={() => setFormat(option)}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Resolution</Label>
          <div className="flex flex-wrap gap-2">
            {DPI_PRESETS.map((preset) => (
              <Button
                key={preset.dpi}
                size="sm"
                variant={dpi === preset.dpi ? "default" : "outline"}
                onClick={() => setDpi(preset.dpi)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {format === "jpeg" && (
          <div className="space-y-1">
            <Label htmlFor="jpeg-quality">
              JPEG quality <span className="tabular-nums">{Math.round(quality * 100)}%</span>
            </Label>
            <input
              id="jpeg-quality"
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="w-48"
            />
          </div>
        )}

        {file && (
          <Button variant="outline" onClick={() => void render(file)} disabled={progress !== null}>
            Re-render
          </Button>
        )}
      </div>

      {progress && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {progress.total === 0
            ? "Opening document…"
            : `Rendering page ${progress.done} of ${progress.total}`}
        </p>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {pages.length} image{pages.length === 1 ? "" : "s"}
            </p>
            <Button
              onClick={async () => {
                const zipped = await zipFiles(
                  pages.map((page) => ({
                    name: `${baseName}-${String(page.pageNumber).padStart(3, "0")}.${extension}`,
                    blob: page.blob,
                  })),
                );
                downloadBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), `${baseName}-images.zip`);
              }}
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              Download all as ZIP
            </Button>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page) => (
              <li key={page.pageNumber} className="space-y-2 rounded-xl border border-border p-2">
                <img
                  src={page.url}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full rounded-md border border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    downloadBlob(
                      page.blob,
                      `${baseName}-${String(page.pageNumber).padStart(3, "0")}.${extension}`,
                    )
                  }
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Page {page.pageNumber}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it in the shell**

In `frontend/src/components/pdf/PdfToolkit.tsx`, import `ToImagePanel`, add `{mode === "to-image" && <ToImagePanel />}`, and narrow the fallback to `{mode === "compress" && (`.

- [ ] **Step 4: Verify by hand**

Run: `cd frontend && npm run dev`, open `/pdf-toolkit`, To Image tab:

- Drop a multi-page PDF. Progress counts up page by page, and thumbnails appear.
- Switch to JPEG. The quality slider appears. Click Re-render and confirm the images change.
- Download a single page; it opens correctly.
- "Download all as ZIP" produces a ZIP whose contents are named `<file>-001.png`, `<file>-002.png`, …
- Switch to 300 DPI, re-render, and confirm the images are visibly larger.
- Open DevTools → Network, reload, and confirm `pdfjs-dist` is only requested **after** the To Image tab is opened, not on page load.

- [ ] **Step 5: Verify tests and build**

Run: `cd frontend && npm test && npm run build`
Expected: both exit 0. Confirm the build output lists a separate `pdf.worker` chunk.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/pdf.ts frontend/src/components/pdf/ToImagePanel.tsx frontend/src/components/pdf/PdfToolkit.tsx
git commit -m "feat: add PDF to image panel with zip export"
```

---

### Task 10: Compress panel

**Files:**
- Modify: `frontend/src/lib/pdf.ts`
- Create: `frontend/src/components/pdf/CompressPanel.tsx`
- Modify: `frontend/src/components/pdf/PdfToolkit.tsx`

**Interfaces:**
- Consumes: `compressLossless`, `renderPdfToImages`, `pickSmaller`, `formatBytes`, `downloadBytes` from `@/lib/pdf`.
- Produces: `compressAggressive(bytes, options): Promise<{ bytes: Uint8Array; saved: number }>` and `CompressPanel` (named export).

- [ ] **Step 1: Add the aggressive compressor**

Append to `frontend/src/lib/pdf.ts`:

```ts
/**
 * Raster compression: render each page to JPEG and rebuild the document from
 * those images at the original page size. Big savings on scans; the text stops
 * being text. This is renderPdfToImages piped into a pdf-lib rebuild.
 */
export const compressAggressive = async (
  bytes: Uint8Array,
  {
    dpi,
    quality,
    onProgress,
  }: { dpi: number; quality: number; onProgress?: (done: number, total: number) => void },
): Promise<{ bytes: Uint8Array; saved: number }> => {
  const { PDFDocument } = await loadPdfLib();
  const pages = await renderPdfToImages(bytes, { dpi, format: "jpeg", quality, onProgress });

  try {
    const out = await PDFDocument.create();
    const scale = dpiToScale(dpi);
    for (const page of pages) {
      const jpeg = await out.embedJpg(new Uint8Array(await page.blob.arrayBuffer()));
      // Divide by scale to restore the original page dimensions in PDF units.
      const width = jpeg.width / scale;
      const height = jpeg.height / scale;
      const target = out.addPage([width, height]);
      target.drawImage(jpeg, { x: 0, y: 0, width, height });
    }
    const candidate = await out.save({ useObjectStreams: true, objectsPerTick: 200 });
    return pickSmaller(bytes, candidate);
  } finally {
    pages.forEach((page) => URL.revokeObjectURL(page.url));
  }
};
```

- [ ] **Step 2: Create the panel**

Create `frontend/src/components/pdf/CompressPanel.tsx`:

```tsx
import { useCallback, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  compressAggressive,
  compressLossless,
  downloadBytes,
  formatBytes,
} from "@/lib/pdf";

interface Result {
  bytes: Uint8Array;
  saved: number;
  originalSize: number;
}

export function CompressPanel() {
  const [file, setFile] = useState<AcceptedPdf | null>(null);
  const [aggressive, setAggressive] = useState(false);
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.7);
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = useCallback(
    async (target: AcceptedPdf) => {
      setFailure(null);
      setResult(null);
      setProgress({ done: 0, total: 0 });
      try {
        const outcome = aggressive
          ? await compressAggressive(target.bytes, {
              dpi,
              quality,
              onProgress: (done, total) => setProgress({ done, total }),
            })
          : await compressLossless(target.bytes);
        setResult({ ...outcome, originalSize: target.bytes.length });
      } catch {
        setFailure("This PDF could not be compressed. If it is locked, unlock it first.");
      } finally {
        setProgress(null);
      }
    },
    [aggressive, dpi, quality],
  );

  return (
    <div className="space-y-4">
      <PdfDropzone
        label="Drop a PDF here, or click to choose"
        onAccept={([accepted]) => {
          setFile(accepted);
          void run(accepted);
        }}
      />

      <div className="space-y-3 rounded-xl border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Switch id="aggressive" checked={aggressive} onCheckedChange={setAggressive} />
          <Label htmlFor="aggressive">Aggressive (rasterise pages)</Label>
        </div>

        {aggressive ? (
          <>
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Every page becomes a picture. Text will not be selectable or searchable,
              and links will stop working. Good for scans, bad for documents.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label>Resolution</Label>
                <div className="flex gap-2">
                  {[100, 150, 200].map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant={dpi === option ? "default" : "outline"}
                      onClick={() => setDpi(option)}
                    >
                      {option} DPI
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="compress-quality">
                  JPEG quality <span className="tabular-nums">{Math.round(quality * 100)}%</span>
                </Label>
                <input
                  id="compress-quality"
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-48"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Lossless. Drops unused objects and edit history, then recompresses. Text,
            links and search all keep working. Often saves little on an already-optimised file.
          </p>
        )}

        {file && (
          <Button variant="outline" onClick={() => void run(file)} disabled={progress !== null}>
            Re-run
          </Button>
        )}
      </div>

      {progress && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {progress.total === 0
            ? "Compressing…"
            : `Rendering page ${progress.done} of ${progress.total}`}
        </p>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {result && file && (
        <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3">
          {result.saved === 0 ? (
            // Never dress a non-saving as a win, and never offer a bigger download.
            <p className="text-sm">
              Already optimised — nothing to save. The original is
              {" "}
              <span className="tabular-nums">{formatBytes(result.originalSize)}</span>
              {aggressive ? "" : ". Try aggressive mode if this is a scanned document."}
            </p>
          ) : (
            <>
              <p className="text-sm tabular-nums">
                {formatBytes(result.originalSize)} → {formatBytes(result.bytes.length)}
                {" · "}
                {Math.round((result.saved / result.originalSize) * 100)}% smaller
              </p>
              <Button onClick={() => downloadBytes(result.bytes, `compressed-${file.name}`)}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download compressed PDF
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it in the shell**

In `frontend/src/components/pdf/PdfToolkit.tsx`, import `CompressPanel` and replace the remaining fallback `<Card>…</Card>` block with `{mode === "compress" && <CompressPanel />}`. The `Card` and `CardContent` imports are now unused — remove them, or `tsc -b` will fail under `strict`.

- [ ] **Step 4: Verify by hand**

Run: `cd frontend && npm run dev`, open `/pdf-toolkit`, Compress tab:

- Drop a small, simple PDF in lossless mode → "Already optimised — nothing to save", and **no download button appears**. This is the regression this task exists to prevent.
- Drop a large image-heavy PDF in lossless mode → a percentage saving and a working download.
- Turn on Aggressive. The warning and the DPI/quality controls appear. Re-run and confirm a much larger saving.
- Open the aggressive output and confirm the text can no longer be selected — that is expected, and the warning said so.
- Drop a locked PDF → the failure message points at the Unlock tab rather than throwing.

- [ ] **Step 5: Verify tests and build**

Run: `cd frontend && npm test && npm run build`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/pdf.ts frontend/src/components/pdf/CompressPanel.tsx frontend/src/components/pdf/PdfToolkit.tsx
git commit -m "feat: add PDF compress panel with lossless and raster modes"
```

---

### Task 11: Documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: everything.
- Produces: nothing.

- [ ] **Step 1: Add the tool to the README**

In `README.md`, under "## Frontend Tools", add `- PDF Toolkit` immediately after `- Markdown to PDF`. Then add this section immediately before "## Persistence Notes":

```markdown
## PDF Toolkit

`/pdf-toolkit` runs entirely in the browser — no PDF, and no password, is ever
uploaded. Four tabs share one page:

- **Merge** — reorder files by dragging the grip or with the ↑/↓ buttons, add more
  without losing the list, export as one PDF.
- **Unlock** — removes permission restrictions with no prompt, and removes an open
  password when you supply it. It cannot guess or crack passwords.
- **To Image** — renders pages to PNG or JPEG at 72/150/300 DPI, single download or
  ZIP.
- **Compress** — lossless by default; an aggressive mode rasterises pages for far
  bigger savings at the cost of selectable text.

Libraries load on demand: `@cantoo/pdf-lib` (MIT), `pdfjs-dist` (Apache-2.0), and
`fflate` (MIT) are all dynamically imported from `frontend/src/lib/pdf.ts` and stay
out of the initial bundle.

Two implementation notes worth keeping:

- Decrypting is not just `load({ password })` then `save()`. The original encryption
  dictionary survives as an orphaned object and the output reloads as encrypted, so
  `decryptPdf` deletes it explicitly, verifies the result with a plain load, and only
  then falls back to a page-level rebuild.
- Compression can produce a **larger** file — object streams add overhead a small
  document never recovers. Both modes compare sizes and return the original when the
  candidate is not smaller.

Run the unit tests with `cd frontend && npm test`.
```

- [ ] **Step 2: Add a changelog entry**

In `CHANGELOG.md`, insert this immediately after the "and this project adheres to Semantic Versioning" line and before `## [0.2.0] - 2026-02-24`:

```markdown
## [0.3.0] - 2026-08-12

### Minor change

- **PDF Toolkit:** New `/pdf-toolkit` tool with four tabs — Merge, Unlock, To Image, and Compress. All processing happens in the browser; no file or password is uploaded.
- **PDF Toolkit:** Merge supports drag-to-reorder from a grip handle, keyboard ↑/↓ reordering, and adding more files without losing the list.
- **PDF Toolkit:** Unlock removes permission restrictions with no prompt, and removes an open password when you supply it. It does not guess or crack passwords.
- **PDF Toolkit:** To Image renders pages to PNG or JPEG at 72/150/300 DPI, with single-page or ZIP download.
- **PDF Toolkit:** Compress defaults to a lossless pass and offers an opt-in aggressive raster mode. Neither mode ever returns a file larger than the input.
- **UI:** Shared `Button` now responds on pointer-down with a subtle press scale, honouring `prefers-reduced-motion`.
- **Testing:** Added Vitest and unit tests for the PDF helpers (`cd frontend && npm test`).
```

Also update `frontend/package.json` `"version"` from `0.2.0` to `0.3.0`.

- [ ] **Step 3: Full verification sweep**

```bash
cd frontend && npm test && npm run build && grep -c pdf-toolkit public/sitemap.xml
```
Expected: tests pass, build exits 0, grep prints `1`.

- [ ] **Step 4: Confirm no accidental network calls**

Run `cd frontend && npm run dev`, open `/pdf-toolkit`, open DevTools → Network, and clear the log. Exercise all four tabs with a real PDF. The only requests must be for local JS chunks and the pdf.js worker. There must be no request carrying PDF bytes or a password.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md frontend/package.json
git commit -m "docs: document the PDF toolkit and bump to 0.3.0"
```

---

## Notes for the implementer

**Why `@cantoo/pdf-lib` and not `pdf-lib`.** The original `pdf-lib` was last published in 2022 and cannot decrypt. The `@cantoo` fork is MIT, actively maintained, and adds the password support the Unlock tab depends on.

**Why not `mupdf`.** It would do all four jobs in one library and compress genuinely better. It is AGPL-3.0-or-later, and this repo is MIT. Do not add it.

**The decrypt behaviour is counter-intuitive and verified.** If you find yourself simplifying `decryptPdf` to a plain load-and-save, re-read the comment in the function. That version produces a file that reloads as encrypted. The test in Task 3 will catch it.
