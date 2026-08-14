import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { SeoManager } from "@/components/seo/SeoManager";
import { tools } from "@/config/tools";
import { cn } from "@/lib/utils";
import { FloatingWidgets } from "@/components/widgets/FloatingWidgets";

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground";

export function AppLayout() {
  const location = useLocation();
  const isHomeRoute = location.pathname === "/";

  return (
    <div className="relative h-screen bg-background text-foreground overflow-hidden p-2 md:p-3">
      <SeoManager />
      {/* Ambient background glow mesh */}
      <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -right-28 -bottom-28 h-96 w-96 rounded-full bg-orange-400/15 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-purple-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex h-full w-full flex-col px-1 pt-1 md:px-0 bg-transparent">
        <main
          className={cn(
            "flex-1 mx-auto w-full border border-border/70 rounded-3xl relative bg-card/65 backdrop-blur-md shadow-glass",
            isHomeRoute ? "overflow-visible" : "overflow-y-auto hide-scrollbar",
          )}
        >
          <Outlet />
        </main>

        <footer className="py-2 text-center text-xs text-muted-foreground">
          Pocket DevTools • Made with care by{" "}
          <a
            href="https://www.slickspender.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-2 hover:underline hover:text-primary font-medium"
          >
            SlickSpender
          </a>
        </footer>
      </div>

      <FloatingWidgets />
    </div>
  );
}
