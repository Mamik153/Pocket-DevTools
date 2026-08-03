import type { Components } from "react-markdown";
import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { MermaidDiagram } from "@/components/MermaidDiagram";

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const components = useMemo<Components>(() => {
    return {
      pre({ children, ...props }) {
        const child = React.Children.only(children) as
          | React.ReactElement<{ className?: string; children?: unknown }>
          | undefined;
        const childClassName = child?.props?.className ?? "";
        // Mermaid renders as a diagram, not a code box.
        if (childClassName.includes("language-mermaid")) {
          return <>{children}</>;
        }
        const lang = /language-([\w-]+)/.exec(childClassName)?.[1] ?? "txt";
        const isMarkdown = lang === "markdown" || lang === "md";
        return (
          <div className="code-block my-4 overflow-hidden rounded-xl border border-border">
            <div className="code-block-label border-b border-border bg-secondary/60 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
              {lang}
            </div>
            {isMarkdown ? (
              // Render the fence body as real markdown. Recursing reuses the plugins
              // and these overrides, so nested fences get their own labeled boxes.
              // Terminates because fence content is strictly smaller each level.
              <div className="px-4 py-1">
                <MarkdownPreview
                  markdown={String(child?.props?.children ?? "").replace(/\n$/, "")}
                />
              </div>
            ) : (
              <pre {...props} className="m-0! p-4 overflow-x-auto rounded-none bg-stone-950 text-stone-100">
                {children}
              </pre>
            )}
          </div>
        );
      },
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className ?? "");
        const lang = match ? match[1] : "";
        const source = lang === "mermaid" ? String(children).replace(/\n$/, "") : "";
        if (lang === "mermaid") {
          return <MermaidDiagram source={source} />;
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    };
  }, []);

  return (
    <div className="markdown-viewer prose prose-stone max-w-none prose-headings:font-semibold prose-a:text-teal-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // plainText keeps these as text nodes so String(children) can read the
        // raw source. Mermaid already relied on this by luck (unregistered
        // language); markdown is in lowlight's common set and would arrive tokenized.
        rehypePlugins={[[rehypeHighlight, { plainText: ["markdown", "md", "mermaid"] }]]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
