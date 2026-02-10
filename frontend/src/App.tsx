import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, Loader2, Sparkles, Volume2 } from "lucide-react";
import { CustomAudioPlayer } from "@/components/CustomAudioPlayer";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function App() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const {
    activeJob,
    audioUrl,
    isSubmitting,
    requestError,
    createJob,
    clearJob,
  } = useTtsJob(API_BASE_URL);

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
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-300/25 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-300/25 blur-3xl animate-drift" />

      <main className="relative z-10 mx-auto flex h-screen w-full max-w-[1600px] flex-col overflow-hidden px-4 py-5 md:px-8 md:py-8">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border/70 bg-card/60 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">
                Markdown TTS Studio
              </h1>
              <p className="text-sm text-muted-foreground">
                Paste markdown, preview instantly, and generate speech.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="hidden md:inline-flex">
            Open-source TTS
          </Badge>
        </motion.header>

        <section className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="min-h-0 lg:col-span-5"
          >
            <Card className="flex h-full min-h-0 flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Input
                </CardTitle>
                <CardDescription>
                  Paste markdown content and then trigger TTS generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
                <Textarea
                  value={markdown}
                  onChange={(event) => setMarkdown(event.target.value)}
                  placeholder="Paste markdown..."
                  className="min-h-[48vh] resize-none font-mono text-sm mt-1 flex-1"
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

                <div className="rounded-md border border-border/70 bg-secondary/25 p-3 text-sm">
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
                    <div className="space-y-2">
                      <CustomAudioPlayer src={audioUrl} />
                      <Button variant="ghost" size="sm" onClick={clearJob}>
                        Clear Job
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      First run can take longer because the model downloads and
                      initializes.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="min-h-0 lg:col-span-7"
          >
            <Card className="flex h-full min-h-0 flex-col overflow-hidden">
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> Full Preview
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
                <div ref={previewRef} className="p-8">
                  <MarkdownPreview
                    markdown={markdown || "_Nothing to render yet._"}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
