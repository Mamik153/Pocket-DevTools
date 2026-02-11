import { useState } from "react";
import { Braces } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_JSON = '{"name":"Alice","skills":["typescript","python"],"active":true}';
const SAMPLE_OUTPUT = JSON.stringify(JSON.parse(SAMPLE_JSON), null, 2);

export function JsonBeautifierPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState(SAMPLE_OUTPUT);
  const [error, setError] = useState<string | null>(null);

  const runFormat = (spacing: number) => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, spacing));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON input.");
      setOutput("");
    }
  };

  return (
    <ToolPageLayout
      title="JSON Beautifier"
      description="Validate and format JSON for readability, or minify it for transport."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Braces className="h-4 w-4" /> Input JSON
            </CardTitle>
            <CardDescription>Paste JSON and choose formatting action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[320px] font-mono text-sm"
              aria-label="JSON input"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runFormat(2)}>Beautify</Button>
              <Button variant="secondary" onClick={() => runFormat(0)}>
                Minify
              </Button>
              <Button variant="ghost" onClick={() => setInput(SAMPLE_JSON)}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>Formatted JSON appears here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={output} readOnly className="min-h-[320px] font-mono text-sm" aria-label="JSON output" />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
