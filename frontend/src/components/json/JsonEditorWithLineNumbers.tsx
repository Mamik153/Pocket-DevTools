import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { JsonParseIssue } from "@/types/jsonToolkit";

interface JsonEditorWithLineNumbersProps {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  issue?: JsonParseIssue | null;
  minHeightClassName?: string;
  placeholder?: string;
  readOnly?: boolean;
}

const LINE_HEIGHT_PX = 24;
const CONTENT_TOP_PADDING_PX = 8;

export function JsonEditorWithLineNumbers({
  label,
  ariaLabel,
  value,
  onChange,
  issue,
  minHeightClassName,
  placeholder,
  readOnly = false,
}: JsonEditorWithLineNumbersProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const lineCount = useMemo(() => {
    const rows = value.split(/\r\n|\n|\r/).length;
    return Math.max(1, rows);
  }, [value]);

  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount],
  );

  const errorLineTop = issue
    ? CONTENT_TOP_PADDING_PX + (issue.line - 1) * LINE_HEIGHT_PX - scrollTop
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        {issue ? (
          <p className="text-xs font-medium text-rose-700">Malformed JSON</p>
        ) : (
          <p className="text-xs text-emerald-700">Valid JSON</p>
        )}
      </div>

      <div className="json-editor-shell  h-[400px] flex overflow-hidden">
        <div className="json-editor-gutter" aria-hidden="true">
          <div
            className="json-editor-gutter-content"
            style={{ transform: `translateY(${-scrollTop}px)` }}
          >
            {lineNumbers.map((lineNumber) => (
              <div
                key={lineNumber}
                className={cn(
                  "json-editor-gutter-line",
                  issue?.line === lineNumber
                    ? "json-editor-gutter-line-error"
                    : null,
                )}
              >
                {lineNumber}
              </div>
            ))}
          </div>
        </div>

        <div className="json-editor-input-wrap">
          {issue ? (
            <div
              className="json-editor-error-highlight"
              style={{ top: `${errorLineTop}px` }}
              aria-hidden="true"
            />
          ) : null}

          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            className={cn(
              "json-editor-textarea flex-1 resize-none h-[400px]",
              minHeightClassName ?? "min-h-[320px]",
              readOnly ? "cursor-default" : null,
            )}
            placeholder={placeholder}
            aria-label={ariaLabel}
            readOnly={readOnly}
            spellCheck={false}
          />
        </div>
      </div>

      {issue ? (
        <p className="text-xs text-rose-700">
          Line {issue.line}, Column {issue.column}: {issue.message}
        </p>
      ) : null}
    </div>
  );
}
