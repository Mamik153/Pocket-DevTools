import { useCallback, useEffect, useState } from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { downloadBlob, renderPdfToImages, zipFiles, type RenderedPage } from "@/lib/pdf";

const DPI_PRESETS = [
  { dpi: 72, label: "72 DPI (screen)" },
  { dpi: 150, label: "150 DPI (print)" },
  { dpi: 300, label: "300 DPI (high)" },
];

export function ToImagePanel() {
  const [file, setFile] = useState<AcceptedPdf | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.85);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Object URLs are not garbage collected. Revoke them when they are replaced.
  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages]);

  const render = useCallback(
    async (target: AcceptedPdf) => {
      setFailure(null);
      setPages([]);
      setProgress({ done: 0, total: 0 });
      try {
        const rendered = await renderPdfToImages(target.bytes, {
          dpi,
          format,
          quality,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        setPages(rendered);
      } catch {
        setFailure("This PDF could not be rendered. If it is locked, unlock it first.");
      } finally {
        setProgress(null);
      }
    },
    [dpi, format, quality],
  );

  const baseName = file?.name.replace(/\.pdf$/i, "") ?? "page";
  const extension = format === "png" ? "png" : "jpg";

  return (
    <div className="space-y-4">
      <PdfDropzone
        label="Drop a PDF here, or click to choose"
        onAccept={([accepted]) => {
          setFile(accepted);
          void render(accepted);
        }}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Format</Label>
          <div className="flex gap-2">
            {(["png", "jpeg"] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={format === option ? "default" : "outline"}
                onClick={() => setFormat(option)}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Resolution</Label>
          <div className="flex flex-wrap gap-2">
            {DPI_PRESETS.map((preset) => (
              <Button
                key={preset.dpi}
                size="sm"
                variant={dpi === preset.dpi ? "default" : "outline"}
                onClick={() => setDpi(preset.dpi)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {format === "jpeg" && (
          <div className="space-y-1">
            <Label htmlFor="jpeg-quality">
              JPEG quality <span className="tabular-nums">{Math.round(quality * 100)}%</span>
            </Label>
            <input
              id="jpeg-quality"
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
              className="w-48"
            />
          </div>
        )}

        {file && (
          <Button variant="outline" onClick={() => void render(file)} disabled={progress !== null}>
            Re-render
          </Button>
        )}
      </div>

      {progress && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {progress.total === 0
            ? "Opening document…"
            : `Rendering page ${progress.done} of ${progress.total}`}
        </p>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {pages.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {pages.length} image{pages.length === 1 ? "" : "s"}
            </p>
            <Button
              onClick={async () => {
                const zipped = await zipFiles(
                  pages.map((page) => ({
                    name: `${baseName}-${String(page.pageNumber).padStart(3, "0")}.${extension}`,
                    blob: page.blob,
                  })),
                );
                downloadBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), `${baseName}-images.zip`);
              }}
            >
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              Download all as ZIP
            </Button>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page) => (
              <li key={page.pageNumber} className="space-y-2 rounded-xl border border-border p-2">
                <img
                  src={page.url}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full rounded-md border border-border"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    downloadBlob(
                      page.blob,
                      `${baseName}-${String(page.pageNumber).padStart(3, "0")}.${extension}`,
                    )
                  }
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Page {page.pageNumber}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
