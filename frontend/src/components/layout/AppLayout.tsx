import { Link, Outlet } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import logo from "../../../assets/logo.jpeg";
import { tools } from "@/config/tools";
import { cn } from "@/lib/utils";

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground";

export function AppLayout() {
  return (
    <div className="relative h-screen bg-background text-foreground overflow-y-auto overflow-x-hidden">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl animate-drift" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl animate-drift" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 md:px-8 md:pt-6">
        <header className="sticky top-3 z-20 mb-6 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="rounded-lg border border-border/70 bg-card/70 p-1.5">
                <img
                  src={logo}
                  alt="DevTools Hub logo"
                  className="h-5 w-5 rounded-sm"
                />
              </span>
              <span>
                <span className="block text-sm text-muted-foreground">
                  Pocket DevTools
                </span>
                <span className="block text-lg font-semibold">
                  Everyday Utilities for Developers
                </span>
              </span>
            </Link>

            <nav
              className="flex flex-1 items-center justify-end gap-1"
              aria-label="Primary"
            >
              {/* <Link
                to="/"
                className={navLinkClass}
                activeProps={{
                  className: cn(navLinkClass, "bg-secondary text-foreground"),
                }}
              >
                Home
              </Link>*/}
              {/*tools.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className={navLinkClass}
                  activeProps={{
                    className: cn(navLinkClass, "bg-secondary text-foreground"),
                  }}
                >
                  {tool.name}
                </Link>
              ))*/}
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-xs text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                Toolset
              </span>
            </nav>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
