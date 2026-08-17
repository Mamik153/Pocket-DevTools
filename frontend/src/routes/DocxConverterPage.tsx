import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileCode, FileType, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { DocxToMarkdownPanel } from "@/components/docx/DocxToMarkdownPanel";
import { DocxToPdfPanel } from "@/components/docx/DocxToPdfPanel";

interface DocxMode {
  slug: "to-pdf" | "to-markdown";
  label: string;
  description: string;
  icon: LucideIcon;
  Panel: () => React.JSX.Element;
}

const MODES: DocxMode[] = [
  {
    slug: "to-pdf",
    label: "To PDF",
    description: "Keeps the document's own fonts, margins and page breaks.",
    icon: FileType,
    Panel: DocxToPdfPanel,
  },
  {
    slug: "to-markdown",
    label: "To Markdown",
    description: "Headings, lists, tables and links preserved. Images exported alongside.",
    icon: FileCode,
    Panel: DocxToMarkdownPanel,
  },
];

const PrivacyNote = () => (
  <p className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
    <span>
      Every conversion runs entirely inside your browser. Your files are never uploaded, never
      stored, and never seen by us or anyone else.
    </span>
  </p>
);

export function DocxConverterIndex() {
  return (
    <ToolPageLayout
      title="DOCX Converter"
      description="Convert Word documents to PDF or Markdown. Every file is processed in your browser and never uploaded."
      shouldScroll
      className="max-w-7xl mx-auto w-full"
    >
      <div className="space-y-5">
        <PrivacyNote />
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODES.map(({ slug, label, description, icon: Icon }) => (
            <li key={slug}>
              <Link
                to={`/docx-converter/${slug}` as "/docx-converter/to-pdf"}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] motion-reduce:active:scale-100"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{description}</span>
                </span>
                <ChevronRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ToolPageLayout>
  );
}

function DocxRoute({ mode }: { mode: DocxMode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Arriving here unmounts the card that was clicked, dropping focus to <body>
  // and sending the next Tab to the top of the document. Move it deliberately.
  // ToolPageLayout's own back link already goes up one level, so there is no
  // second back link here.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <ToolPageLayout
      title={`DOCX Converter — ${mode.label}`}
      description={mode.description}
      shouldScroll
      className="max-w-7xl mx-auto w-full"
    >
      <div className="space-y-5">
        <PrivacyNote />
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          {mode.label}
        </h2>
        {/*
          Do NOT wrap this in AnimatePresence. Both panels rely on unmount to
          abandon in-flight work; an exit animation holds them mounted past the
          state change. Same reasoning as PdfToolkit.tsx:107-114.
        */}
        <mode.Panel key={mode.slug} />
      </div>
    </ToolPageLayout>
  );
}

// One thin export per sub-route so router.tsx can lazy-import everything it
// needs from this module. A static import of MODES would pull both panels and
// all five libraries into the main bundle.
export const ToPdfPage = () => <DocxRoute mode={MODES[0]} />;
export const ToMarkdownPage = () => <DocxRoute mode={MODES[1]} />;
