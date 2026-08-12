# Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/downloader` tool to Pocket DevTools that resolves media links through a self-hosted fork of cobalt, presented explicitly as a fork.

**Architecture:** A React route posts to `/api/download`, a zero-dependency TypeScript Vercel Function in this repo. The function validates input, forwards to the cobalt instance with a server-side API key, and relays a field-allowlisted JSON response. The browser then fetches media bytes **directly** from the cobalt instance — no media ever transits Vercel. The existing FastAPI backend is not touched.

**Tech Stack:** React 19 + TypeScript + TanStack Router + Tailwind (existing frontend), Vercel Functions on Node 24 with native `fetch`, vitest for both test suites.

**Spec:** `docs/superpowers/specs/2026-08-12-downloader-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Never send `localProcessing`** to cobalt. Its default is `disabled`; keeping it there is what avoids a client-side ffmpeg-wasm pipeline.
- **`api/` has zero runtime dependencies.** Native `fetch` only. No Express, no HTTP client library.
- **No `vercel.json` change.** The existing rewrite `/((?!api(?:$|/)|s(?:$|/)).*)` already excludes `/api/`.
- **No Python changes.** Do not touch `backend/` or `requirements.txt`.
- **Never leak `COBALT_API_URL` or `COBALT_API_KEY`** in any response body, error message, or log.
- **Media bytes are never proxied.** The function returns URLs; the browser fetches them.
- **Download modes:** exactly `auto` | `audio` | `mute`, default `auto`.
- **Video qualities:** exactly `max` | `1080` | `720` | `480` | `360`, default `1080`.
- **Attribution copy is verbatim and always visible** — not collapsed, not a tooltip. Exact wording in Task 3.
- Frontend tests run from `frontend/` (`npm test`); function tests run from the repo root (`npm test`).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `frontend/src/lib/downloader.ts` | **New.** Pure logic: payload building, response normalization, error copy, filename derivation. No React, no `fetch`. |
| `frontend/src/lib/downloader.test.ts` | **New.** Vitest for the above. |
| `frontend/src/routes/DownloaderPage.tsx` | **New.** UI only: form state, attribution block, result rendering. |
| `api/download.ts` | **New.** The proxy. Method check, URL validation, param allowlist, key injection, response sanitizing. |
| `api/download.test.ts` | **New.** Vitest for the proxy's guards. |
| `package.json` | **New**, repo root. `vitest` devDependency + `test` script. No runtime deps. |
| `vitest.config.ts` | **New**, repo root. Scopes `include` to `api/**/*.test.ts`. |
| `frontend/src/config/tools.ts` | Add `downloader` to `ToolId`, `ToolPath`, and the `tools` array. |
| `frontend/src/routes/HomePage.tsx` | Add the `toolIcons` entry (compile error without it). |
| `frontend/src/router.tsx` | Lazy import + route + `addChildren` entry. |
| `frontend/scripts/generate-sitemap.mjs` | One entry in the hand-maintained array. |

Task 1 produces the types Task 3 consumes. Task 2 is independent of both and can be built in parallel. Task 4 cannot compile until Task 3 exists.

---

### Task 1: Pure downloader logic

**Files:**
- Create: `frontend/src/lib/downloader.ts`
- Test: `frontend/src/lib/downloader.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, all imported by Task 3:
  - Types: `DownloadMode`, `VideoQuality`, `DownloadRequest`, `PickerItem`, `CobaltResponse`, `DownloadResult`.
  - Constants: `DOWNLOAD_MODES: DownloadMode[]`, `VIDEO_QUALITIES: VideoQuality[]` — the page renders its `Select` options from these, so the UI can never drift from the validated set.
  - Functions: `buildCobaltPayload(request: DownloadRequest): Record<string, string>`, `normalizeCobaltResponse(raw: CobaltResponse): DownloadResult`, `mapErrorCode(code: string): string`, `deriveFilename(url: string, provided?: string): string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/downloader.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildCobaltPayload,
  deriveFilename,
  mapErrorCode,
  normalizeCobaltResponse,
} from "@/lib/downloader";

describe("buildCobaltPayload", () => {
  it("trims the url and passes mode and quality through", () => {
    expect(
      buildCobaltPayload({
        url: "  https://youtube.com/watch?v=abc  ",
        downloadMode: "auto",
        videoQuality: "720",
      }),
    ).toEqual({
      url: "https://youtube.com/watch?v=abc",
      downloadMode: "auto",
      videoQuality: "720",
    });
  });

  it("omits videoQuality for audio-only downloads", () => {
    const payload = buildCobaltPayload({
      url: "https://youtube.com/watch?v=abc",
      downloadMode: "audio",
      videoQuality: "1080",
    });
    expect(payload).not.toHaveProperty("videoQuality");
    expect(payload.downloadMode).toBe("audio");
  });

  it("never includes localProcessing", () => {
    const payload = buildCobaltPayload({
      url: "https://youtube.com/watch?v=abc",
      downloadMode: "auto",
      videoQuality: "max",
    });
    expect(payload).not.toHaveProperty("localProcessing");
  });
});

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

describe("deriveFilename", () => {
  it("prefers the filename cobalt supplied", () => {
    expect(deriveFilename("https://cdn.example.com/x.mp4", "pretty name.mp4")).toBe("pretty name.mp4");
  });

  it("falls back to the last path segment", () => {
    expect(deriveFilename("https://cdn.example.com/a/b/video.mp4")).toBe("video.mp4");
  });

  it("decodes percent-encoded segments", () => {
    expect(deriveFilename("https://cdn.example.com/my%20clip.mp4")).toBe("my clip.mp4");
  });

  it("uses a generic name when the path has no filename", () => {
    expect(deriveFilename("https://cdn.example.com/watch?v=abc")).toBe("download");
  });

  it("uses a generic name for an unparseable url", () => {
    expect(deriveFilename("not a url")).toBe("download");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npm test -- downloader
```

Expected: FAIL — `Failed to resolve import "@/lib/downloader"`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/lib/downloader.ts`:

```ts
export type DownloadMode = "auto" | "audio" | "mute";
export type VideoQuality = "max" | "1080" | "720" | "480" | "360";

export const DOWNLOAD_MODES: DownloadMode[] = ["auto", "audio", "mute"];
export const VIDEO_QUALITIES: VideoQuality[] = ["max", "1080", "720", "480", "360"];

export interface DownloadRequest {
  url: string;
  downloadMode: DownloadMode;
  videoQuality: VideoQuality;
}

export interface PickerItem {
  type: "photo" | "video" | "gif";
  url: string;
  thumb?: string;
}

export interface CobaltResponse {
  status?: string;
  url?: string;
  filename?: string;
  picker?: PickerItem[];
  error?: { code?: string };
}

export type DownloadResult =
  | { kind: "single"; url: string; filename?: string; forcesDownload: boolean }
  | { kind: "picker"; items: PickerItem[] }
  | { kind: "error"; code: string; message: string };

/**
 * cobalt's own field names, so this doubles as the request body for /api/download.
 * videoQuality is dropped for audio-only downloads, where it means nothing.
 * localProcessing is never sent — see the spec's scope section.
 */
export const buildCobaltPayload = (request: DownloadRequest): Record<string, string> => {
  const payload: Record<string, string> = {
    url: request.url.trim(),
    downloadMode: request.downloadMode,
  };
  if (request.downloadMode !== "audio") {
    payload.videoQuality = request.videoQuality;
  }
  return payload;
};

const ERROR_COPY: Record<string, string> = {
  "error.api.link.invalid": "That doesn't look like a valid link.",
  "error.api.link.unsupported": "That service isn't supported.",
  "error.api.service.unsupported": "That service isn't supported.",
  "error.api.service.disabled": "That service is turned off on this instance.",
  "error.api.fetch.empty": "Nothing downloadable was found at that link.",
  "error.api.fetch.fail": "The service refused the request. Try again shortly.",
  "error.api.content.too_long": "That file is longer than this instance allows.",
  "error.api.content.video.unavailable": "That video isn't available to download.",
  "error.api.auth.key.missing": "This downloader isn't authorised. Check the server configuration.",
  "error.api.rate_exceeded": "Too many requests. Wait a minute and try again.",
  "proxy.method_not_allowed": "That request wasn't allowed.",
  "proxy.not_configured": "The downloader isn't configured yet.",
  "proxy.unreachable": "Couldn't reach the download service.",
  "error.api.unknown": "The download service returned something unexpected.",
};

export const mapErrorCode = (code: string): string =>
  ERROR_COPY[code] ?? `Download failed (${code}).`;

const errorResult = (code: string): DownloadResult => ({
  kind: "error",
  code,
  message: mapErrorCode(code),
});

export const normalizeCobaltResponse = (raw: CobaltResponse): DownloadResult => {
  switch (raw.status) {
    case "tunnel":
    case "redirect": {
      if (!raw.url) return errorResult("error.api.fetch.empty");
      return {
        kind: "single",
        url: raw.url,
        filename: raw.filename,
        // Only tunnel responses carry Content-Disposition: attachment, so only
        // they reliably download. redirect hands header control to the CDN.
        forcesDownload: raw.status === "tunnel",
      };
    }
    case "picker": {
      if (!raw.picker?.length) return errorResult("error.api.fetch.empty");
      return { kind: "picker", items: raw.picker };
    }
    case "error":
      return errorResult(raw.error?.code ?? "error.api.unknown");
    default:
      return errorResult("error.api.unknown");
  }
};

export const deriveFilename = (url: string, provided?: string): string => {
  if (provided) return provided;
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last && last.includes(".") ? decodeURIComponent(last) : "download";
  } catch {
    return "download";
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npm test -- downloader
```

Expected: PASS, 18 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/downloader.ts frontend/src/lib/downloader.test.ts
git commit -m "feat: add pure downloader helpers with tests"
```

---

### Task 2: The Vercel Function proxy

**Files:**
- Create: `api/download.ts`
- Create: `api/download.test.ts`
- Create: `package.json` (repo root)
- Create: `vitest.config.ts` (repo root)

**Interfaces:**
- Consumes: nothing from Task 1 — the two build contexts share no code by design.
- Produces: `POST /api/download`. Request body `{ url: string, downloadMode?: string, videoQuality?: string }`. Response body is always `{ status, url?, filename?, picker?, error?: { code } }` — the exact shape Task 1's `CobaltResponse` describes. Also exports `isAllowedUrl(value: string): boolean` for testing.

**Note on the root `package.json`:** `vercel.json` pins `installCommand` to `cd frontend && npm install`, so root devDependencies are never installed during a Vercel build. `vitest` here is for local development only, and the function itself has no runtime dependencies. Run `npm install` at the repo root once before running these tests.

- [ ] **Step 1: Create the root test harness**

Create `package.json` at the repo root:

```json
{
  "name": "pocket-devtools-api",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^4.1.10"
  }
}
```

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config";

// Scoped to api/ so this suite never picks up the frontend's tests,
// which have their own runner and alias config in frontend/vite.config.ts.
export default defineConfig({
  test: {
    include: ["api/**/*.test.ts"],
    environment: "node",
  },
});
```

Then install:

```bash
npm install
```

- [ ] **Step 2: Write the failing test**

Create `api/download.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { isAllowedUrl } from "./download";

const API_URL = "https://cobalt.example.com/";
const API_KEY = "11111111-2222-3333-4444-555555555555";

const post = (body: unknown) =>
  new Request("https://pocketdevtools.app/api/download", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  process.env.COBALT_API_URL = API_URL;
  process.env.COBALT_API_KEY = API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.COBALT_API_URL;
  delete process.env.COBALT_API_KEY;
});

describe("isAllowedUrl", () => {
  it("accepts http and https", () => {
    expect(isAllowedUrl("http://example.com/a")).toBe(true);
    expect(isAllowedUrl("https://example.com/a")).toBe(true);
  });

  it("rejects other schemes so the proxy is not a general relay", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedUrl("ftp://example.com/a")).toBe(false);
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isAllowedUrl("not a url")).toBe(false);
    expect(isAllowedUrl("")).toBe(false);
  });
});

describe("POST /api/download", () => {
  it("refuses non-POST methods", async () => {
    const res = await handler.fetch(
      new Request("https://pocketdevtools.app/api/download", { method: "GET" }),
    );
    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "proxy.method_not_allowed" },
    });
  });

  it("returns 503 when COBALT_API_URL is unset instead of crashing", async () => {
    delete process.env.COBALT_API_URL;
    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "proxy.not_configured" },
    });
  });

  it("rejects a disallowed scheme", async () => {
    const res = await handler.fetch(post({ url: "file:///etc/passwd" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "error.api.link.invalid" },
    });
  });

  it("rejects a malformed body", async () => {
    const res = await handler.fetch(
      new Request("https://pocketdevtools.app/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("sends the api key upstream but never returns it", async () => {
    const spy = vi.fn().mockResolvedValue(
      jsonResponse({ status: "tunnel", url: `${API_URL}tunnel?id=1`, filename: "clip.mp4" }),
    );
    vi.stubGlobal("fetch", spy);

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    const sentHeaders = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(sentHeaders.authorization).toBe(`Api-Key ${API_KEY}`);

    const text = await res.text();
    expect(text).not.toContain(API_KEY);
  });

  it("relays only allowlisted fields, dropping anything unexpected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "tunnel",
          url: `${API_URL}tunnel?id=1`,
          filename: "clip.mp4",
          debug: { key: API_KEY, instance: API_URL },
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    const body = await res.json();
    expect(body).toEqual({
      status: "tunnel",
      url: `${API_URL}tunnel?id=1`,
      filename: "clip.mp4",
    });
    expect(body).not.toHaveProperty("debug");
  });

  it("does not forward client-supplied cobalt options", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(
      post({
        url: "https://youtube.com/watch?v=abc",
        localProcessing: "forced",
        alwaysProxy: true,
        audioBitrate: "320",
      }),
    );

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent).not.toHaveProperty("localProcessing");
    expect(sent).not.toHaveProperty("alwaysProxy");
    expect(sent).not.toHaveProperty("audioBitrate");
    expect(sent).toEqual({
      url: "https://youtube.com/watch?v=abc",
      downloadMode: "auto",
      videoQuality: "1080",
    });
  });

  it("falls back to defaults for invalid mode and quality", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(
      post({ url: "https://youtube.com/watch?v=abc", downloadMode: "bogus", videoQuality: "9000" }),
    );

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent.downloadMode).toBe("auto");
    expect(sent.videoQuality).toBe("1080");
  });

  it("omits videoQuality for audio-only requests", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(post({ url: "https://youtube.com/watch?v=abc", downloadMode: "audio" }));

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent).not.toHaveProperty("videoQuality");
  });

  it("relays a cobalt error with its code intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ status: "error", error: { code: "error.api.service.unsupported" } }, 400),
      ),
    );

    const res = await handler.fetch(post({ url: "https://example.com/x" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      status: "error",
      error: { code: "error.api.service.unsupported" },
    });
  });

  it("returns 502 without leaking the instance url when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`connect ECONNREFUSED ${API_URL}`)));

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("proxy.unreachable");
    expect(text).not.toContain("cobalt.example.com");
  });

  it("returns 502 when upstream sends unparseable json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>gateway error</html>", { status: 200 })),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(502);
  });

  it("works when no api key is configured", async () => {
    delete process.env.COBALT_API_KEY;
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(200);
    const sentHeaders = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(sentHeaders).not.toHaveProperty("authorization");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./download`.

- [ ] **Step 4: Write minimal implementation**

Create `api/download.ts`:

```ts
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MODES = new Set(["auto", "audio", "mute"]);
const QUALITIES = new Set(["max", "1080", "720", "480", "360"]);
const TIMEOUT_MS = 30_000;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const fail = (code: string, status: number): Response =>
  json({ status: "error", error: { code } }, status);

export const isAllowedUrl = (value: string): boolean => {
  try {
    return ALLOWED_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

/**
 * Field allowlist. Anything cobalt adds that we do not know about is dropped,
 * so a future upstream field can never relay something sensitive by accident.
 */
const sanitize = (data: unknown): Record<string, unknown> => {
  const raw = (data ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {
    status: typeof raw.status === "string" ? raw.status : "error",
  };
  if (typeof raw.url === "string") out.url = raw.url;
  if (typeof raw.filename === "string") out.filename = raw.filename;
  if (Array.isArray(raw.picker)) out.picker = raw.picker;
  const code = (raw.error as Record<string, unknown> | undefined)?.code;
  if (typeof code === "string") out.error = { code };
  return out;
};

/**
 * Built server-side from an allowlist rather than relaying the client's body.
 * Otherwise a caller could set localProcessing: "forced" (breaking the
 * no-wasm assumption) or alwaysProxy: true (burning instance bandwidth).
 */
const buildPayload = (body: Record<string, unknown>, url: string): Record<string, string> => {
  const downloadMode = MODES.has(body.downloadMode as string)
    ? (body.downloadMode as string)
    : "auto";
  const payload: Record<string, string> = { url, downloadMode };
  if (downloadMode !== "audio") {
    payload.videoQuality = QUALITIES.has(body.videoQuality as string)
      ? (body.videoQuality as string)
      : "1080";
  }
  return payload;
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return fail("proxy.method_not_allowed", 405);
    }

    const apiUrl = process.env.COBALT_API_URL?.trim();
    if (!apiUrl) {
      return fail("proxy.not_configured", 503);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("error.api.link.invalid", 400);
    }

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!isAllowedUrl(url)) {
      return fail("error.api.link.invalid", 400);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    const apiKey = process.env.COBALT_API_KEY?.trim();
    if (apiKey) {
      headers.authorization = `Api-Key ${apiKey}`;
    }

    let upstream: Response;
    try {
      upstream = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(buildPayload(body, url)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Swallow the cause deliberately: it embeds COBALT_API_URL.
      return fail("proxy.unreachable", 502);
    }

    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      return fail("proxy.unreachable", 502);
    }

    return json(sanitize(data), upstream.ok ? 200 : upstream.status);
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test
```

Expected: PASS, 17 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts api/download.ts api/download.test.ts
git commit -m "feat: add zero-dependency cobalt proxy function with guard tests"
```

Do **not** commit the root `package-lock.json` in the same commit if the repo's convention differs — check `git status` and include it only if lockfiles are tracked elsewhere (`frontend/package-lock.json` is tracked, so include it).

---

### Task 3: The Downloader page

**Files:**
- Create: `frontend/src/routes/DownloaderPage.tsx`

**Interfaces:**
- Consumes: from Task 1 — `buildCobaltPayload`, `normalizeCobaltResponse`, `mapErrorCode`, `deriveFilename`, `DOWNLOAD_MODES`, `VIDEO_QUALITIES`, and types `DownloadMode`, `VideoQuality`, `DownloadResult`, `CobaltResponse`. From Task 2 — `POST /api/download`.
- Produces: named export `DownloaderPage`, which Task 4's router imports lazily.

The attribution block copy is fixed by the spec. Reproduce it exactly.

- [ ] **Step 1: Create the page**

Create `frontend/src/routes/DownloaderPage.tsx`:

```tsx
import { useState } from "react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCobaltPayload,
  deriveFilename,
  mapErrorCode,
  normalizeCobaltResponse,
  DOWNLOAD_MODES,
  VIDEO_QUALITIES,
  type CobaltResponse,
  type DownloadMode,
  type DownloadResult,
  type PickerItem,
  type VideoQuality,
} from "@/lib/downloader";

const MODE_LABELS: Record<DownloadMode, string> = {
  auto: "Video + audio",
  audio: "Audio only",
  mute: "Video, no audio",
};

function ForkNotice() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <p>
        A self-hosted fork of cobalt. Built on{" "}
        <a
          className="font-medium text-foreground underline underline-offset-4"
          href="https://github.com/imputnet/cobalt"
          target="_blank"
          rel="noreferrer noopener"
        >
          imputnet/cobalt
        </a>
        , running our own fork at{" "}
        <a
          className="font-medium text-foreground underline underline-offset-4"
          href="https://github.com/Mamik153/cobalt"
          target="_blank"
          rel="noreferrer noopener"
        >
          Mamik153/cobalt
        </a>
        . cobalt is AGPL-3.0; the instance&apos;s source is the fork linked here. Not affiliated
        with or endorsed by imputnet.
      </p>
      <p className="mt-2">
        Public content only. You are responsible for what you download and how you use it.
      </p>
    </div>
  );
}

function PickerGrid({ items }: { items: PickerItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item, index) => (
        <a
          key={`${item.url}-${index}`}
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group space-y-2 rounded-lg border border-border p-2 transition-colors hover:border-foreground/40"
        >
          {item.thumb ? (
            <img
              src={item.thumb}
              alt=""
              className="aspect-square w-full rounded object-cover"
              loading="lazy"
            />
          ) : (
            <div className="aspect-square w-full rounded bg-muted" />
          )}
          <span className="block text-xs text-muted-foreground group-hover:text-foreground">
            Item {index + 1} · {item.type}
          </span>
        </a>
      ))}
    </div>
  );
}

export function DownloaderPage() {
  const [url, setUrl] = useState("");
  const [downloadMode, setDownloadMode] = useState<DownloadMode>("auto");
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("1080");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);

  const onSubmit = async () => {
    if (!url.trim()) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildCobaltPayload({ url, downloadMode, videoQuality })),
      });
      const data = (await response.json()) as CobaltResponse;
      setResult(normalizeCobaltResponse(data));
    } catch {
      setResult({
        kind: "error",
        code: "proxy.unreachable",
        message: mapErrorCode("proxy.unreachable"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ToolPageLayout
      title="Downloader"
      description="Paste a link to a public video, track, or gallery and get a direct download."
    >
      <ForkNotice />

      <Card>
        <CardHeader>
          <CardTitle>Link</CardTitle>
          <CardDescription>Nothing is stored. The file downloads straight to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
            aria-label="Media URL"
            onKeyDown={(event) => {
              if (event.key === "Enter") void onSubmit();
            }}
          />

          <div className="flex flex-wrap gap-3">
            <div className="min-w-[10rem] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="download-mode">
                Mode
              </label>
              <Select
                value={downloadMode}
                onValueChange={(value) => setDownloadMode(value as DownloadMode)}
              >
                <SelectTrigger id="download-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOWNLOAD_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[10rem] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="video-quality">
                Quality
              </label>
              <Select
                value={videoQuality}
                onValueChange={(value) => setVideoQuality(value as VideoQuality)}
                disabled={downloadMode === "audio"}
              >
                <SelectTrigger id="video-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_QUALITIES.map((quality) => (
                    <SelectItem key={quality} value={quality}>
                      {quality === "max" ? "Best available" : `${quality}p`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={() => void onSubmit()} disabled={isSubmitting || !url.trim()}>
            {isSubmitting ? "Resolving..." : "Get download"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.kind === "error" && (
              <p className="text-sm text-destructive" role="alert">
                {result.message}
              </p>
            )}

            {result.kind === "single" && (
              <div className="space-y-2">
                <Button onClick={() => window.open(result.url, "_blank", "noopener")}>
                  Download {deriveFilename(result.url, result.filename)}
                </Button>
                {!result.forcesDownload && (
                  <p className="text-xs text-muted-foreground">
                    This one comes straight from the source, so it may open in a new tab instead of
                    downloading. Save it from there if so.
                  </p>
                )}
              </div>
            )}

            {result.kind === "picker" && <PickerGrid items={result.items} />}
          </CardContent>
        </Card>
      )}
    </ToolPageLayout>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc -b
```

Expected: no errors. The page is not routed yet, so it is not reachable in the browser — that is Task 4.

Note: `Button` in this codebase is a plain `forwardRef` over `ButtonHTMLAttributes` with no `asChild` prop, which is why the download control uses `onClick` + `window.open` rather than wrapping an anchor.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/DownloaderPage.tsx
git commit -m "feat: add downloader page with fork attribution"
```

---

### Task 4: Register the tool

**Files:**
- Modify: `frontend/src/config/tools.ts`
- Modify: `frontend/src/routes/HomePage.tsx:32-47`
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/scripts/generate-sitemap.mjs`

**Interfaces:**
- Consumes: `DownloaderPage` from Task 3.
- Produces: a reachable `/downloader` route, a home-page card, and a sitemap entry. SEO metadata derives automatically from `tools.ts` via `config/seo.ts` — do not edit `seo.ts`.

- [ ] **Step 1: Add the tool id and path**

In `frontend/src/config/tools.ts`, append to the `ToolId` union:

```ts
  | "downloader";
```

and to the `ToolPath` union:

```ts
  | "/downloader";
```

- [ ] **Step 2: Add the tool definition**

In the same file, insert this entry into the `tools` array immediately after the `pdf-toolkit` entry:

```ts
  {
    id: "downloader",
    name: "Downloader",
    description: "Grab a public video, track, or gallery from a link. A self-hosted fork of cobalt.",
    path: "/downloader",
    ctaLabel: "Open",
    metaDescription:
      "Download public videos, audio, and galleries from a link. Self-hosted fork of cobalt, no ads and no tracking.",
    metaKeywords: [
      "video downloader",
      "media downloader",
      "cobalt",
      "cobalt fork",
      "download video",
      "download audio",
    ],
  },
```

- [ ] **Step 3: Add the home-page icon**

In `frontend/src/routes/HomePage.tsx`, add `Download` to the existing `lucide-react` import, then add this entry to the `toolIcons` map:

```ts
  downloader: Download,
```

This is required, not cosmetic — `toolIcons` is typed `Record<ToolId, LucideIcon>`, so omitting it is a compile error.

- [ ] **Step 4: Register the route**

In `frontend/src/router.tsx`, add the lazy import alongside the others:

```ts
const DownloaderPage = lazy(() =>
  import("@/routes/DownloaderPage").then((module) => ({
    default: module.DownloaderPage,
  })),
);
```

Add the route definition after `pdfToolkitRoute`:

```ts
const downloaderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/downloader",
  component: withLazySuspense(DownloaderPage)
});
```

Add `downloaderRoute,` to the `routeTree` `addChildren([...])` array, after `pdfToolkitRoute,`.

- [ ] **Step 5: Add the sitemap entry**

In `frontend/scripts/generate-sitemap.mjs`, add to the `entries` array after the `/pdf-toolkit` line:

```js
  { path: "/downloader", changefreq: "weekly", priority: "0.8" },
```

- [ ] **Step 6: Verify the build**

```bash
cd frontend && npm run build
```

Expected: sitemap regenerates, `tsc -b` passes, vite build succeeds.

- [ ] **Step 7: Verify the route renders**

```bash
cd frontend && npm run dev
```

Visit `http://localhost:5173/downloader`. Expected: the page renders with the fork notice visible above the form, and `/` shows a Downloader card.

Submitting will fail here — plain `vite` does not serve `/api/download`. That is expected; use `vercel dev` from the repo root to exercise the function.

- [ ] **Step 8: Run both test suites**

```bash
cd frontend && npm test && cd .. && npm test
```

Expected: both suites pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/config/tools.ts frontend/src/routes/HomePage.tsx frontend/src/router.tsx frontend/scripts/generate-sitemap.mjs
git commit -m "feat: register downloader route, card, and sitemap entry"
```

---

### Task 5: Deployment configuration

**Files:** none — this task configures the Vercel project.

**Interfaces:**
- Consumes: a deployed `/api/download` from Tasks 2 and 4.
- Produces: a working route and an active rate-limit rule.

**Do not run these unattended.** Every step here touches live project state or handles a secret. An agentic worker must stop at this task and hand it to the user. The repo is already linked to the `frontend` project (`prj_t7x0KHXUIu2oMcCPWHzCCTfBDL0x`) under scope `mamiks-projects-2e966216`.

- [ ] **Step 1: Confirm the cobalt fork is deployed**

`Mamik153/cobalt` must be running on a container host (Railway, Fly, Render, or a VPS) with `API_URL` set and reachable over HTTPS. Deploying it is outside this plan. Confirm with:

```bash
curl -s https://<your-instance>/ | head -c 200
```

Expected: a JSON body naming cobalt and its version.

- [ ] **Step 2: Set the environment variables**

The user runs these — the key is a secret and the prompts are interactive:

```bash
vercel env add COBALT_API_URL production
vercel env add COBALT_API_KEY production
```

Repeat for `preview` if the route should work on preview deployments. Neither name starts with `VITE_`, so neither reaches the client bundle. If the instance is unprotected, skip `COBALT_API_KEY` entirely — the function handles its absence.

- [ ] **Step 3: Deploy and verify the endpoint**

```bash
vercel deploy --prod
```

Then, against the deployed URL:

```bash
curl -s -X POST https://devtools.slickspender.com/api/download \
  -H 'content-type: application/json' \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","downloadMode":"audio"}'
```

Expected: JSON with `"status":"tunnel"` (or `"redirect"`). A `503` with `proxy.not_configured` means Step 2 did not take effect — redeploy after adding env vars, since they are read at runtime but only bound to new deployments.

- [ ] **Step 4: Verify the guards in production**

```bash
# Wrong method → 405
curl -s -o /dev/null -w '%{http_code}\n' https://devtools.slickspender.com/api/download

# Disallowed scheme → 400
curl -s -X POST https://devtools.slickspender.com/api/download \
  -H 'content-type: application/json' -d '{"url":"file:///etc/passwd"}'
```

Expected: `405`, then a `400` with `error.api.link.invalid`.

- [ ] **Step 5: Add and publish the rate-limit rule**

This exact rule was verified to work on the Hobby plan during design. Rules stage as drafts and do not affect production until published.

```bash
vercel firewall rules add "Rate limit downloader" \
  --condition '{"type":"path","op":"eq","value":"/api/download"}' \
  --action rate_limit --rate-limit-window 60 \
  --rate-limit-requests 10 --rate-limit-keys ip --yes

vercel firewall rules list
vercel firewall publish
```

To back out: `vercel firewall discard` before publishing, or remove the rule and publish again after.

- [ ] **Step 6: Verify the rate limit**

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "$i:%{http_code} " -X POST \
    https://devtools.slickspender.com/api/download \
    -H 'content-type: application/json' -d '{"url":"https://example.com/x"}'
done; echo
```

Expected: the first requests return `400` (invalid link, which is fine — the rule counts requests, not outcomes), then later ones switch to `429`.

- [ ] **Step 7: Update the spec status**

Edit `docs/superpowers/specs/2026-08-12-downloader-design.md`, changing the Prerequisite section to record the live instance URL host (not the key) and the date the rule was published. Then:

```bash
git add docs/superpowers/specs/2026-08-12-downloader-design.md
git commit -m "docs: record downloader deployment and rate-limit rule"
```

---

## Notes for the implementer

- **Two test suites, two roots.** `cd frontend && npm test` for the lib; `npm test` at the repo root for the function. The root `vitest.config.ts` scopes `include` to `api/**` precisely so these never collide.
- **`vercel dev` is the only way to exercise the function locally.** Plain `vite` 404s on `/api/download`.
- **`.env*` is gitignored** (added by `vercel link`). If you add a `.env.example` to document the two variables, it needs a `!.env.example` negation or it will silently not commit.
- **Do not add a dependency to `api/`.** If something seems to need one, re-read the Global Constraints first.
