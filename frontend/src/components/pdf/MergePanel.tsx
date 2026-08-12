import { useCallback, useState } from "react";
import { Reorder } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
import { ReorderableRow } from "@/components/pdf/ReorderableRow";
import { Button } from "@/components/ui/button";
import { downloadBytes, formatBytes, inspectPdf, mergePdfs, moveItem } from "@/lib/pdf";

interface MergeRow extends AcceptedPdf {
  pageCount: number | null;
  error: string | null;
}

export function MergePanel() {
  const [rows, setRows] = useState<MergeRow[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const addFiles = useCallback(async (files: AcceptedPdf[]) => {
    // PdfDropzone already assigns a collision-free id, so do not override it here.
    const pending: MergeRow[] = files.map((file) => ({
      ...file,
      pageCount: null,
      error: null,
    }));
    setRows((current) => [...current, ...pending]);

    // Inspect each file individually: one corrupt or locked file must not
    // invalidate the others.
    for (const row of pending) {
      let patch: Partial<MergeRow>;
      try {
        const info = await inspectPdf(row.bytes);
        patch = info.isEncrypted
          ? { error: "Locked. Unlock it in the Unlock tool first." }
          : { pageCount: info.pageCount };
      } catch {
        patch = { error: "Could not be read. It may be corrupt." };
      }
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, ...patch } : item)),
      );
    }
  }, []);

  // A row only counts once inspectPdf has actually resolved for it — otherwise
  // a file dropped while loadPdfLib is still loading (a ~1MB dynamic import)
  // could be merged unvalidated, and one bad file would fail the whole batch.
  const usable = rows.filter((row) => row.pageCount !== null && row.error === null);
  const pendingCount = rows.filter((row) => row.pageCount === null && row.error === null).length;

  const onExport = async () => {
    setFailure(null);
    setProgress({ done: 0, total: usable.length });
    try {
      const merged = await mergePdfs(
        usable.map((row) => row.bytes),
        (done, total) => setProgress({ done, total }),
      );
      downloadBytes(merged, "merged.pdf");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Merge failed.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <PdfDropzone
        multiple
        label={
          rows.length === 0
            ? "Drop PDFs here, or click to choose"
            : "Add more PDFs"
        }
        onAccept={(files) => void addFiles(files)}
      />

      {rows.length > 0 && (
        <Reorder.Group axis="y" values={rows} onReorder={setRows} className="space-y-2">
          {rows.map((row) => (
            <ReorderableRow
              key={row.id}
              value={row}
              name={row.name}
              error={row.error}
              meta={`${formatBytes(row.size)}${row.pageCount === null ? "" : ` \u00b7 ${row.pageCount} page${row.pageCount === 1 ? "" : "s"}`}`}
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
              ? `Merging file ${progress.done} of ${progress.total}`
              : pendingCount > 0
                ? `Checking ${pendingCount} file${pendingCount === 1 ? "" : "s"}…`
                : `${usable.length} file${usable.length === 1 ? "" : "s"} ready`}
          </p>
          <Button onClick={() => void onExport()} disabled={usable.length < 2 || progress !== null}>
            {progress ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            Export merged PDF
          </Button>
        </div>
      )}
    </div>
  );
}

