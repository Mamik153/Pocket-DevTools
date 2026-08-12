import { useCallback, useState } from "react";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Download, GripVertical, Loader2, X } from "lucide-react";
import { PdfDropzone, type AcceptedPdf } from "@/components/pdf/PdfDropzone";
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
            <MergeRowItem
              key={row.id}
              row={row}
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

interface MergeRowItemProps {
  row: MergeRow;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

function MergeRowItem({ row, index, total, onMove, onRemove }: MergeRowItemProps) {
  const controls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  return (
    <Reorder.Item
      value={row}
      // Drag only from the grip, so the rest of the row stays clickable.
      dragListener={false}
      dragControls={controls}
      // Bounce is earned here: a drag release carries real momentum.
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: "spring", bounce: 0.2, duration: 0.4 }
      }
      // Own transition so the pick-up scale pop doesn't inherit the settle's
      // bounce spring — bounce is earned only by the post-drop settle.
      whileDrag={
        prefersReducedMotion
          ? undefined
          : { scale: 1.02, zIndex: 1, transition: { duration: 0.15 } }
      }
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
    >
      <button
        type="button"
        aria-label={`Reorder ${row.name}`}
        // Lift on pointer-down, so the grab registers before any movement.
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {row.error
            ? row.error
            : `${formatBytes(row.size)}${row.pageCount === null ? "" : ` · ${row.pageCount} page${row.pageCount === 1 ? "" : "s"}`}`}
        </p>
      </div>

      {/* Reorder is pointer-only, so keyboard users get explicit controls. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${row.name} up`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${row.name} down`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Remove ${row.name}`} onClick={onRemove}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Reorder.Item>
  );
}
