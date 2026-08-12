# Downloader — Design

Date: 2026-08-12
Status: Approved

## Purpose

Add a fifteenth tool to Pocket DevTools: a media downloader at `/downloader`, backed by a
self-hosted fork of [cobalt](https://github.com/imputnet/cobalt). The page presents itself
explicitly and prominently as a fork of that project, never as original work.

Unlike every other tool in this repo, this one is not client-side. It depends on a running
cobalt API instance, reached through a thin FastAPI proxy that keeps the instance's API key
off the client.

## Scope

In scope:

- A `/downloader` route: paste a URL, choose download mode and video quality, get a link.
- Handling of cobalt's four response shapes: `tunnel`, `redirect`, `picker`, `error`.
- A `POST /api/download` FastAPI proxy holding `COBALT_API_KEY` server-side.
- Prominent, permanent fork attribution satisfying AGPL-3.0 §13.
- Introducing `pytest` to the backend, covering the proxy's guards.

Out of scope:

- **Deploying the cobalt fork.** `Mamik153/cobalt` stays a separate repo, deployed
  separately. This spec treats a reachable `COBALT_API_URL` as a prerequisite.
- **Client-side processing.** `localProcessing` stays at its default of `disabled`, so
  the client never remuxes. No ffmpeg-wasm, no LibAV bundle.
- **Proxying media bytes.** Only JSON crosses FastAPI.
- The full cobalt option set — no bitrate, codec, filename style, or metadata toggles.
- Download history, queueing, or batch URLs.

## Why the API cannot live in this repo

Investigated and ruled out before designing. cobalt's API ships as a Docker container
requiring ffmpeg, a persistent process, and a reverse proxy; its docs describe no
serverless path. Three findings make a Vercel Function in this project unworkable:

1. **Internal tunnels are per-process.** Public tunnel state goes through a `Store`
   abstraction that can be externalized to Redis, but `internalStreamCache` in
   `api/src/stream/manage.js` is a plain in-process `Map`. Internal tunnels are exactly
   what merged video+audio remuxing uses, so multi-instance execution breaks merged
   downloads regardless of external state.
2. **Duration.** Large remuxes exceed Vercel's 300s function ceiling.
3. **Egress.** Media proxying is billed bandwidth.

The frontend route belongs in this repo. The API must be a long-running container elsewhere.

## Decisions

### Attribution: fork status is page furniture, not a footnote

Directly beneath the page title, always visible — not collapsed, not a tooltip:

> **Downloader** — a self-hosted fork of cobalt.
> Built on [imputnet/cobalt](https://github.com/imputnet/cobalt), running our own fork at
> [Mamik153/cobalt](https://github.com/Mamik153/cobalt). cobalt is AGPL-3.0; the instance's
> source is the fork linked here. Not affiliated with or endorsed by imputnet.

Plus one line mirroring upstream's own stance: public content only, the user is responsible
for what they download.

Three constraints this satisfies:

- **AGPL-3.0 §13.** Operating a modified cobalt reachable over a network obliges the
  operator to offer users its Corresponding Source. Linking the public fork discharges
  this. The obligation attaches to the *instance*, not to Pocket DevTools — a separate
  program communicating over HTTP is not a derivative work, so this repo's React and
  FastAPI code is unaffected and keeps its existing license.
- **No cobalt branding.** The name is used to attribute (nominative use); the logo and
  visual identity are not adopted.
- **The stated requirement** that the tool read unambiguously as a fork.

### Architecture: proxy the JSON, not the bytes

```
Browser  /downloader
   │  POST {VITE_API_URL}/api/download   { url, downloadMode, videoQuality }
   ▼
FastAPI  download_service.py
   │  POST {COBALT_API_URL}/
   │  Authorization: Api-Key {COBALT_API_KEY}     ← server-side only, never bundled
   │  Accept: application/json
   ▼
Cobalt fork instance  (Docker, separate host, separate repo)
   │
   └─→ { status: tunnel | redirect | picker | error, ... }
            │
            ▼  JSON relayed back, normalized
       Browser fetches the media URL DIRECTLY from the instance
```

Media bytes never transit FastAPI, so a multi-gigabyte download costs the backend nothing
and cannot hit a request timeout.

Accepted trade-off: the instance hostname is visible in download URLs. The API key — the
part that actually gates access — stays server-side, and a hostname alone is useless
against a key-protected instance.

### Response handling

`localProcessing` is left at its default (`disabled`), so only four statuses can arrive:

| Status | Rendering |
| --- | --- |
| `tunnel` | Single download button. cobalt sets `Content-Disposition: attachment`, so the file downloads cleanly. |
| `redirect` | Single button pointing at the origin CDN. |
| `picker` | Thumbnail grid for carousels/albums, each item its own download. |
| `error` | Mapped message (see below). |

**Known limitation, surfaced in the UI rather than fixed:** the HTML `download` attribute
is ignored cross-origin. It works for `tunnel` because cobalt sends the attachment header
itself. For `redirect`, header control belongs to the CDN, so some links open in a tab
instead of downloading. The UI says "opens in a new tab" rather than promising a download
it cannot guarantee. This is inherent to the direct-download decision.

### UI surface

Three inputs only:

- **URL** — text input.
- **Download mode** — `auto` / `audio` / `mute`, defaulting to `auto`.
- **Video quality** — `max`, `1080`, `720`, `480`, `360`, defaulting to `1080`. A trimmed
  subset of cobalt's full `144p`–`4320p` range; the omitted steps add clutter without
  covering a distinct need.

Everything else uses cobalt's defaults.

## Files

Twelve files. Registration follows the same path every existing tool uses.

**Frontend**

| File | Change |
| --- | --- |
| `frontend/src/lib/downloader.ts` | **New.** Pure logic: payload building, response normalization, error-code mapping, filename derivation. No React, no `fetch`. Mirrors `lib/pdf.ts`. |
| `frontend/src/lib/downloader.test.ts` | **New.** Vitest, mirroring `pdf.test.ts`. |
| `frontend/src/routes/DownloaderPage.tsx` | **New.** UI only — form state, calls the lib, renders results and attribution. |
| `frontend/src/config/tools.ts` | Add `"downloader"` to `ToolId` and `ToolPath`; one `ToolDefinition` with `metaDescription` and `metaKeywords`. |
| `frontend/src/router.tsx` | One `lazy()` import, one `createRoute`, one entry in `addChildren`. |
| `frontend/src/routes/HomePage.tsx` | One entry in `toolIcons` (`Download` from lucide). Required — the map is `Record<ToolId, LucideIcon>`, so omitting it is a compile error. |
| `frontend/scripts/generate-sitemap.mjs` | One entry in the hand-maintained `entries` array, priority `0.8`. |

SEO metadata derives automatically from `tools.ts` via `config/seo.ts`. No `seo.ts` change.

**Backend**

| File | Change |
| --- | --- |
| `backend/app/download_service.py` | **New.** httpx call to cobalt, URL validation, error mapping, rate limiting. Matches the shape of `url_shortener_service.py`. |
| `backend/app/models.py` | Add `DownloadRequest` and `DownloadResponse`. |
| `backend/app/main.py` | Add `POST /api/download`. |
| `backend/tests/test_download_service.py` | **New.** First test file in the backend; see Testing. |
| `backend/requirements.txt` | Add `httpx` (absent today) and `pytest`. |

Keeping pure logic in `downloader.ts` is what stops `DownloaderPage.tsx` from growing into
another long route file, and it is the part worth testing directly.

## Error handling

cobalt returns namespaced codes (`error.api.link.invalid`, `error.api.service.unsupported`,
`error.api.content.too_long`, `error.api.fetch.fail`, and others). A small map converts the
common ones to plain copy; unknown codes fall back to displaying the raw code so failures
stay diagnosable rather than collapsing into "something went wrong".

httpx transport failures become a generic `502`. No error path may include
`COBALT_API_URL` or `COBALT_API_KEY` in its message.

## Security

Guards at the trust boundary, deliberately not minimized:

- **URL scheme allowlist** — `http` and `https` only, so the proxy cannot be used as a
  general-purpose relay.
- **Per-IP rate limit** on `/api/download` — 10 requests per minute, returning `429` when
  exceeded. The endpoint fronts an expensive resource and cobalt's own docs advise
  protecting instances from abuse. Implemented as an in-process token bucket, carrying a
  `ponytail:` comment naming the single-worker ceiling and Redis as the upgrade path.
- **30s timeout** on the httpx call so a hung instance cannot pile up connections.
- **`COBALT_API_KEY` read from env only**, never returned in any response.

## Configuration

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `COBALT_API_URL` | Backend | Yes | Base URL of the deployed fork. |
| `COBALT_API_KEY` | Backend | No | Omitted if the instance is unprotected. |
| `VITE_API_URL` | Frontend | Existing | Already used by other routes. |

If `COBALT_API_URL` is unset, `/api/download` returns `503` with a clear "not configured"
message and the UI renders a disabled state. Before the fork is deployed the route
degrades honestly instead of failing mysteriously.

The backend's `CORSMiddleware` allowlist in `app/main.py` already covers the frontend
origins; no change needed.

## Testing

**Frontend** — `downloader.test.ts` (vitest, already configured):

- Payload building for each download mode and quality.
- Normalization of all four response shapes, including a multi-item `picker`.
- Error-code mapping, including the unknown-code fallback.
- Filename derivation.

**Backend** — introduce `pytest` with `backend/tests/test_download_service.py`:

- URL validation accepts `http`/`https` and rejects other schemes.
- Error mapping produces no leak of `COBALT_API_URL` or `COBALT_API_KEY`.
- Rate limiter permits traffic under the limit and rejects over it.
- Missing `COBALT_API_URL` yields `503`, not a crash.

The cobalt instance is stubbed; no test performs a live download.

## Prerequisite

The route is non-functional until `Mamik153/cobalt` is deployed to a container host and
`COBALT_API_URL` points at it. That deployment is explicitly outside this spec. The `503`
path above ensures the tool ships in a coherent state beforehand.
