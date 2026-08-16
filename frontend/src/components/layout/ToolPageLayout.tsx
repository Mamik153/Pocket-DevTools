import { cn, parentPath } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { tools } from "@/config/tools";

interface ToolPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  shouldScroll?: boolean;
}

export function ToolPageLayout({
  title,
  description,
  children,
  className,
  shouldScroll = false,
}: ToolPageLayoutProps) {
  const parent = parentPath(useLocation().pathname);
  // Name the destination when it is itself a registered tool, so a sub-route
  // reads "Back to Image Converter" rather than the generic "Back to tools".
  const parentName = tools.find((tool) => tool.path === parent)?.name;

  return (
    <section
      className={cn(
        "space-y-6 overflow-hidden max-w-7xl w-full mx-auto px-4 md:px-10 pt-6 pb-6",
        shouldScroll && "overflow-y-auto h-[calc(100vh-4rem)] max-w-full",
        className,
      )}
    >
      <div className={cn("space-y-2 border-b border-border/50 pb-4", shouldScroll && "max-w-7xl mx-auto")}>
        <Link
          to={parent as "/"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 active:scale-95 hover:bg-secondary hover:text-foreground hover:border-primary/30"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{parentName ? `Back to ${parentName}` : "Back to tools"}</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl pt-1">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

