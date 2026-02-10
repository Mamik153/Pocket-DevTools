import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="markdown-viewer prose prose-stone max-w-none prose-headings:font-semibold prose-pre:bg-stone-950 prose-pre:text-stone-100 prose-a:text-teal-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
