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
    <div className="relative h-screen bg-card text-foreground overflow-hidden p-3">
      <SeoManager />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl animate-drift" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full flex-col px-4 pb-8 pt-4 md:px-0 bg-background md:pt-0">
        <main
          className={cn(
            "flex-1 mx-auto w-full border rounded-3xl relative",
            isHomeRoute ? "overflow-visible" : "overflow-y-auto hide-scrollbar",
          )}
        >
          <Outlet />
        </main>

        <footer className="mt-2 text-center text-xs text-muted-foreground">
          Made with care by{" "}
          <a
            href="https://www.slickspender.com/"
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-2 hover:underline"
          >
            SlickSpender
          </a>
        </footer>
      </div>

      <FloatingWidgets />
    </div>
  );
}
