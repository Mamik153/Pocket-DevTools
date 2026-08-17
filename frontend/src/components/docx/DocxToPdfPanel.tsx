import { useEffect, useRef, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { FileDropzone, type AcceptedFile } from "@/components/common/FileDropzone";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/pdf";

export function DocxToPdfPanel() {
  const [file, setFile] = useState<AcceptedFile | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  // Abandon an in-flight render when this panel unmounts.
  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  const onAccept = async (files: AcceptedFile[]) => {
    const next = files[0];
    const requestId = ++requestIdRef.current;
    setFile(next);
    setFailure(null);
    setIsReady(false);
    setIsRendering(true);
    try {
      const { renderAsync } = await import("docx-preview");
      const container = previewRef.current;
      if (!container || requestId !== requestIdRef.current) return;
      container.replaceChildren();
      await renderAsync(new Blob([next.bytes as BlobPart]), container, undefined, {
        inWrapper: true,
        breakPages: true,
        ignoreWidth: false,
        ignoreHeight: false,
        // Data URIs rather than blob: URLs. The export clones this container's
        // innerHTML into an about:blank popup, and a data URI survives that
        // with no cross-document lifetime to reason about.
        useBase64URL: true,
      });
      if (requestId !== requestIdRef.current) return;
      setIsReady(true);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setFailure(cause instanceof Error ? cause.message : "This document could not be rendered.");
    } finally {
      if (requestId === requestIdRef.current) setIsRendering(false);
    }
  };

  const onPrint = async () => {
    const node = previewRef.current;
    if (!node) return;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      setFailure(
        "Your browser blocked the print window. Allow pop-ups for this site and try again.",
      );
      return;
    }

    printWindow.document.open();
    // Deliberately NOT cloning the app's stylesheets. Tailwind's preflight would
    // override Word's own margins and line heights, and reproducing Word's
    // layout is the entire point of this tool. docx-preview writes its styles
    // into the container itself, so they travel with innerHTML.
    printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <base href="${document.baseURI}" />
    <title>${file ? file.name.replace(/\.docx$/i, "") : "Document"}</title>
    <style>
      html, body { margin: 0; padding: 0; background: #fff; }
      @page { margin: 0; }
    </style>
  </head>
  <body>${node.innerHTML}</body>
</html>`);
    printWindow.document.close();

    printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });

    if (printWindow.document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        printWindow.addEventListener("load", () => resolve(), { once: true });
      });
    }
    if ("fonts" in printWindow.document) {
      await printWindow.document.fonts.ready;
    }
    // Images must be decoded before the dialog opens or they print blank.
    await Promise.all(
      Array.from(printWindow.document.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
    );
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <FileDropzone
        kind="docx"
        label={file ? "Choose a different document" : "Drop a .docx here, or click to choose"}
        onAccept={(files) => void onAccept(files)}
      />

      <p className="text-sm text-muted-foreground">
        The document is rendered with its own fonts, margins and page breaks, then sent to your
        browser's print dialog — choose "Save as PDF". Nothing is uploaded.
      </p>

      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}

      {isRendering && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Rendering…
        </p>
      )}

      {/*
        Always mounted: docx-preview renders into this node, so it must exist
        before the render starts. Hidden until there is something to show.
      */}
      <div
        ref={previewRef}
        className={
          isReady
            ? "max-h-[70vh] overflow-auto rounded-xl border border-border bg-white p-2"
            : "hidden"
        }
      />

      {isReady && file && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 backdrop-blur-md reduced-transparency:bg-card reduced-transparency:backdrop-blur-none">
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {file.name} · {formatBytes(file.size)}
          </p>
          <Button onClick={() => void onPrint()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Save as PDF
          </Button>
        </div>
      )}
    </div>
  );
}
