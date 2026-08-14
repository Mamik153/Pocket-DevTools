import type { LucideIcon } from "lucide-react";
import {
  Binary,
  Braces,
  Clock3,
  Download,
  FileDown,
  FileStack,
  Fingerprint,
  KeyRound,
  Link2,
  Link2Off,
  ScanSearch,
  Search,
  Sparkles,
} from "lucide-react";
import { ToolCard } from "@/components/home/ToolCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroDeveloperIllustration, EmptyStateIllustration } from "@/components/ui/illustrations";
import { resourceSections } from "@/config/resources";
import { tools } from "@/config/tools";
import type { ToolId, ToolDefinition } from "@/config/tools";
import { Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const SCROLL_THRESHOLD = 50;

const toolIcons: Record<ToolId, LucideIcon> = {
  "markdown-to-pdf": FileDown,
  "json-beautifier": Braces,
  "json-to-toon": Braces,
  "json-compare": Braces,
  "prompt-improver": ScanSearch,
  "url-encoder-decoder": Link2,
  "url-shortener": Link2Off,
  "jwt-decode": KeyRound,
  "uuid-generator": Fingerprint,
  "password-generator": KeyRound,
  base64: Binary,
  "regex-tester": ScanSearch,
  "timestamp-converter": Clock3,
  "pdf-toolkit": FileStack,
  downloader: Download,
};

type CategoryFilter = "all" | "pdf" | "json" | "ai" | "security" | "utils";

export function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  const [scrollTop, setScrollTop] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  const isMinimized = !prefersReducedMotion && scrollTop > SCROLL_THRESHOLD;
  const smoothOut: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const scrollTween = { type: "tween" as const, duration: 0.3, ease: smoothOut };

  const headerInitial = prefersReducedMotion
    ? { opacity: 0, padding: "12px", maxWidth: "48rem" }
    : {
        opacity: 0,
        scaleX: 0,
        scaleY: 0,
        filter: "blur(4px)",
        padding: "12px",
        maxWidth: "48rem",
      };
  const headerAnimate = prefersReducedMotion
    ? { opacity: 1, padding: "12px", maxWidth: "48rem" }
    : {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        filter: "blur(0px)",
        padding: isMinimized ? "6px 10px" : "12px",
        maxWidth: isMinimized ? "34rem" : "48rem",
      };
  const headerTransition = prefersReducedMotion
    ? { delay: 0.04, duration: 0.2, ease: smoothOut }
    : {
        delay: 0.04,
        scaleX: { type: "spring", stiffness: 290, damping: 13, mass: 0.78, velocity: 2 },
        opacity: { type: "tween", duration: 0.28, ease: smoothOut },
        filter: { type: "tween", duration: 0.4, ease: smoothOut },
        padding: scrollTween,
        maxWidth: scrollTween,
      };

  const homeTools = useMemo(() => {
    return tools.filter((tool) => tool.showOnHome !== false);
  }, []);

  const filteredTools = useMemo(() => {
    return homeTools.filter((tool) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeCategory === "all") return true;

      if (activeCategory === "pdf") return tool.id.includes("pdf") || tool.id.includes("markdown");
      if (activeCategory === "json") return tool.id.includes("json");
      if (activeCategory === "ai") return tool.id.includes("prompt");
      if (activeCategory === "security")
        return tool.id.includes("jwt") || tool.id.includes("password") || tool.id.includes("uuid");
      if (activeCategory === "utils")
        return (
          tool.id.includes("url") ||
          tool.id.includes("base64") ||
          tool.id.includes("regex") ||
          tool.id.includes("timestamp") ||
          tool.id.includes("downloader")
        );

      return true;
    });
  }, [homeTools, searchQuery, activeCategory]);

  return (
    <div className="relative">
      <motion.header
        initial={headerInitial}
        animate={headerAnimate}
        transition={headerTransition}
        style={{ transformOrigin: "50% 50%" }}
        className="fixed left-1/2 top-3 z-30 w-full -translate-x-1/2 rounded-full border border-white/60 bg-card/80 shadow-glass backdrop-blur-xl overflow-hidden px-4 py-2.5"
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className={`inline-flex items-center rounded-xl px-1 py-1 transition-[gap] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isMinimized ? "gap-2" : "gap-3"
            }`}
          >
            <motion.span
              className="rounded-xl border border-primary/20 bg-primary/10 p-1"
              animate={{ padding: isMinimized ? "3px" : "5px" }}
              transition={scrollTween}
            >
              <motion.img
                src="/logo.jpeg"
                alt="Pocket DevTools logo"
                width={36}
                height={36}
                className="rounded-lg shadow-xs"
                animate={{
                  width: isMinimized ? 26 : 36,
                  height: isMinimized ? 26 : 36,
                }}
                transition={scrollTween}
              />
            </motion.span>
            <span>
              <motion.span
                className="block font-semibold tracking-tight text-foreground"
                animate={{ fontSize: isMinimized ? "0.938rem" : "1.062rem" }}
                transition={scrollTween}
              >
                Pocket DevTools
              </motion.span>
              <motion.span
                className="block text-xs text-muted-foreground overflow-hidden"
                animate={{
                  opacity: isMinimized ? 0 : 1,
                  height: isMinimized ? 0 : "auto",
                }}
                transition={{ ...scrollTween, duration: 0.2 }}
              >
                Slick everyday tools for developers
              </motion.span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              100% Client Side
            </span>
          </div>
        </div>
      </motion.header>

      <section
        className="space-y-8 h-[96dvh] overflow-y-auto px-4 md:px-10 pt-28 pb-12 hide-scrollbar"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {/* Hero Section with Illustration */}
        <div className="grid gap-6 lg:grid-cols-12 items-center max-w-7xl w-full mx-auto bg-gradient-to-br from-card/90 via-card/70 to-secondary/30 border border-border/80 rounded-3xl p-6 md:p-10 shadow-glass backdrop-blur-md relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="space-y-4 lg:col-span-7 z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Fast • Private • Fun & Functional
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:text-5xl leading-tight">
              Slick everyday <span className="gradient-heading">devtools</span> for creators
            </h1>
            <p className="max-w-xl text-base text-muted-foreground leading-relaxed md:text-lg">
              Formatting, PDF exports, prompt refinement, and security utilities. Instant output right in your browser with zero data telemetry.
            </p>
          </div>

          <div className="lg:col-span-5 flex justify-center z-10">
            <HeroDeveloperIllustration className="w-full max-w-xs md:max-w-sm h-auto drop-shadow-md" />
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-4 max-w-7xl w-full mx-auto">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tools (e.g. PDF, JSON, Password)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border/80 bg-card/80 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-sm transition-all shadow-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
              {[
                { id: "all", label: "All Tools" },
                { id: "pdf", label: "PDF & Docs" },
                { id: "json", label: "JSON Suite" },
                { id: "ai", label: "AI & Prompts" },
                { id: "security", label: "Security & Keys" },
                { id: "utils", label: "Utilities" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as CategoryFilter)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    activeCategory === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 max-w-7xl w-full mx-auto">
            {filteredTools.map((tool, idx) => (
              <ToolCard key={tool.id} tool={tool} icon={toolIcons[tool.id]} index={idx} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center py-12 space-y-3 bg-card/60 rounded-3xl border border-border/60 p-6 backdrop-blur-sm">
            <EmptyStateIllustration className="w-36 h-36 mx-auto" />
            <h3 className="text-lg font-semibold">No tools found</h3>
            <p className="text-sm text-muted-foreground">
              No devtool matches "{searchQuery}". Try searching for another keyword or clear filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-2 text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              Reset search filters
            </button>
          </div>
        )}

        {/* Resources Section */}
        <section className="space-y-4 max-w-7xl w-full mx-auto pb-10 pt-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Hand-picked Resources</h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Curated links for components, AI tooling, sandboxes, and developer reference.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {resourceSections.map((resource) => (
              <Card key={resource.title} className="h-full border-border/70 bg-card/75 backdrop-blur-md hover:border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-foreground">{resource.title}</CardTitle>
                  <CardDescription className="text-xs">
                    Speed up your workflow with these trusted platforms.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resource.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline hover:text-accent"
                    >
                      <span>{link.name}</span>
                      <span className="text-xs text-muted-foreground">↗</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

