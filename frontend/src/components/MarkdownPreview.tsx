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
        const child = React.Children.only(children) as React.ReactElement<{ className?: string }> | undefined;
        const isMermaid = child?.props?.className?.includes("language-mermaid");
        if (isMermaid) {
          return <>{children}</>;
        }
        return <pre {...props}>{children}</pre>;
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
    <div className="markdown-viewer prose prose-stone max-w-none prose-headings:font-semibold prose-pre:bg-stone-950 prose-pre:text-stone-100 prose-a:text-teal-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
