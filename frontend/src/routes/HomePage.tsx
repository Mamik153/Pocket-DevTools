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
  Split,
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

const toolIcons: Record<ToolId, LucideIcon> = {
  audioscribe: FileAudio2,
  "json-beautifier": Braces,
  "json-to-toon": Braces,
  "json-compare": Split,
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
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          DevTools Hub
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground md:text-lg">
          Pocket DevTools is a slick collection of practical devtools for daily
          engineering tasks. Open any tool, solve the task, and move on.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} icon={toolIcons[tool.id]} />
        ))}
      </div>

      <section className="space-y-4">
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
  );
}
