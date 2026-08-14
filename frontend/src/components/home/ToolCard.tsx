import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/config/tools";
import { motion } from "framer-motion";

interface ToolCardProps {
  tool: ToolDefinition;
  icon: LucideIcon;
  index?: number;
}

export function ToolCard({ tool, icon: Icon, index = 0 }: ToolCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: Math.min(index * 0.04, 0.3),
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="h-full"
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border-border/70 bg-card/85 hover:border-primary/40 hover:shadow-card-hover">
        {/* Subtle accent glow on card top */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-40" />

        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-teal-500/10 to-orange-500/10 text-primary border border-primary/20 shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            {tool.name}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {tool.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-5 pt-0" />

        <CardFooter className="p-5 pt-0 flex justify-end">
          <Link
            to={tool.path}
            className={cn(
              buttonVariants({ variant: "gradient", size: "default" }),
              "w-full sm:w-auto gap-1.5 shadow-sm group-hover:shadow-glow transition-all duration-200",
            )}
          >
            <span>{tool.ctaLabel}</span>
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

