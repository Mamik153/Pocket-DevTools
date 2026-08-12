import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadBlob, inspectPdf, renderPdfToImages, zipFiles, type RenderedPage } from "@/lib/pdf";

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
  // Generation counter: guards against a superseded drop/re-render resolving
  // after a newer one and overwriting its result. Same pattern as UnlockPanel.
  const requestIdRef = useRef(0);

  // Object URLs are not garbage collected. Revoke them when they are replaced.
  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.url)), [pages]);

  // PdfToolkit unmounts this panel whenever you leave the tool, including mid-render.
  // That is not covered by the [pages] cleanup above: `pages` is still empty
  // when the switch happens, and the render that resolves after unmount would
  // otherwise setPages() on nothing and leak every object URL it created.
  // Unmount is a supersession: bump the generation so the in-flight render
  // takes the already-superseded branch below and revokes its own urls.
  useEffect(() => () => { requestIdRef.current += 1; }, []);

  const render = useCallback(
    async (target: AcceptedPdf) => {
      const requestId = ++requestIdRef.current;
      setFailure(null);
      setPages([]);
      setProgress({ done: 0, total: 0 });

      // Detect a locked file up front rather than guessing from a caught render
      // failure — that catch-all also fires for corrupt files, OOM, and decode
      // failures, where "unlock it first" is actively misleading advice.
      try {
        const info = await inspectPdf(target.bytes);
        if (requestId !== requestIdRef.current) return;
        if (info.isEncrypted) {
          setFailure("This PDF is locked. Unlock it in the Unlock tool first.");
          setProgress(null);
          return;
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setFailure("This PDF could not be read. It may be corrupt or unreadable.");
        setProgress(null);
        return;
      }

      try {
        const rendered = await renderPdfToImages(target.bytes, {
          dpi,
          format,
          quality,
          onProgress: (done, total) => {
            if (requestId !== requestIdRef.current) return;
            setProgress({ done, total });
          },
        });
        if (requestId !== requestIdRef.current) {
          // A newer request already won; this batch has no owner left to
          // revoke it via the [pages] effect, so revoke it here.
          rendered.forEach((page) => URL.revokeObjectURL(page.url));
          return;
        }
        setPages(rendered);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setFailure("This PDF could not be rendered. It may be corrupt or unreadable.");
      } finally {
        if (requestId === requestIdRef.current) setProgress(null);
      }
    },
    [dpi, format, quality],
  );

  const baseName = file?.name.replace(/\.pdf$/i, "") ?? "page";
  const extension = format === "png" ? "png" : "jpg";
  // Pad to the width of the total page count so a 1000+ page document still
  // sorts correctly ("0999" < "1000"), not a fixed 3 digits.
  const pageNumberWidth = String(pages.length).length;
  const pageFileName = (pageNumber: number) =>
    `${baseName}-${String(pageNumber).padStart(pageNumberWidth, "0")}.${extension}`;

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
          <Label htmlFor="to-image-format">Format</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as "png" | "jpeg")}>
            <SelectTrigger id="to-image-format" className="w-36" aria-label="Format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpeg">JPEG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="to-image-dpi">Resolution</Label>
          <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
            <SelectTrigger id="to-image-dpi" className="w-48" aria-label="Resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DPI_PRESETS.map((preset) => (
                <SelectItem key={preset.dpi} value={String(preset.dpi)}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    name: pageFileName(page.pageNumber),
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
                  onClick={() => downloadBlob(page.blob, pageFileName(page.pageNumber))}
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
