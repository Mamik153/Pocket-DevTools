import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { PdfToolkit } from "@/components/pdf/PdfToolkit";

export function PdfToolkitPage() {
  return (
    <ToolPageLayout
      title="PDF Toolkit"
      description="Merge, unlock, compress, and convert PDFs to images. Every file is processed in your browser and never uploaded."
    >
      <PdfToolkit />
    </ToolPageLayout>
  );
}
