import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2 } from "lucide-react";
import { FileDropzone, type AcceptedFile } from "@/components/common/FileDropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  compressAggressive,
  compressLossless,
  downloadBytes,
  formatBytes,
  inspectPdf,
} from "@/lib/pdf";

interface Result {
  bytes: Uint8Array;
  saved: number;
  originalSize: number;
  // The mode that actually produced these bytes — not the live Switch state,
  // which can change after the run finishes. The result block must describe
  // the file it is offering, not whatever the toggle currently reads.
  aggressive: boolean;
}

export function CompressPanel() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [aggressive, setAggressive] = useState(false);
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(0.7);
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // Generation counter: guards against a superseded drop/re-run resolving
  // after a newer one and overwriting its result. Same pattern as UnlockPanel
  // and ToImagePanel.
  const requestIdRef = useRef(0);

  const run = useCallback(
    async (target: AcceptedFile) => {
      const requestId = ++requestIdRef.current;
      const usedAggressive = aggressive;
      setFailure(null);
      setResult(null);
      setProgress({ done: 0, total: 0 });

      // Detect a locked file up front rather than guessing from a caught
      // compress failure — that catch-all also fires for corrupt files and
      // decode failures, where "unlock it first" is actively misleading. This
      // also resolves M5: pdf-lib's lossless load throws on a permission-only
      // PDF while pdf.js's aggressive path opens it fine, so without this check
      // the same file would fail one mode and succeed the other.
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
        const outcome = usedAggressive
          ? await compressAggressive(target.bytes, {
              dpi,
              quality,
              onProgress: (done, total) => {
                if (requestId !== requestIdRef.current) return;
                setProgress({ done, total });
              },
            })
          : await compressLossless(target.bytes);
        if (requestId !== requestIdRef.current) return;
        setResult({ ...outcome, originalSize: target.bytes.length, aggressive: usedAggressive });
      } catch {
        if (requestId !== requestIdRef.current) return;
        setFailure("This PDF could not be compressed. It may be corrupt or unreadable.");
      } finally {
        if (requestId === requestIdRef.current) setProgress(null);
      }
    },
    [aggressive, dpi, quality],
  );

  return (
    <div className="space-y-4">
      <FileDropzone
        label="Drop a PDF here, or click to choose"
        onAccept={([accepted]) => {
          setFile(accepted);
          void run(accepted);
        }}
      />

      <div className="space-y-3 rounded-xl border border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Switch id="aggressive" checked={aggressive} onCheckedChange={setAggressive} />
          <Label htmlFor="aggressive">Aggressive (rasterise pages)</Label>
        </div>

        {aggressive ? (
          <>
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Every page becomes a picture. Text will not be selectable or searchable,
              and links will stop working. Good for scans, bad for documents.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="compress-dpi">Resolution</Label>
                <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
                  <SelectTrigger id="compress-dpi" className="w-36" aria-label="Resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[100, 150, 200].map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} DPI
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="compress-quality">
                  JPEG quality <span className="tabular-nums">{Math.round(quality * 100)}%</span>
                </Label>
                <input
                  id="compress-quality"
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-48"
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Lossless. Drops unused objects and edit history, then recompresses. Text,
            links and search all keep working. Often saves little on an already-optimised file.
          </p>
        )}

        {file && (
          <Button variant="outline" onClick={() => void run(file)} disabled={progress !== null}>
            Re-run
          </Button>
        )}
      </div>

      {progress && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {progress.total === 0
            ? "Compressing…"
            : `Rendering page ${progress.done} of ${progress.total}`}
        </p>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {result && file && (
        <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3">
          {result.saved === 0 ? (
            // Never dress a non-saving as a win, and never offer a bigger download.
            <p className="text-sm">
              {result.aggressive ? (
                <>
                  Rasterising made this document larger, so the original file was
                  kept — there is nothing smaller to download. Try lossless mode
                  for text documents.
                </>
              ) : (
                <>
                  Already optimised — nothing to save. The original is{" "}
                  <span className="tabular-nums">{formatBytes(result.originalSize)}</span>.
                  Try aggressive mode if this is a scanned document.
                </>
              )}
            </p>
          ) : (
            <>
              {result.aggressive && (
                // Describes the file behind the download button below, not the
                // live Switch — the toggle may have been flipped since this run.
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  This file's pages are pictures. Text is not selectable or searchable,
                  and links do not work.
                </p>
              )}
              <p className="text-sm tabular-nums">
                {formatBytes(result.originalSize)} → {formatBytes(result.bytes.length)}
                {" · "}
                {Math.round((result.saved / result.originalSize) * 100)}% smaller
              </p>
              <Button onClick={() => downloadBytes(result.bytes, `compressed-${file.name}`)}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Download compressed PDF
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
