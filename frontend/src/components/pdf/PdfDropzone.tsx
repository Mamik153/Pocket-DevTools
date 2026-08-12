import { useCallback, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload } from "lucide-react";
import { formatBytes, isPdfBytes } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export interface AcceptedPdf {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
}

/** Above this, a browser may run out of memory. We warn; we never block. */
export const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

interface PdfDropzoneProps {
  multiple?: boolean;
  label?: string;
  onAccept: (files: AcceptedPdf[]) => void;
}

export function PdfDropzone({
  multiple = false,
  label = "Drop a PDF here, or click to choose",
  onAccept,
}: PdfDropzoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const inputId = useId();
  const prefersReducedMotion = useReducedMotion();

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const accepted: AcceptedPdf[] = [];
      const rejected: string[] = [];
      const oversized: string[] = [];

      for (const file of Array.from(fileList)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        // Extension and MIME type are user-controlled. Only the header is evidence.
        if (!isPdfBytes(bytes)) {
          rejected.push(`${file.name} is not a PDF.`);
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
    [onAccept],
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
          accept="application/pdf,.pdf"
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
