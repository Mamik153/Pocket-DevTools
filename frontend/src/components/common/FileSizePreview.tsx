import { formatBytes } from "@/lib/pdf";

export function FileSizePreview({
  originalSize,
  outputSize,
  pending = false,
}: {
  originalSize: number;
  outputSize?: number;
  pending?: boolean;
}) {
  const difference = outputSize === undefined ? 0 : originalSize - outputSize;

  return (
    <span className="block text-xs text-muted-foreground tabular-nums">
      Original: {formatBytes(originalSize)}
      {pending ? " → Updating preview…" : outputSize !== undefined ? (
        <>
          {" → New: "}{formatBytes(outputSize)}
          {difference === 0 ? " · Same size" : originalSize > 0 ? (
            <> · {((Math.abs(difference) / originalSize) * 100).toFixed(1)}% {difference > 0 ? "smaller" : "larger"}</>
          ) : null}
        </>
      ) : null}
    </span>
  );
}
