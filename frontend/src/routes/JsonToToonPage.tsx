import { useState } from "react";
import { Braces } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const SAMPLE_JSON = `{
  "project": "DevTools Hub",
  "features": ["json-to-toon", "prompt-improver"],
  "metadata": {
    "owner": "team-alpha",
    "active": true,
    "priority": 2
  }
}`;

const isScalar = (value: JsonValue): value is JsonPrimitive =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null;

const escapeString = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const formatKey = (value: string) =>
  /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value) ? value : `"${escapeString(value)}"`;

const formatScalar = (value: JsonPrimitive) => {
  if (typeof value === "string") return `"${escapeString(value)}"`;
  if (value === null) return "null";
  return String(value);
};

const renderToToon = (value: JsonValue, indent = 0): string => {
  if (isScalar(value)) return formatScalar(value);
  if (Array.isArray(value)) return renderArray(value, indent);
  return renderObject(value, indent);
};

const renderObject = (value: { [key: string]: JsonValue }, indent: number) => {
  const pad = "  ".repeat(indent);
  const entries = Object.entries(value);

  if (!entries.length) return `${pad}{}`;

  return entries
    .map(([key, item]) => {
      const label = `${pad}${formatKey(key)}:`;

      if (isScalar(item)) return `${label} ${formatScalar(item)}`;
      if (Array.isArray(item) && item.length === 0) return `${label} []`;
      if (!Array.isArray(item) && Object.keys(item).length === 0) return `${label} {}`;

      return `${label}\n${renderToToon(item, indent + 1)}`;
    })
    .join("\n");
};

const renderArray = (value: JsonValue[], indent: number) => {
  const pad = "  ".repeat(indent);

  if (!value.length) return `${pad}[]`;

  return value
    .map((item) => {
      if (isScalar(item)) return `${pad}- ${formatScalar(item)}`;
      if (Array.isArray(item) && item.length === 0) return `${pad}- []`;
      if (!Array.isArray(item) && Object.keys(item).length === 0) return `${pad}- {}`;

      return `${pad}-\n${renderToToon(item, indent + 1)}`;
    })
    .join("\n");
};

const convertJsonToToon = (input: string) => {
  const parsed = JSON.parse(input) as JsonValue;
  return renderToToon(parsed);
};

export function JsonToToonPage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [output, setOutput] = useState(convertJsonToToon(SAMPLE_JSON));
  const [error, setError] = useState<string | null>(null);

  const onConvert = () => {
    try {
      setOutput(convertJsonToToon(input));
      setError(null);
    } catch (err) {
      setOutput("");
      setError(err instanceof Error ? err.message : "Unable to convert JSON to TOON.");
    }
  };

  return (
    <ToolPageLayout
      title="JSON to TOON"
      description="Convert JSON into a clean TOON-style tree format with readable keys and nested lists."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Braces className="h-4 w-4" /> Input JSON
            </CardTitle>
            <CardDescription>Paste JSON and run conversion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[320px] font-mono text-sm"
              aria-label="JSON input for TOON conversion"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onConvert}>Convert</Button>
              <Button variant="ghost" onClick={() => setInput(SAMPLE_JSON)}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TOON Output</CardTitle>
            <CardDescription>Converted structure appears here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={output} readOnly className="min-h-[320px] font-mono text-sm" aria-label="TOON output" />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
