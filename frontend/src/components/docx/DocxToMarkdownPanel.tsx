import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { FileDropzone, type AcceptedFile } from "@/components/common/FileDropzone";
import { Button } from "@/components/ui/button";
import { docxToMarkdown, type MarkdownResult } from "@/lib/docx";
import { downloadBlob, formatBytes, zipFiles } from "@/lib/pdf";

/** "report.docx" -> "report" */
const stemOf = (filename: string): string => filename.replace(/\.docx$/i, "");

export function DocxToMarkdownPanel() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [result, setResult] = useState<MarkdownResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  // Generation counter: guards against a superseded conversion resolving after
  // a newer one. Same pattern as ImageToPdfPanel and ConvertPanel.
  const requestIdRef = useRef(0);

  const onAccept = async (files: AcceptedFile[]) => {
    const next = files[0];
    const requestId = ++requestIdRef.current;
    setFile(next);
    setResult(null);
    setFailure(null);
    setIsConverting(true);
    try {
      const converted = await docxToMarkdown(next.bytes);
      if (requestId !== requestIdRef.current) return;
      setResult(converted);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setFailure(cause instanceof Error ? cause.message : "This document could not be converted.");
    } finally {
      if (requestId === requestIdRef.current) setIsConverting(false);
    }
  };

  const onDownload = async () => {
    if (!result || !file) return;
    const stem = stemOf(file.name);

    // A document with no images has nothing to archive, and a one-entry ZIP
    // just makes the user unzip it again.
    if (result.images.length === 0) {
      downloadBlob(
        new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }),
        `${stem}.md`,
      );
      return;
    }

    const zip = await zipFiles([
      { name: `${stem}.md`, blob: new Blob([result.markdown], { type: "text/markdown" }) },
      ...result.images.map((image) => ({
        name: image.name,
        blob: new Blob([image.bytes as BlobPart]),
      })),
    ]);
    downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `${stem}.zip`);
  };

  return (
    <div className="space-y-4">
      <FileDropzone
        kind="docx"
        label={file ? "Choose a different document" : "Drop a .docx here, or click to choose"}
        onAccept={(files) => void onAccept(files)}
      />

      <p className="text-sm text-muted-foreground">
        Headings, bold, italic, lists, tables and links are preserved. Images come back in a ZIP
        alongside the Markdown. Everything runs in this tab — nothing is uploaded.
      </p>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {isConverting && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Converting…
        </p>
      )}

      {result && file && (
        <>
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatBytes(file.size)} · {result.markdown.length.toLocaleString()} characters
              {result.images.length > 0 ? ` · ${result.images.length} image(s)` : ""}
            </p>
          </div>

          {result.warnings.length > 0 && (
            <details className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {result.warnings.length} thing(s) could not be converted exactly
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {result.warnings.slice(0, 20).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          )}

          <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-card p-4 text-xs">
            {result.markdown}
          </pre>

          <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur-md reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {result.images.length > 0 ? "Downloads as a ZIP with an images folder" : "Ready"}
            </p>
            <Button onClick={() => void onDownload()}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {result.images.length > 0 ? "Download ZIP" : "Download .md"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
