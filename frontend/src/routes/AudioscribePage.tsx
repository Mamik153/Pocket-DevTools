import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Share2,
  Volume2,
} from "lucide-react";
import { CustomAudioPlayer } from "@/components/CustomAudioPlayer";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Badge } from "@/components/ui/badge";
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
import { useTtsJob } from "@/hooks/useTtsJob";
import type { TtsJobStatus } from "@/types/tts";

const DEFAULT_MARKDOWN = `# Markdown + TTS Playground

Paste any markdown file and render it in real time.

## Features

- Full-screen markdown preview
- GPT-style writing surface
- Async text-to-speech generation
- Open-source model pipeline (Coqui TTS)

\`\`\`ts
const message = "You can narrate code blocks too.";
console.log(message);
\`\`\`
`;

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SHARE_MARKDOWN_PARAM = "md";
const SHARE_SOURCE_PARAM = "via";
const SHARE_SOURCE_VALUE = "audioscribe-share";
const MAX_SHARE_MARKDOWN_LENGTH = 4000;

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

const statusLabel: Record<
  TtsJobStatus,
  { text: string; variant: "default" | "warning" | "success" | "destructive" }
> = {
  queued: { text: "Queued", variant: "default" },
  processing: {
    text: "Synthesizing (model warm-up can take time)",
    variant: "warning",
  },
  done: { text: "Ready", variant: "success" },
  error: { text: "Failed", variant: "destructive" },
};

export function AudioscribePage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [hasCopiedShareLink, setHasCopiedShareLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const hasTrackedShareOpenRef = useRef(false);
  const copyStateTimeoutRef = useRef<number | null>(null);

  const {
    activeJob,
    audioUrl,
    isSubmitting,
    requestError,
    createJob,
    clearJob,
  } = useTtsJob(API_BASE_URL);

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

  const onGenerate = async () => {
    if (!markdown.trim()) return;
    await createJob(markdown);
  };

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
      const destination = new URL("/audioscribe", window.location.origin);
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

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

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
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdown Preview PDF</title>
    ${styles}
    <style>
      @page {
        margin: 12mm;
      }
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .pdf-page {
        min-height: 100vh;
      }
      @media print {
        .pdf-page {
          min-height: auto;
        }
      }
    </style>
  </head>
  <body>
    <main class="pdf-page">${previewNode.outerHTML}</main>
  </body>
</html>`);
    printWindow.document.close();

    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      setIsExportingPdf(false);
      printWindow.close();
    };

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

      printWindow.addEventListener("afterprint", finalize, { once: true });
      printWindow.focus();
      printWindow.print();
    } catch {
      finalize();
    }
  };

  return (
    <ToolPageLayout
      title="Audioscribe"
      description="Write markdown, preview the result, and generate speech from your content using async TTS jobs."
    >
      <section className="grid min-h-0 gap-4 lg:grid-cols-12 h-[80dvh]">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-5"
        >
          <Card className="flex h-full flex-col overflow-hidden h-[80dvh]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Input
              </CardTitle>
              <CardDescription>
                Paste markdown content and trigger TTS generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto ">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{wordCount} words</span>
                  {activeJob ? (
                    <span>Job #{activeJob.id.slice(0, 8)}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setMarkdown(DEFAULT_MARKDOWN)}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => void onGenerate()}
                    disabled={isSubmitting || !markdown.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    Generate TTS
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-secondary/25 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium">Speech Status:</span>
                  {activeJob ? (
                    <Badge variant={statusLabel[activeJob.status].variant}>
                      {statusLabel[activeJob.status].text}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Idle</Badge>
                  )}
                </div>
                {requestError ? (
                  <p className="text-rose-700">{requestError}</p>
                ) : null}
                {activeJob?.error ? (
                  <p className="text-rose-700">{activeJob.error}</p>
                ) : null}
                {audioUrl ? (
                  <div className="space-y-3">
                    <CustomAudioPlayer src={audioUrl} />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={clearJob}>
                        Clear Job
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void onCreateShareLink()}
                        disabled={isCreatingShareLink}
                      >
                        {isCreatingShareLink ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Share2 className="h-4 w-4" />
                        )}
                        Share Snapshot
                      </Button>
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
                              window.open(
                                shareUrl,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Link
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The first run can take longer because the model download and
                    initialization happen lazily.
                  </p>
                )}
                {shareNotice ? (
                  <p className="text-xs text-emerald-700">{shareNotice}</p>
                ) : null}
                {shareError ? (
                  <p className="text-xs text-rose-700">{shareError}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.03 }}
          className="lg:col-span-7"
        >
          <Card className="flex h-full flex-col overflow-hidden h-[80dvh]">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Preview
                </CardTitle>
                <CardDescription>
                  Rendered markdown with typography and code highlighting.
                </CardDescription>
              </div>
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
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
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
