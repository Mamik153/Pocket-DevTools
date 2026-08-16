import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { FileDropzone, type AcceptedFile } from "@/components/common/FileDropzone";
import { ConvertOptions } from "@/components/image/ConvertOptions";
import { Button } from "@/components/ui/button";
import {
  convertImage,
  dedupeNames,
  outputName,
  sniffImageFormat,
  DEFAULT_ICO_SIZES,
  DEFAULT_SVG_RENDER_PX,
  type ConvertSettings,
  type ConvertTarget,
} from "@/lib/image";
import { downloadBlob, formatBytes, zipFiles } from "@/lib/pdf";

interface Row extends AcceptedFile {
  output: Blob | null;
  error: string | null;
  /** Animated sources convert their first frame only; say so rather than hide it. */
  note: string | null;
}

const initialSettings = (target: ConvertTarget): ConvertSettings => ({
  target,
  quality: 0.92,
  // JPEG cannot store alpha, so it starts on a white ground; the rest keep it.
  backdrop: target === "jpeg" ? "#ffffff" : null,
  maxWidth: null,
  maxHeight: null,
  icoSizes: [...DEFAULT_ICO_SIZES],
  svgRenderSize: DEFAULT_SVG_RENDER_PX,
});

export function ConvertPanel({ target }: { target: ConvertTarget }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<ConvertSettings>(() => initialSettings(target));
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Generation counter: guards against a superseded run resolving after a newer
  // one. Same pattern as ImageToPdfPanel, UnlockPanel and CompressPanel.
  const requestIdRef = useRef(0);

  // Abandon any in-flight batch when this panel unmounts.
  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const addFiles = useCallback((files: AcceptedFile[]) => {
    setRows((current) => [
      ...current,
      ...files.map((file) => {
        const format = sniffImageFormat(file.bytes);
        return {
          ...file,
          output: null,
          error: null,
          note:
            format === "gif" || format === "webp"
              ? "Animated sources convert their first frame."
              : null,
        };
      }),
    ]);
  }, []);

  const run = async (current: Row[], activeSettings: ConvertSettings) => {
    const requestId = ++requestIdRef.current;
    setProgress({ done: 0, total: current.length });

    // Sequential on purpose: converting thirty large images in parallel is how
    // a tab runs out of memory.
    for (let index = 0; index < current.length; index += 1) {
      const row = current[index];
      let output: Blob | null = null;
      let error: string | null = null;
      try {
        output = await convertImage(row.bytes, activeSettings);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : "This image could not be converted.";
      }
      if (requestId !== requestIdRef.current) return;
      // One bad file fails its own row; the rest of the batch carries on.
      setRows((rowsNow) =>
        rowsNow.map((entry) => (entry.id === row.id ? { ...entry, output, error } : entry)),
      );
      setProgress({ done: index + 1, total: current.length });
    }

    if (requestId === requestIdRef.current) setProgress(null);
  };

  const onSettingsChange = (patch: Partial<ConvertSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    // Source bytes are already in memory, so re-running costs no re-upload.
    if (rows.some((row) => row.output || row.error)) void run(rows, next);
  };

  const converted = rows.filter((row) => row.output);
  const hasSvg = rows.some((row) => sniffImageFormat(row.bytes) === "svg");

  // Every row has finished, one way or the other.
  const settled = rows.length > 0 && rows.every((row) => row.output || row.error);
  const canDownload = settled && converted.length > 0 && progress === null;

  const onDownloadAll = async () => {
    // Zipping a single file just makes the user unzip it again.
    if (converted.length === 1) {
      const [only] = converted;
      downloadBlob(only.output as Blob, outputName(only.name, target));
      return;
    }
    const names = dedupeNames(converted.map((row) => outputName(row.name, target)));
    const zip = await zipFiles(
      converted.map((row, index) => ({ name: names[index], blob: row.output as Blob })),
    );
    downloadBlob(
      new Blob([zip as BlobPart], { type: "application/zip" }),
      `converted-${target}.zip`,
    );
  };

  return (
    <div className="space-y-4">
      <FileDropzone
        kind="convertible"
        multiple
        label={rows.length === 0 ? "Drop images here, or click to choose" : "Add more images"}
        onAccept={addFiles}
      />

      <p className="text-sm text-muted-foreground">
        JPEG, PNG, GIF, BMP, WebP, AVIF and SVG in. Everything is converted in this tab — no file
        is uploaded.
      </p>

      <ConvertOptions
        target={target}
        settings={settings}
        hasSvg={hasSvg}
        onChange={onSettingsChange}
      />

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{row.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {formatBytes(row.size)}
                  {row.output ? ` → ${formatBytes(row.output.size)}` : ""}
                </span>
                {row.error && (
                  <span role="alert" className="block text-xs text-destructive">
                    {row.error}
                  </span>
                )}
                {row.note && !row.error && (
                  <span className="block text-xs text-muted-foreground">{row.note}</span>
                )}
              </span>
              {row.output && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadBlob(row.output as Blob, outputName(row.name, target))}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {outputName(row.name, target).split(".").pop()?.toUpperCase()}
                </Button>
              )}
              <button
                type="button"
                aria-label={`Remove ${row.name}`}
                onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur-md reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {progress
              ? `Converting ${progress.done} of ${progress.total}`
              : `${converted.length} of ${rows.length} converted`}
          </p>
          {/*
            Once every row has settled, downloading is the only thing left to do:
            changing an option re-runs the batch by itself, so a lingering
            Convert button would be a no-op sitting in the primary slot.
          */}
          {canDownload ? (
            <Button onClick={() => void onDownloadAll()}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {converted.length > 1 ? `Download all (${converted.length}) as ZIP` : "Download"}
            </Button>
          ) : (
            <Button onClick={() => void run(rows, settings)} disabled={progress !== null}>
              {progress ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Convert
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
