# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
