import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Minimize2,
  PanelLeftOpen,
  Share2,
} from "lucide-react";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_MARKDOWN = `# Markdown to PDF

Write markdown on the left, watch it render on the right, then export a print-ready PDF.

## Why it works

- Exports with the same fonts you see on screen
- Tables keep visible borders and repeat their header on every page
- Long code lines wrap instead of getting clipped at the page edge

## Supported blocks

| Block | Renders | Exports |
| --- | --- | --- |
| Headings | Yes | Yes |
| Tables | Yes | Yes |
| Code fences | Yes | Yes |
| Mermaid diagrams | Yes | Yes |

> Blockquotes stay together across page breaks.

\`\`\`ts
const veryLongLine = "This line is deliberately long so you can confirm that code wraps onto the next line in the exported PDF instead of scrolling off the page.";
console.log(veryLongLine);
\`\`\`
`;

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SHARE_MARKDOWN_PARAM = "md";
const SHARE_SOURCE_PARAM = "via";
/** Legacy value. Already-published share links carry it, so it must keep matching. */
const SHARE_SOURCE_VALUE = "audioscribe-share";
const MAX_SHARE_MARKDOWN_LENGTH = 4000;
const FONT_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap";

/** Legacy names, validated by a Literal in backend/app/models.py. Renaming needs a backend deploy. */
type ShareEventName = "audioscribe_share_created" | "audioscribe_share_opened";

interface ApiErrorBody {
  detail?: string;
}

interface ShortLinkApiResponse {
  short_url: string;
}

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as ApiErrorBody;
    return payload.detail ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const toBase64Url = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (padding === 0) return normalized;
  return normalized.padEnd(normalized.length + (4 - padding), "=");
};

const encodeMarkdownForShare = (markdown: string) => {
  const bytes = new TextEncoder().encode(markdown);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return toBase64Url(window.btoa(binary));
};

const decodeMarkdownFromShare = (payload: string) => {
  const binary = window.atob(fromBase64Url(payload));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * Print stylesheet for the export popup. The app's screen styles are cloned in
 * wholesale, so anything that only makes sense on screen has to be overridden
 * here — hence the !important on prose/token-driven rules and on MermaidDiagram's
 * inline scale transform.
 */
const PRINT_STYLES = `
      @page { margin: 14mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: "Space Grotesk", "Segoe UI", sans-serif;
        color: #1c1c1c;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Labeled code boxes: the screen border token is too pale for paper.
         break-inside lives on the wrapper so a page break can't land between
         the language label and its code. */
      .markdown-viewer .code-block {
        border: 1px solid #999 !important;
        border-radius: 6px;
        break-inside: avoid;
      }
      .markdown-viewer .code-block-label {
        border-bottom: 1px solid #999 !important;
        background: #ebe9e4 !important;
        color: #4a4a4a !important;
        font-family: "JetBrains Mono", monospace;
      }

      /* Code: light background, wrap instead of clip. */
      .markdown-viewer pre {
        background: #f6f6f4 !important;
        color: #1c1c1c !important;
        padding: 0.75rem;
        white-space: pre-wrap !important;
        overflow-wrap: break-word;
        word-break: break-word;
        overflow: visible !important;
      }
      .markdown-viewer pre code {
        font-family: "JetBrains Mono", monospace;
        white-space: inherit !important;
        color: inherit;
      }
      .markdown-viewer :not(pre) > code { overflow-wrap: break-word; }

      /* Tables: borders that show on white, header repeated per page. */
      .markdown-viewer table { width: 100%; border-collapse: collapse; }
      .markdown-viewer th,
      .markdown-viewer td {
        border: 1px solid #999 !important;
        padding: 0.4rem 0.5rem;
        word-break: break-word;
      }
      .markdown-viewer thead { display: table-header-group; }
      .markdown-viewer tr { break-inside: avoid; }

      /* Pagination hygiene */
      h1, h2, h3, h4 { break-after: avoid; }
      blockquote, img, figure { break-inside: avoid; }
      img, svg { max-width: 100%; height: auto; }

      /* Mermaid: the on-screen fixed-height scroller and scale transform crop the diagram. */
      .mermaid-diagram-container {
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        break-inside: avoid;
      }
      .mermaid-diagram-container div {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
      .mermaid-diagram-container button { display: none !important; }

      .pdf-page { min-height: 100vh; }
      @media print {
        .pdf-page { min-height: auto; }
      }
`;

export function MarkdownToPdfPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [hasCopiedShareLink, setHasCopiedShareLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasTrackedShareOpenRef = useRef(false);
  const copyStateTimeoutRef = useRef<number | null>(null);

  const trackEvent = useCallback(async (name: ShareEventName) => {
    try {
      await fetch(`${API_BASE_URL}/api/metrics/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
    } catch {
      // Tracking should never block the user flow.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const encodedMarkdown = params.get(SHARE_MARKDOWN_PARAM);
    if (encodedMarkdown) {
      try {
        const decoded = decodeMarkdownFromShare(encodedMarkdown);
        if (decoded.trim()) {
          setMarkdown(decoded);
          setShareNotice("Loaded shared markdown snapshot.");
        }
      } catch {
        setShareError("This shared link is invalid.");
      }
    }

    const source = params.get(SHARE_SOURCE_PARAM);
    if (source === SHARE_SOURCE_VALUE && !hasTrackedShareOpenRef.current) {
      hasTrackedShareOpenRef.current = true;
      void trackEvent("audioscribe_share_opened");
    }
  }, [trackEvent]);

  useEffect(() => {
    return () => {
      if (copyStateTimeoutRef.current !== null) {
        window.clearTimeout(copyStateTimeoutRef.current);
      }
    };
  }, []);

  const wordCount = useMemo(() => {
    const clean = markdown.trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  }, [markdown]);

  const onCreateShareLink = async () => {
    if (!markdown.trim()) return;
    if (markdown.length > MAX_SHARE_MARKDOWN_LENGTH) {
      setShareError(
        `Keep markdown under ${MAX_SHARE_MARKDOWN_LENGTH.toLocaleString()} characters to share.`,
      );
      setShareNotice(null);
      return;
    }
    if (typeof window === "undefined") return;

    setIsCreatingShareLink(true);
    setShareError(null);
    setShareNotice(null);
    setHasCopiedShareLink(false);

    try {
      const destination = new URL("/markdown-to-pdf", window.location.origin);
      destination.searchParams.set(
        SHARE_MARKDOWN_PARAM,
        encodeMarkdownForShare(markdown),
      );
      destination.searchParams.set(SHARE_SOURCE_PARAM, SHARE_SOURCE_VALUE);

      const response = await fetch(`${API_BASE_URL}/api/short-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          long_url: destination.toString(),
        }),
      });
      if (!response.ok) {
        throw new Error(
          await parseApiError(response, "Unable to create a share link."),
        );
      }

      const payload = (await response.json()) as ShortLinkApiResponse;
      setShareUrl(payload.short_url);
      setShareNotice(
        "Share link ready. Send it to let others load this markdown instantly.",
      );
      void trackEvent("audioscribe_share_created");
    } catch (error) {
      setShareUrl("");
      setShareError(
        error instanceof Error
          ? error.message
          : "Unable to create a share link.",
      );
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const onCopyShareLink = async () => {
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await window.navigator.clipboard.writeText(shareUrl);
      setHasCopiedShareLink(true);
      setShareError(null);
      if (copyStateTimeoutRef.current !== null) {
        window.clearTimeout(copyStateTimeoutRef.current);
      }
      copyStateTimeoutRef.current = window.setTimeout(
        () => setHasCopiedShareLink(false),
        1800,
      );
    } catch {
      setShareError("Unable to copy automatically. Copy the link manually.");
    }
  };

  const onDownloadPdf = async () => {
    const previewNode = previewRef.current;
    if (!previewNode || typeof window === "undefined") return;

    setExportError(null);

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      setExportError(
        "Your browser blocked the print window. Allow pop-ups for this site and try again.",
      );
      return;
    }

    setIsExportingPdf(true);

    const styles = Array.from(
      document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>(
        'link[rel="stylesheet"], style',
      ),
    )
      .map((styleNode) => styleNode.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <!-- The popup is about:blank, so it has no base URL of its own. The cloned
         <link> tags below carry root-relative hrefs (/assets/index-*.css in a
         production build), which cannot resolve against about:blank — without
         this the app stylesheet silently fails to load and the export falls back
         to UA defaults, losing every prose margin. Must stay above ${"$"}{styles}. -->
    <base href="${document.baseURI}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown Preview PDF</title>
    <link rel="stylesheet" href="${FONT_STYLESHEET_HREF}" />
    ${styles}
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <main class="pdf-page">${previewNode.outerHTML}</main>
  </body>
</html>`);
    printWindow.document.close();

    // Close the popup once printing finishes; the spinner is reset below either way,
    // because afterprint does not fire reliably when the dialog is cancelled.
    printWindow.addEventListener("afterprint", () => printWindow.close(), {
      once: true,
    });

    try {
      if (printWindow.document.readyState !== "complete") {
        await new Promise<void>((resolve) => {
          printWindow.addEventListener("load", () => resolve(), { once: true });
        });
      }

      if ("fonts" in printWindow.document) {
        await printWindow.document.fonts.ready;
      }

      await Promise.all(
        Array.from(printWindow.document.images).map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      );

      printWindow.focus();
      printWindow.print();
    } catch {
      printWindow.close();
      setExportError("Unable to open the print view. Try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <ToolPageLayout
      title="Markdown to PDF"
      description="Write markdown, preview it live, and export a print-ready PDF with the same fonts, visible table borders, and wrapped code."
    >
      <section className="grid min-h-0 gap-4 lg:grid-cols-12 h-[75dvh]">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={isPreviewOnly ? "hidden" : "lg:col-span-5"}
        >
          {/* h-[80dvh] is not redundant with the section: it is the definite height
              the inner overflow-y-auto scrolls against. Drop it and the row grows
              to fit content instead. */}
          <Card className="flex h-full flex-col overflow-hidden h-[72dvh]">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Input
                </CardTitle>
                <CardDescription>
                  Paste markdown content and preview it instantly.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Minimise input"
                title="Minimise input"
                onClick={() => setIsPreviewOnly(true)}
                className="hidden lg:inline-flex"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
              <Textarea
                value={markdown}
                onChange={(event) => {
                  setMarkdown(event.target.value);
                  setShareNotice(null);
                }}
                placeholder="Paste markdown..."
                className="mt-1 min-h-[360px] flex-1 resize-y font-mono text-sm"
                aria-label="Markdown input"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {wordCount} words
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void onCreateShareLink()}
                    disabled={isCreatingShareLink || !markdown.trim()}
                  >
                    {isCreatingShareLink ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    Share Snapshot
                  </Button>
                  {/* Step 1 -> step 2 on mobile/tablet. Navigates only; the actual
                      export lives in the preview header. */}
                  <Button
                    className="lg:hidden"
                    onClick={() => setIsPreviewOnly(true)}
                    disabled={!markdown.trim()}
                  >
                    <FileText className="h-4 w-4" />
                    Render PDF
                  </Button>
                </div>
              </div>

              {shareUrl ? (
                <div className="space-y-2 rounded-md border border-border/70 bg-background/70 p-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="h-9 font-mono text-xs"
                    aria-label="Share URL"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void onCopyShareLink()}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {hasCopiedShareLink ? "Copied" : "Copy Link"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(shareUrl, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Link
                    </Button>
                  </div>
                </div>
              ) : null}

              {shareNotice ? (
                <p className="text-xs text-emerald-700">{shareNotice}</p>
              ) : null}
              {shareError ? (
                <p className="text-xs text-rose-700">{shareError}</p>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.03 }}
          className={
            isPreviewOnly ? "lg:col-span-12" : "hidden lg:block lg:col-span-7"
          }
        >
          <Card className="flex h-full flex-col overflow-hidden h-[72dvh]">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Preview
                </CardTitle>
                <CardDescription>
                  Rendered markdown with typography and code highlighting.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Step 2 -> step 1 on mobile/tablet. */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Back to input"
                  onClick={() => setIsPreviewOnly(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                {isPreviewOnly ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden lg:inline-flex"
                    onClick={() => setIsPreviewOnly(false)}
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                    Show input
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onDownloadPdf()}
                  disabled={!markdown.trim() || isExportingPdf}
                >
                  {isExportingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              {exportError ? (
                <p className="mb-3 text-xs text-rose-700">{exportError}</p>
              ) : null}
              <div ref={previewRef} className="p-4 md:p-6">
                <MarkdownPreview
                  markdown={markdown || "_Nothing to render yet._"}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </ToolPageLayout>
  );
}
