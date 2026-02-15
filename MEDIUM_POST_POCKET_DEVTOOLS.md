# From Markdown TTS to Pocket DevTools: Building a Practical Dev Toolkit That I Actually Use

Most side projects start with one narrow pain point.

This one started as a Markdown-to-speech experiment. I wanted a simple way to paste notes, docs, and drafts, then listen to them while walking or context-switching. But while building it, I kept running into the same problem many developers do: I was constantly jumping across random websites for tiny tasks.

Format JSON here. Decode JWT there. Test regex somewhere else. Generate a UUID in another tab.

That friction is what pushed this repo from a single tool into a small product: **Pocket DevTools**.

## What’s in the project today

At a high level, the project is now a full-stack dev utility hub with **13+ tools** in one UI.

### 1) Audioscribe (the original core)

Audioscribe is still the heart of the project:

- Write/paste markdown
- Live preview with code highlighting
- Generate speech from markdown using an async TTS pipeline
- Download preview as PDF
- Share markdown snapshots with short links

The backend handles TTS as jobs (`queued -> processing -> done/error`), and the frontend polls for job status every 2 seconds until completion.

### 2) JSON Toolkit (multi-mode)

Instead of building separate pages for every JSON task, the project keeps one shared workspace that can switch modes:

- Compare JSON side-by-side with path-level diffs
- Beautify/minify
- Convert JSON to TOON format
- Generate JSON scaffolds and insert into either pane
- Highlight malformed lines with line/column hints

This “single surface, multiple modes” pattern ended up being one of the best UX decisions in the project.

### 3) Everyday utilities developers keep reopening

The rest of the toolkit focuses on fast, no-signup, no-context-switch helpers:

- URL encoder/decoder
- URL shortener (server-backed)
- JWT decode
- UUID generator
- Password generator
- Base64 encode/decode
- Regex tester
- Timestamp converter
- Prompt improver

### 4) Built-in short links + lightweight event metrics

The project has two tiny but useful backend services:

- URL shortener service with custom code support, click counting, and JSON persistence
- Event metrics service for product events like `audioscribe_share_created` and `audioscribe_share_opened`

No analytics vendor, no heavyweight infra. Just enough instrumentation to learn what users actually do.

### 5) Floating productivity widgets

There are also always-available widgets on the interface:

- Live INR exchange rate conversion (bi-directional)
- Multi-timezone world clock

They’re small touches, but they reinforce the idea that this app is meant to be a daily “workbench,” not a single-use landing page.

## How it’s built

### Frontend

- React + TypeScript + Vite
- TanStack Router with lazy-loaded routes
- Tailwind + component primitives
- Framer Motion for subtle transitions

The home page and tools share one layout system, and SEO metadata is generated per route (including Open Graph and JSON-LD updates in the client).

### Backend

- FastAPI (Python 3.11+)
- Coqui TTS (`tts_models/en/ljspeech/tacotron2-DDC`)
- In-memory job tracking + thread pool execution for async speech generation
- File-backed persistence for short links and event counters

The API surface is intentionally compact:

- `/api/tts/jobs` + `/api/tts/audio/{job_id}`
- `/api/short-links` + `/s/{code}`
- `/api/metrics/events`

## Product decisions that mattered more than expected

### Keep the “time to first success” low

Every tool in this project tries to work immediately:

- sensible defaults
- sample input
- clear empty/error states
- no account needed

That sounds basic, but it’s the difference between “nice demo” and “I’ll use this tomorrow.”

### Avoid over-architecture for early-stage utility products

It’s tempting to jump into queues, databases, and distributed everything. Here, simple file persistence and focused services were enough to ship quickly and keep the system understandable.

### Treat tool quality like product quality

Even for tiny helpers (like JWT decode), details matter:

- precise error messages
- careful parsing behavior
- readability of output
- mobile-friendly layouts

If a utility tool is used under pressure, rough edges become very obvious.

## Blog posts that influenced this direction

I like reading engineering and product-tooling blogs because they reveal the tradeoffs behind “simple” UX.

Some good reads that map closely to this project’s decisions:

- [How Vercel adopted microfrontends](https://vercel.com/blog/how-vercel-adopted-microfrontends)  
  Strong DX-first framing: optimize team velocity and architecture only where scale pressure is real.
- [Introducing Stripe’s new API release process](https://stripe.com/blog/introducing-stripes-new-api-release-process)  
  Great reminder that predictable contracts and release cadence reduce downstream integration pain.
- [Dev Mode: Building a design tool that works harder for developers (Figma)](https://www.figma.com/blog/how-we-built-dev-mode/)  
  Useful perspective on dev-focused UX and reducing design-to-build handoff friction.
- [GitHub Engineering: Architecture & optimization](https://github.blog/engineering/architecture-optimization/)  
  A good window into iterative improvement culture and shipping without pretending systems are static.

## Where this project can go next

If I continue expanding Pocket DevTools, the next improvements will likely be:

- optional user profiles/workspaces for saving tool state
- richer observability around tool usage paths
- more import/export flows between tools
- hardened async pipeline for larger TTS workloads

But the core principle will stay the same: **small, reliable tools in one place beat ten tabs and constant context switching**.

## Final thought

The most valuable part of building this project wasn’t adding more tools. It was learning where friction actually lives in everyday developer workflows.

When a project starts reducing those tiny frictions repeatedly, it stops being a side experiment and starts becoming infrastructure for your own work.
