import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileStack,
  Image as ImageIcon,
  ShieldCheck,
  Shrink,
  Unlock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CompressPanel } from "@/components/pdf/CompressPanel";
import { MergePanel } from "@/components/pdf/MergePanel";
import { ToImagePanel } from "@/components/pdf/ToImagePanel";
import { UnlockPanel } from "@/components/pdf/UnlockPanel";

export type PdfMode = "merge" | "unlock" | "to-image" | "compress";

interface ModeConfig {
  id: PdfMode;
  label: string;
  description: string;
  icon: LucideIcon;
  Panel: () => React.JSX.Element;
}

const MODES: ModeConfig[] = [
  {
    id: "merge",
    label: "Merge PDFs",
    description: "Combine several PDFs into one, in any order you like.",
    icon: FileStack,
    Panel: MergePanel,
  },
  {
    id: "unlock",
    label: "Unlock PDF",
    description: "Remove a password or copy/print restrictions from a PDF you can open.",
    icon: Unlock,
    Panel: UnlockPanel,
  },
  {
    id: "to-image",
    label: "PDF to Image",
    description: "Turn each page into a PNG or JPEG, downloaded singly or as a ZIP.",
    icon: ImageIcon,
    Panel: ToImagePanel,
  },
  {
    id: "compress",
    label: "Compress PDF",
    description: "Shrink a PDF losslessly, or rasterise it for much bigger savings.",
    icon: Shrink,
    Panel: CompressPanel,
  },
];

export function PdfToolkit() {
  const [mode, setMode] = useState<PdfMode | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  /** Which card was last opened, so returning restores focus to it. Null on first paint. */
  const lastModeRef = useRef<PdfMode | null>(null);

  // Clicking a card removes it from the DOM, which drops focus to <body> and sends the
  // next Tab back to the top of the document. Move focus deliberately instead.
  useEffect(() => {
    (mode ? headingRef.current : cardRef.current)?.focus();
  }, [mode]);

  const active = MODES.find((entry) => entry.id === mode);

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Every one of these tools runs entirely inside your browser. Your files are never
          uploaded, never stored, and never seen by us or anyone else.
        </span>
      </p>

      {active ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            All PDF tools
          </button>

          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
            {active.label}
          </h2>

          {/*
            Conditional rendering is what unmounts the previous panel, and every panel
            depends on that: object URLs are revoked, in-flight renders are superseded, and
            UnlockPanel discards the typed password. `active.Panel` keeps the component TYPE
            varying per mode — a single wrapper taking `mode` as a prop would preserve state
            and never unmount. Do NOT wrap this in AnimatePresence either: an exit animation
            holds the panel mounted past the state change, which is exactly what this avoids.
          */}
          <active.Panel key={active.id} />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {MODES.map(({ id, label, description, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                ref={id === lastModeRef.current ? cardRef : undefined}
                onClick={() => {
                  lastModeRef.current = id;
                  setMode(id);
                }}
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
