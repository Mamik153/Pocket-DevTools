import { useCallback, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { FileDropzone, type AcceptedFile } from "@/components/common/FileDropzone";
import { ReorderableRow } from "@/components/pdf/ReorderableRow";
import { Button } from "@/components/ui/button";
import { downloadBytes, formatBytes, imagesToPdf, moveItem } from "@/lib/pdf";

export function ImageToPdfPanel() {
  const [rows, setRows] = useState<AcceptedFile[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // Generation counter: guards against a superseded export resolving after a
  // newer one. Same pattern as UnlockPanel, ToImagePanel and CompressPanel.
  const requestIdRef = useRef(0);

  // The dropzone already sniffed every file's header, so nothing needs
  // inspecting here — unlike Merge, where each PDF must be probed for encryption.
  const addFiles = useCallback((files: AcceptedFile[]) => {
    setRows((current) => [...current, ...files]);
  }, []);

  const onExport = async () => {
    const requestId = ++requestIdRef.current;
    setFailure(null);
    setProgress({ done: 0, total: rows.length });
    try {
      const pdf = await imagesToPdf(
        rows.map((row) => row.bytes),
        (done, total) => {
          if (requestId !== requestIdRef.current) return;
          setProgress({ done, total });
        },
      );
      if (requestId !== requestIdRef.current) return;
      downloadBytes(pdf, "images.pdf");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setFailure("These images could not be converted. One of them may be corrupt.");
    } finally {
      if (requestId === requestIdRef.current) setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <FileDropzone
        kind="image"
        multiple
        label={
          rows.length === 0
            ? "Drop images here, or click to choose"
            : "Add more images"
        }
        onAccept={addFiles}
      />

      <p className="text-sm text-muted-foreground">
        JPEG, PNG, GIF, BMP and WebP. Each image becomes one page, sized to fit that
        image exactly, in the order shown below.
      </p>

      {rows.length > 0 && (
        <Reorder.Group axis="y" values={rows} onReorder={setRows} className="space-y-2">
          {rows.map((row) => (
            <ReorderableRow
              key={row.id}
              value={row}
              name={row.name}
              meta={formatBytes(row.size)}
              index={rows.findIndex((item) => item.id === row.id)}
              total={rows.length}
              onMove={(from, to) => setRows((current) => moveItem(current, from, to))}
              onRemove={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            />
          ))}
        </Reorder.Group>
      )}

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {rows.length > 0 && (
        // Translucent action bar with the list scrolling under it.
        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur-md reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {progress
              ? `Adding image ${progress.done} of ${progress.total}`
              : `${rows.length} image${rows.length === 1 ? "" : "s"} ready`}
          </p>
          <Button onClick={() => void onExport()} disabled={progress !== null}>
            {progress ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export PDF
          </Button>
        </div>
      )}
    </div>
  );
}
