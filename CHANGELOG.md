# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-12

### Minor change

- **PDF Toolkit:** New `/pdf-toolkit` tool with four tabs — Merge, Unlock, To Image, and Compress. All processing happens in the browser; no file or password is uploaded.
- **PDF Toolkit:** Merge supports drag-to-reorder from a grip handle, keyboard ↑/↓ reordering, and adding more files without losing the list.
- **PDF Toolkit:** Unlock removes permission restrictions with no prompt, and removes an open password when you supply it. It does not guess or crack passwords.
- **PDF Toolkit:** To Image renders pages to PNG or JPEG at 72/150/300 DPI, with single-page or ZIP download.
- **PDF Toolkit:** Compress defaults to a lossless pass and offers an opt-in aggressive raster mode. Neither mode ever returns a file larger than the input.
- **UI:** Shared `Button` now responds on pointer-down with a subtle press scale, honouring `prefers-reduced-motion`.
- **Testing:** Added Vitest and unit tests for the PDF helpers (`cd frontend && npm test`).

## [0.2.0] - 2026-02-24

### Minor change

- **SEO:** Default Open Graph and Twitter Card image (`og-default.png`) with meta in config, SeoManager, and index.html.
- **SEO:** Twitter Card meta tags use `property` for consistency; added `og:image`, `og:image:width/height/alt`, `twitter:image`, `twitter:image:alt`.
- **SEO:** BreadcrumbList JSON-LD for all pages (Home + tool pages) via `getBreadcrumbSchema` and SeoManager.
- **SEO:** Unique, benefit-led meta descriptions and optional meta keywords per tool in `tools.ts`; used in `seo.ts` for tool pages.
- **SEO:** Sitemap generated at build time with `lastmod` via `scripts/generate-sitemap.mjs`; `pnpm run build` runs it before Vite build.
- **SEO:** Logo preload and explicit width/height for LCP; logo served from `public/logo.jpeg` for stable preload URL.
- **Branding:** Unified to "Pocket DevTools" on homepage (h1, header, tagline, noscript, image alt).

## [0.1.0] - 2025-02-19

### Minor change

- Audioscribe markdown preview now renders Mermaid diagrams: fenced code blocks with language `mermaid` are displayed as visual diagrams (e.g. sequence diagrams, flowcharts) instead of plain code.
