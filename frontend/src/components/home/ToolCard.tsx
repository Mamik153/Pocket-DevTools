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

interface ToolCardProps {
  tool: ToolDefinition;
  icon: LucideIcon;
}

export function ToolCard({ tool, icon: Icon }: ToolCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {tool.name}
        </CardTitle>
        <CardDescription>{tool.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter className="flex justify-end">
        <Link
          to={tool.path}
          className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}
        >
          {tool.ctaLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}
