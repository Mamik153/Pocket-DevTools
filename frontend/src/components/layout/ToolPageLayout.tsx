import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface ToolPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ToolPageLayout({
  title,
  description,
  children,
}: ToolPageLayoutProps) {
  return (
    <section className="space-y-5 overflow-hidden max-w-7xl w-full mx-auto px-10 pt-8 pb-3">
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to tools
        </Link>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
