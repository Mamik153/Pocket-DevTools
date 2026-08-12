import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FileStack, Image as ImageIcon, Shrink, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MergePanel } from "@/components/pdf/MergePanel";

export type PdfMode = "merge" | "unlock" | "to-image" | "compress";

interface ModeConfig {
  id: PdfMode;
  label: string;
  icon: LucideIcon;
}

const MODES: ModeConfig[] = [
  { id: "merge", label: "Merge", icon: FileStack },
  { id: "unlock", label: "Unlock", icon: Unlock },
  { id: "to-image", label: "To Image", icon: ImageIcon },
  { id: "compress", label: "Compress", icon: Shrink },
];

export function PdfToolkit() {
  const [mode, setMode] = useState<PdfMode>("merge");
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="space-y-5">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="PDF tools"
      >
        {MODES.map(({ id, label, icon: Icon }) => {
          const isActive = mode === id;
          return (
            <Button
              key={id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`pdf-panel-${id}`}
              id={`pdf-tab-${id}`}
              variant={isActive ? "default" : "outline"}
              onClick={() => setMode(id)}
              className="relative"
            >
              {/*
                layoutId lets the indicator physically travel between tabs rather
                than blinking out and in — the spatial relationship stays legible.
              */}
              {isActive && !prefersReducedMotion && (
                <motion.span
                  layoutId="pdf-tab-indicator"
                  className="absolute inset-0 -z-10 rounded-xl bg-primary"
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
              )}
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Button>
          );
        })}
      </div>

      {/*
        Cross-fade rather than slide. Merge and Unlock have no spatial
        relationship, so a slide would imply one that does not exist.
      */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          id={`pdf-panel-${mode}`}
          role="tabpanel"
          aria-labelledby={`pdf-tab-${mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          {mode === "merge" && <MergePanel />}
          {mode !== "merge" && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {mode} panel coming in a later task.
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
