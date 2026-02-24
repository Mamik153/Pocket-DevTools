import type { LucideIcon } from "lucide-react";
import {
  Binary,
  Braces,
  Clock3,
  FileAudio2,
  Fingerprint,
  KeyRound,
  Link2,
  Link2Off,
  ScanSearch,
} from "lucide-react";
import { ToolCard } from "@/components/home/ToolCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resourceSections } from "@/config/resources";
import { tools } from "@/config/tools";
import type { ToolId } from "@/config/tools";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Wrench } from "lucide-react";

const SCROLL_THRESHOLD = 50;

const toolIcons: Record<ToolId, LucideIcon> = {
  audioscribe: FileAudio2,
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
};

export function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  const [scrollTop, setScrollTop] = useState(0);
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
        maxWidth: isMinimized ? "32rem" : "48rem",
      };
  const headerTransition = prefersReducedMotion
    ? {
        delay: 0.04,
        duration: 0.2,
        ease: smoothOut,
      }
    : {
        delay: 0.04,
        scaleX: {
          type: "spring",
          stiffness: 290,
          damping: 13,
          mass: 0.78,
          velocity: 2,
        },
        opacity: {
          type: "tween",
          duration: 0.28,
          ease: smoothOut,
        },
        filter: {
          type: "tween",
          duration: 0.4,
          ease: smoothOut,
        },
        padding: scrollTween,
        maxWidth: scrollTween,
      };

  const homeTools = tools.filter((tool) => tool.showOnHome !== false);

  return (
    <div className="">
      <motion.header
        initial={headerInitial}
        animate={headerAnimate}
        transition={headerTransition}
        style={{ transformOrigin: "50% 50%" }}
        className="fixed left-1/2 top-3 z-30 w-full -translate-x-1/2 rounded-bl-3xl rounded-br-3xl border-x border-b border-border/60 bg-card shadow-sm backdrop-blur-sm overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-12 -top-9 h-8 rounded-full bg-white/20 blur-xl"
        />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <Link
            to="/"
            className={`inline-flex items-center rounded-md px-1 py-1 transition-[gap] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isMinimized ? "gap-2" : "gap-3"}`}
          >
            <motion.span
              className="rounded-xl border border-border/70 bg-card/70"
              animate={{ padding: isMinimized ? "4px" : "6px" }}
              transition={scrollTween}
            >
              <motion.img
                src="/logo.jpeg"
                alt="Pocket DevTools logo"
                width={40}
                height={40}
                className="rounded-lg"
                animate={{
                  width: isMinimized ? 28 : 40,
                  height: isMinimized ? 28 : 40,
                }}
                transition={scrollTween}
              />
            </motion.span>
            <span>
              <motion.span
                className="block font-semibold"
                animate={{ fontSize: isMinimized ? "0.938rem" : "1.125rem" }}
                transition={scrollTween}
              >
                Pocket DevTools
              </motion.span>
              <motion.span
                className="block text-sm text-muted-foreground overflow-hidden"
                animate={{
                  opacity: isMinimized ? 0 : 1,
                  height: isMinimized ? 0 : "auto",
                }}
                transition={{ ...scrollTween, duration: 0.2 }}
              >
                Slick everyday devtools for developers
              </motion.span>
            </span>
          </Link>
        </div>
      </motion.header>

      <section
        className="space-y-8 h-[96dvh] overflow-y-auto md:px-10 pt-28"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div className="space-y-2 max-w-7xl w-full mx-auto ">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Pocket DevTools
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
            Pocket DevTools is a slick collection of everyday devtools for
            formatting, debugging, and shipping faster. Open any tool, solve the task, and move on.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 max-w-7xl w-full mx-auto ">
          {homeTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} icon={toolIcons[tool.id]} />
          ))}
        </div>

        <section className="space-y-4 max-w-7xl mx-auto max-w-7xl w-full mx-auto pb-10">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Resources</h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Curated links for components, AI tooling, online sandboxes, and
              reading.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {resourceSections.map((resource) => (
              <Card key={resource.title} className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">{resource.title}</CardTitle>
                  <CardDescription>
                    Useful sites to speed up your workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resource.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      {link.name}
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
