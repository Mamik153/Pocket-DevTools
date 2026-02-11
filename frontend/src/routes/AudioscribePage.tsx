import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2, Volume2 } from "lucide-react";
import { CustomAudioPlayer } from "@/components/CustomAudioPlayer";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const statusLabel: Record<TtsJobStatus, { text: string; variant: "default" | "warning" | "success" | "destructive" }> = {
  queued: { text: "Queued", variant: "default" },
  processing: {
    text: "Synthesizing (model warm-up can take time)",
    variant: "warning"
  },
  done: { text: "Ready", variant: "success" },
  error: { text: "Failed", variant: "destructive" }
};

export function AudioscribePage() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const { activeJob, audioUrl, isSubmitting, requestError, createJob, clearJob } = useTtsJob(API_BASE_URL);

  const wordCount = useMemo(() => {
    const clean = markdown.trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  }, [markdown]);

  const onGenerate = async () => {
    if (!markdown.trim()) return;
    await createJob(markdown);
  };

  const onDownloadPdf = async () => {
    const previewNode = previewRef.current;
    if (!previewNode || typeof window === "undefined") return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;

    setIsExportingPdf(true);

    const styles = Array.from(document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style'))
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
        })
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
      <section className="grid min-h-0 gap-4 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-5"
        >
          <Card className="flex h-full flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Input
              </CardTitle>
              <CardDescription>Paste markdown content and trigger TTS generation.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
              <Textarea
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                placeholder="Paste markdown..."
                className="mt-1 min-h-[360px] flex-1 resize-y font-mono text-sm"
                aria-label="Markdown input"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{wordCount} words</span>
                  {activeJob ? <span>Job #{activeJob.id.slice(0, 8)}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => setMarkdown(DEFAULT_MARKDOWN)}>
                    Reset
                  </Button>
                  <Button onClick={() => void onGenerate()} disabled={isSubmitting || !markdown.trim()}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                    Generate TTS
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border/70 bg-secondary/25 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium">Speech Status:</span>
                  {activeJob ? (
                    <Badge variant={statusLabel[activeJob.status].variant}>{statusLabel[activeJob.status].text}</Badge>
                  ) : (
                    <Badge variant="outline">Idle</Badge>
                  )}
                </div>
                {requestError ? <p className="text-rose-700">{requestError}</p> : null}
                {activeJob?.error ? <p className="text-rose-700">{activeJob.error}</p> : null}
                {audioUrl ? (
                  <div className="space-y-2">
                    <CustomAudioPlayer src={audioUrl} />
                    <Button variant="ghost" size="sm" onClick={clearJob}>
                      Clear Job
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The first run can take longer because the model download and initialization happen lazily.
                  </p>
                )}
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
          <Card className="flex h-full flex-col overflow-hidden">
            <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Preview
                </CardTitle>
                <CardDescription>Rendered markdown with typography and code highlighting.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void onDownloadPdf()} disabled={!markdown.trim() || isExportingPdf}>
                {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
              <div ref={previewRef} className="p-4 md:p-6">
                <MarkdownPreview markdown={markdown || "_Nothing to render yet._"} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </ToolPageLayout>
  );
}
