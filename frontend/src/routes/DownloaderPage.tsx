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
    if (!url.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), downloadMode, videoQuality }),
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
                  {result.filename ? `Download ${result.filename}` : "Download"}
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
