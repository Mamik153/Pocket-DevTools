# Downloader — Design

Date: 2026-08-12
Status: Approved (revised — proxy moved from FastAPI to a Vercel Function)

## Purpose

Add a fifteenth tool to Pocket DevTools: a media downloader at `/downloader`, backed by a
self-hosted fork of [cobalt](https://github.com/imputnet/cobalt). The page presents itself
explicitly and prominently as a fork of that project, never as original work.

Unlike every other tool in this repo, this one is not client-side. It depends on a running
cobalt API instance, reached through a thin TypeScript Vercel Function that keeps the
instance's API key off the client.

## Scope

In scope:

- A `/downloader` route: paste a URL, choose download mode and video quality, get a link.
- Handling of cobalt's four response shapes: `tunnel`, `redirect`, `picker`, `error`.
- A `POST /api/download` Vercel Function holding `COBALT_API_KEY` server-side.
- Prominent, permanent fork attribution satisfying AGPL-3.0 §13.
- A Vercel WAF rate-limit rule on the endpoint.

Out of scope:

- **Deploying the cobalt fork.** `Mamik153/cobalt` stays a separate repo, deployed
  separately. This spec treats a reachable `COBALT_API_URL` as a prerequisite.
- **Client-side processing.** `localProcessing` stays at its default of `disabled`, so
  the client never remuxes. No ffmpeg-wasm, no LibAV bundle.
- **Proxying media bytes.** Only JSON crosses the function.
- **Any change to the FastAPI backend.** It is not touched by this feature.
- The full cobalt option set — no bitrate, codec, filename style, or metadata toggles.
- Download history, queueing, or batch URLs.

## Why the cobalt API cannot live in this repo

Investigated and ruled out before designing. cobalt's API ships as a Docker container
requiring ffmpeg, a persistent process, and a reverse proxy; its docs describe no
serverless path. Three findings make a Vercel Function in this project unworkable *for the
cobalt API itself*:

1. **Internal tunnels are per-process.** Public tunnel state goes through a `Store`
   abstraction that can be externalized to Redis, but `internalStreamCache` in
   `api/src/stream/manage.js` is a plain in-process `Map`. Internal tunnels are exactly
   what merged video+audio remuxing uses, so multi-instance execution breaks merged
   downloads regardless of external state.
2. **Duration.** Large remuxes exceed Vercel's 300s function ceiling.
3. **Egress.** Media proxying is billed bandwidth.

None of this applies to the *proxy*, which is stateless, short-lived, and JSON-only — which
is why the proxy is a function and the API is a container.

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
  program communicating over HTTP is not a derivative work, so this repo's code is
  unaffected and keeps its existing license.
- **No cobalt branding.** The name is used to attribute (nominative use); the logo and
  visual identity are not adopted.
- **The stated requirement** that the tool read unambiguously as a fork.

### The proxy is a Vercel Function, not a FastAPI route

The proxy lives in this repo as `api/download.ts` and deploys with the frontend.

What this buys:

- `/api/download` is **same-origin**, so CORS does not apply to this route at all — no
  allowlist entry, no preflight.
- The FastAPI deployment is never touched. No new Python dependencies, no redeploy.
- One language and one test runner across the whole feature.

What it does **not** buy, stated plainly to avoid a false expectation: this does not
eliminate a separate deployment. The FastAPI host remains deployed for `/api/short-links`,
`/api/metrics/events`, and the TTS endpoints. The accepted consequence is two API origins —
this route uses a relative path, other tools use `VITE_API_URL`.

**No Express.** Vercel supplies the handler signature directly for non-Next frameworks:

```ts
export default {
  async fetch(request: Request) { /* ... */ },
};
```

A single endpoint needs no router, and Express would add a dependency plus an adapter
around a few lines. With native `fetch` on Node 24, the function has **zero runtime
dependencies**.

**No `vercel.json` change.** The existing rewrite `/((?!api(?:$|/)|s(?:$|/)).*)` already
excludes `/api/` from the SPA fallback, so `/api/download` falls through to the function.

### Architecture: proxy the JSON, not the bytes

```
Browser  /downloader
   │  POST /api/download   { url, downloadMode, videoQuality }     ← same origin
   ▼
Vercel Function  api/download.ts        (zero runtime deps, native fetch)
   │  POST {COBALT_API_URL}/
   │  Authorization: Api-Key {COBALT_API_KEY}     ← server-side only, never bundled
   │  Accept: application/json
   ▼
Cobalt fork instance  (Docker, separate host, separate repo)
   │
   └─→ { status: tunnel | redirect | picker | error, ... }
            │
            ▼  JSON relayed back, sanitized
       Browser fetches the media URL DIRECTLY from the instance
```

Media bytes never transit the function, so a multi-gigabyte download costs nothing in
compute or egress and cannot hit the function timeout.

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

Eleven files. No Python is touched.

**Frontend**

| File | Change |
| --- | --- |
| `frontend/src/lib/downloader.ts` | **New.** Pure logic: payload building, response normalization, error-code → copy mapping, filename derivation. No React, no `fetch`. Mirrors `lib/pdf.ts`. |
| `frontend/src/lib/downloader.test.ts` | **New.** Vitest, mirroring `pdf.test.ts`. |
| `frontend/src/routes/DownloaderPage.tsx` | **New.** UI only — form state, calls the lib, renders results and attribution. Posts to the relative `/api/download`. |
| `frontend/src/config/tools.ts` | Add `"downloader"` to `ToolId` and `ToolPath`; one `ToolDefinition` with `metaDescription` and `metaKeywords`. |
| `frontend/src/router.tsx` | One `lazy()` import, one `createRoute`, one entry in `addChildren`. |
| `frontend/src/routes/HomePage.tsx` | One entry in `toolIcons` (`Download` from lucide). Required — the map is `Record<ToolId, LucideIcon>`, so omitting it is a compile error. |
| `frontend/scripts/generate-sitemap.mjs` | One entry in the hand-maintained `entries` array, priority `0.8`. |

SEO metadata derives automatically from `tools.ts` via `config/seo.ts`. No `seo.ts` change.

**Function**

| File | Change |
| --- | --- |
| `api/download.ts` | **New.** The proxy. Validates the URL, forwards to cobalt with the key, sanitizes and relays the response. Zero runtime dependencies. |
| `api/download.test.ts` | **New.** Vitest coverage of the guards; see Testing. |
| `package.json` | **New**, repo root. `vitest` as the only devDependency, plus a `test` script. No runtime dependencies. |
| `vitest.config.ts` | **New**, repo root. Limits `include` to `api/**/*.test.ts` so it does not collide with the frontend suite. |

### Where error copy lives

The function relays cobalt's `status` and error `code` verbatim after sanitizing; the
frontend's `downloader.ts` maps codes to human copy. This keeps display concerns in the
frontend and avoids duplicating a message map across two build contexts, so no code is
shared between `api/` and `frontend/`.

## Error handling

cobalt returns namespaced codes (`error.api.link.invalid`, `error.api.service.unsupported`,
`error.api.content.too_long`, `error.api.fetch.fail`, and others). The frontend map converts
the common ones to plain copy; unknown codes fall back to displaying the raw code so
failures stay diagnosable rather than collapsing into "something went wrong".

Transport failures from the function's `fetch` become a generic `502`. No error path may
include `COBALT_API_URL` or `COBALT_API_KEY` in its message.

## Security

Guards at the trust boundary, deliberately not minimized:

- **URL scheme allowlist, both directions** — `http` and `https` only, enforced in the
  function via `new URL()`, so the proxy cannot be used as a general-purpose relay.
  Server-side, not client-side, because the client cannot be trusted.

  The allowlist applies to URLs coming *back* from cobalt as well, not just to inbound
  ones. The frontend feeds a relayed `url` into `window.open()` and a `picker` item's `url`
  into an anchor `href`, so a `javascript:` URL from a buggy or compromised instance would
  otherwise reach a navigation. `picker` items are additionally shape-checked (`type` must
  be `photo`/`video`/`gif`, `url` must validate); failing items are dropped, and a failing
  `thumb` drops only that field so the download link survives. Validating inbound but not
  outbound was caught in final review — the asymmetry was the defect.
- **Rate limiting via Vercel WAF**, not application code. An in-process token bucket was
  considered and rejected: Functions scale horizontally and recycle, so an in-memory
  counter becomes per-instance and resets on cold start — a guard in appearance only. The
  WAF rule is enforced at the edge before the function runs:

  ```bash
  vercel firewall rules add "Rate limit downloader" \
    --condition '{"type":"path","op":"eq","value":"/api/download"}' \
    --action rate_limit --rate-limit-window 60 \
    --rate-limit-requests 10 --rate-limit-keys ip --yes
  ```

  **Verified available on the Hobby plan** — this exact rule was staged successfully
  against project `frontend` and then discarded, so no plan upgrade is required. Apply it
  and run `vercel firewall publish` once the route is deployed; rules stage as drafts and
  do not affect production until published.
- **30s timeout** on the outbound call via `AbortSignal.timeout(30_000)`.
- **`COBALT_API_KEY` read from env only**, never returned in any response.
- **Method check** — the handler accepts `POST` only.

## Configuration

| Variable | Where | Required | Notes |
| --- | --- | --- | --- |
| `COBALT_API_URL` | Vercel env | Yes | Base URL of the deployed fork. |
| `COBALT_API_KEY` | Vercel env | No | Omitted if the instance is unprotected. |

Set both with `vercel env add`. Neither is a `VITE_` variable, so neither reaches the
client bundle.

If `COBALT_API_URL` is unset, `/api/download` returns `503` with a `proxy.not_configured`
code, which the UI renders as "The downloader isn't configured yet." Before the fork is
deployed the route degrades honestly instead of failing mysteriously.

This check is reactive, not pre-flight: the form stays enabled and the message appears on
submit. There is no client-side signal of whether `COBALT_API_URL` is set — surfacing one
would mean publishing server configuration state to the browser — so a disabled-on-load
control is not available without adding an endpoint whose only job is to report readiness.

## Local development

`vite` on port 5173 does not serve functions, so `/api/download` 404s under plain
`npm run dev`. Two options:

- **`vercel dev`** from the repo root — serves the SPA and the function together, matching
  production. Vercel CLI 58.9.4 is installed and the repo is linked to the `frontend`
  project, so this works as-is. `.vercel` and `.env.local` are both gitignored.
- **A Vite proxy** in `frontend/vite.config.ts` pointing `/api/download` at a locally run
  function. Only needed if plain `vite` is preferred; adds a config change not counted above.

## Testing

**Frontend** — `frontend/src/lib/downloader.test.ts` (vitest, already configured):

- Payload building for each download mode and quality.
- Normalization of all four response shapes, including a multi-item `picker`.
- Error-code mapping, including the unknown-code fallback.

**Function** — `api/download.test.ts` (vitest via the new root config), with `fetch`
stubbed so no test performs a live download:

- URL validation accepts `http`/`https` and rejects other schemes.
- Non-`POST` methods are refused.
- No response body or error message contains `COBALT_API_URL` or `COBALT_API_KEY`.
- Missing `COBALT_API_URL` yields `503`, not a crash.
- A cobalt `error` response is relayed with its code intact.

Rate limiting is not unit-tested because it is edge configuration rather than code; verify
it with a burst of requests against a preview deployment.

As built: 9 tests in the frontend lib suite, 21 in the function suite.

## Known deferred

Neither blocks merge; recorded so they are not rediscovered as surprises.

- `frontend/src/lib/downloader.ts` carries no module or per-export doc comments, unlike the
  neighbouring `lib/pdf.ts`. Purely stylistic.
- No test asserts the literal contents of `DOWNLOAD_MODES` / `VIDEO_QUALITIES`. A drift
  between them and the type unions would be caught by TypeScript, which is why this was
  judged low value.
- `ERROR_COPY` covers cobalt's common error codes but has not been reconciled against a
  live instance's full code list. Unknown codes fall through to the raw code by design, so
  a mismatch degrades to diagnosable rather than broken. Worth a pass once the fork is
  deployed.

## Prerequisite

The route is non-functional until `Mamik153/cobalt` is deployed to a container host and
`COBALT_API_URL` points at it. That deployment is explicitly outside this spec. The `503`
path above ensures the tool ships in a coherent state beforehand.
