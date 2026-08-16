import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FileImage, Image as ImageIcon, ShieldCheck, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { ConvertPanel } from "@/components/image/ConvertPanel";
import type { ConvertTarget } from "@/lib/image";

interface ImageMode {
  target: ConvertTarget;
  slug: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const IMAGE_MODES: ImageMode[] = [
  {
    target: "jpeg",
    slug: "to-jpeg",
    label: "To JPEG",
    description: "From PNG, WebP, AVIF, GIF, BMP or SVG. Smallest files for photos.",
    icon: ImageIcon,
  },
  {
    target: "png",
    slug: "to-png",
    label: "To PNG",
    description: "From JPEG, WebP, AVIF, GIF, BMP or SVG. Keeps transparency, lossless.",
    icon: FileImage,
  },
  {
    target: "webp",
    slug: "to-webp",
    label: "To WebP",
    description: "From any supported image. Smaller than JPEG or PNG for the web.",
    icon: ImageIcon,
  },
  {
    target: "ico",
    slug: "to-ico",
    label: "To ICO",
    description: "Build a multi-size favicon.ico from any image, 16px through 256px.",
    icon: Star,
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

export function ImageConverterIndex() {
  return (
    <ToolPageLayout
      title="Image Converter"
      description="Convert images between JPEG, PNG, WebP and ICO. Every file is processed in your browser and never uploaded."
      shouldScroll
      className="max-w-7xl mx-auto w-full"
    >
      <div className="space-y-5">
        <PrivacyNote />
        <ul className="grid gap-4 sm:grid-cols-2">
          {IMAGE_MODES.map(({ slug, label, description, icon: Icon }) => (
            <li key={slug}>
              <Link
                to={`/image-converter/${slug}` as "/image-converter/to-jpeg"}
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

// One thin export per sub-route so router.tsx can lazy-import every component
// it needs from this module. Importing IMAGE_MODES statically instead would
// pull the whole page — panels and lib/image.ts — into the main bundle.
export const ToJpegPage = () => <ImageConvertRoute mode={IMAGE_MODES[0]} />;
export const ToPngPage = () => <ImageConvertRoute mode={IMAGE_MODES[1]} />;
export const ToWebpPage = () => <ImageConvertRoute mode={IMAGE_MODES[2]} />;
export const ToIcoPage = () => <ImageConvertRoute mode={IMAGE_MODES[3]} />;

function ImageConvertRoute({ mode }: { mode: ImageMode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Arriving here unmounts the card that was clicked, which drops focus to
  // <body> and sends the next Tab to the top of the document. Move it
  // deliberately instead. Browser Back lands here too, so this matters more
  // under routing than it did with in-place state.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <ToolPageLayout
      title={`Image Converter — ${mode.label}`}
      description={mode.description}
      shouldScroll
      className="max-w-7xl mx-auto w-full"
    >
      <div className="space-y-5">
        <PrivacyNote />
        {/* No back link here — ToolPageLayout's own one already goes up a level. */}
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          {mode.label}
        </h2>
        {/*
          Do NOT wrap this in AnimatePresence. ConvertPanel relies on unmount to
          abandon an in-flight batch; an exit animation holds it mounted past
          the state change. Same reasoning as PdfToolkit.tsx:107-114.
        */}
        <ConvertPanel key={mode.target} target={mode.target} />
      </div>
    </ToolPageLayout>
  );
}
