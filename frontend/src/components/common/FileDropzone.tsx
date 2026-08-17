import { useCallback, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload } from "lucide-react";
import { isDocxBytes } from "@/lib/docx";
import { isConvertibleImage, isEmbeddableImage } from "@/lib/image";
import { formatBytes, isPdfBytes } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export interface AcceptedFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
}

/** Above this, a browser may run out of memory. We warn; we never block. */
export const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

/**
 * What this dropzone takes. Each kind supplies its own header check and copy.
 *
 * "image" and "convertible" differ by exactly one format: SVG. The PDF toolkit
 * rasterises through createImageBitmap, which rejects SVG blobs, so SVG must
 * not reach it. The converter has an <img> path and accepts it.
 */
const KINDS = {
  pdf: { noun: "PDF", accept: "application/pdf,.pdf", sniff: isPdfBytes },
  image: { noun: "image", accept: "image/*", sniff: isEmbeddableImage },
  convertible: { noun: "image", accept: "image/*,.svg", sniff: isConvertibleImage },
  // Async, unlike the others: confirming a zip is a Word document means opening
  // it, and fflate is behind a dynamic import.
  docx: {
    noun: "Word document",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sniff: isDocxBytes,
  },
} as const;

interface FileDropzoneProps {
  kind?: keyof typeof KINDS;
  multiple?: boolean;
  label?: string;
  onAccept: (files: AcceptedFile[]) => void;
}

export function FileDropzone({
  kind = "pdf",
  multiple = false,
  label = "Drop a PDF here, or click to choose",
  onAccept,
}: FileDropzoneProps) {
  const { noun, accept, sniff } = KINDS[kind];
  const [isOver, setIsOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputId = useId();
  const prefersReducedMotion = useReducedMotion();

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const allFiles = Array.from(fileList);
      // `multiple` on the <input> only governs the picker — a drag-drop bypasses
      // it entirely and hands over every dropped file. Enforce the limit here too,
      // for both entry points, rather than silently discarding extras.
      const files = multiple ? allFiles : allFiles.slice(0, 1);
      const accepted: AcceptedFile[] = [];
      const rejected: string[] = [];
      const oversized: string[] =
        !multiple && allFiles.length > 1
          ? [`Only the first file was used — this tool takes one ${noun} at a time.`]
          : [];

      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Extension and MIME type are user-controlled. Only the header is evidence.
        // sniff may be sync (magic bytes) or async (docx, which opens the zip);
        // awaiting a boolean is still a boolean, so the other kinds are unaffected.
        if (!(await sniff(bytes))) {
          rejected.push(`${file.name} is not a valid ${noun}.`);
          continue;
        }
        if (file.size > LARGE_FILE_WARNING_BYTES) {
          oversized.push(
            `${file.name} is ${formatBytes(file.size)}. Large files may exhaust your browser's memory.`,
          );
        }
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          bytes,
        });
      }

      setErrors(rejected);
      setWarnings(oversized);
      if (accepted.length > 0) onAccept(accepted);
    },
    [onAccept, multiple, noun, sniff],
  );

  return (
    <div className="space-y-2">
      <motion.label
        htmlFor={inputId}
        // Highlight the instant the file is over the zone, not on drop.
        onDragEnter={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setIsOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        animate={{ scale: isOver && !prefersReducedMotion ? 1.01 : 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/20",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{label}</span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            // Reset so re-picking the same file fires change again.
            event.target.value = "";
          }}
        />
      </motion.label>

      {errors.map((message) => (
        <p key={message} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ))}
      {warnings.map((message) => (
        <p key={message} className="text-sm text-muted-foreground">
          {message}
        </p>
      ))}
    </div>
  );
}
