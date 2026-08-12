import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { PdfToolkit } from "@/components/pdf/PdfToolkit";

export function PdfToolkitPage() {
  return (
    <ToolPageLayout
      title="PDF Toolkit"
      description="Merge, unlock, compress, and convert PDFs to images. Every file is processed in your browser and never uploaded."
      // ToolPageLayout defaults to overflow-hidden; without this the page clips
      // instead of scrolling. Same opt-in JsonToolkit and PromptImprover use.
      shouldScroll
    >
      <PdfToolkit />
    </ToolPageLayout>
  );
}
