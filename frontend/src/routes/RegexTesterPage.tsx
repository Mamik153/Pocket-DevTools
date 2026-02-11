import { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_TEXT = `Fix bugs fast.
Find TODO notes.
Refactor old modules.`;

export function RegexTesterPage() {
  const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState(SAMPLE_TEXT);

  const result = useMemo(() => {
    try {
      const regex = new RegExp(pattern, flags);
      const entries: Array<{ value: string; index: number }> = [];

      if (regex.global) {
        let match: RegExpExecArray | null = regex.exec(text);
        while (match) {
          entries.push({ value: match[0], index: match.index ?? 0 });

          if (match[0] === "") {
            regex.lastIndex += 1;
          }

          match = regex.exec(text);
        }
      } else {
        const match = regex.exec(text);
        if (match) {
          entries.push({ value: match[0], index: match.index ?? 0 });
        }
      }

      return {
        error: null,
        matches: entries
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Invalid regular expression.",
        matches: [] as Array<{ value: string; index: number }>
      };
    }
  }, [flags, pattern, text]);

  return (
    <ToolPageLayout
      title="Regex Tester"
      description="Try regular expressions against sample text and inspect exact match positions."
    >
      <section className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" /> Test Input
            </CardTitle>
            <CardDescription>Set pattern/flags and live-test against your text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Pattern</span>
                <input
                  value={pattern}
                  onChange={(event) => setPattern(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 font-mono text-sm"
                  aria-label="Regex pattern"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Flags (gimsyu)</span>
                <input
                  value={flags}
                  onChange={(event) => setFlags(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 font-mono text-sm"
                  aria-label="Regex flags"
                />
              </label>
            </div>

            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[260px] font-mono text-sm"
              aria-label="Regex test text"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Matches</CardTitle>
            <CardDescription>
              {result.error ? "Regex error detected." : `${result.matches.length} match(es) found.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.error ? <p className="text-sm text-rose-700">{result.error}</p> : null}
            {!result.error && result.matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches.</p>
            ) : null}
            {result.matches.map((match, index) => (
              <div key={`${match.value}-${match.index}-${index}`} className="rounded-md border border-border/70 bg-secondary/20 p-2">
                <p className="font-mono text-xs text-muted-foreground">Index {match.index}</p>
                <p className="font-mono text-sm">{match.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
