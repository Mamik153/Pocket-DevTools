import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReorderableRowProps<T> {
  /** The list item itself — Reorder.Group matches by reference, so pass the row object. */
  value: T;
  name: string;
  /** Secondary line: size, page count, dimensions. Ignored when `error` is set. */
  meta: string;
  error?: string | null;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

/**
 * One draggable row in a reordering list. Shared by Merge (PDFs) and
 * Image to PDF, which need identical drag, keyboard and remove behaviour.
 */
export function ReorderableRow<T>({
  value,
  name,
  meta,
  error = null,
  index,
  total,
  onMove,
  onRemove,
}: ReorderableRowProps<T>) {
  const controls = useDragControls();
  const prefersReducedMotion = useReducedMotion();

  return (
    <Reorder.Item
      value={value}
      // Drag only from the grip, so the rest of the row stays clickable.
      dragListener={false}
      dragControls={controls}
      // Bounce is earned here: a drag release carries real momentum.
      transition={
        prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.4 }
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
        aria-label={`Reorder ${name}`}
        // Lift on pointer-down, so the grab registers before any movement.
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{error ?? meta}</p>
      </div>

      {/* Reorder is pointer-only, so keyboard users get explicit controls. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${name} down`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Remove ${name}`} onClick={onRemove}>
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Reorder.Item>
  );
}
