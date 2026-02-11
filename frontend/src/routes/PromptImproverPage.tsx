import { useState } from "react";
import { ScanSearch } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_PROMPT = "Write a launch announcement for my React developer tools website.";

const DEFAULT_OUTPUT_FORMAT = "Use short sections with bullet points and one call-to-action.";
const DEFAULT_AUDIENCE = "Frontend developers";

const normalizeSentence = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

const buildImprovedPrompt = ({
  rawPrompt,
  audience,
  outputFormat,
  constraints,
}: {
  rawPrompt: string;
  audience: string;
  outputFormat: string;
  constraints: string;
}) => {
  const cleanedPrompt = normalizeSentence(rawPrompt);
  const cleanedAudience = normalizeSentence(`Target audience: ${audience || DEFAULT_AUDIENCE}`);
  const cleanedOutputFormat = outputFormat.trim() || DEFAULT_OUTPUT_FORMAT;

  const constraintLines = constraints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("-") ? line : `- ${line}`));

  return [
    "You are an expert assistant focused on clear, actionable outputs.",
    "",
    "Goal:",
    cleanedPrompt,
    "",
    "Audience:",
    cleanedAudience,
    "",
    "Constraints:",
    ...(constraintLines.length
      ? constraintLines
      : [
          "- State assumptions explicitly.",
          "- Ask clarifying questions only when blocked.",
          "- Keep responses concise and technically accurate.",
        ]),
    "",
    "Output format:",
    `- ${cleanedOutputFormat}`,
    "",
    "Before finalizing, verify the response is complete and consistent.",
  ].join("\n");
};

export function PromptImproverPage() {
  const [rawPrompt, setRawPrompt] = useState(SAMPLE_PROMPT);
  const [audience, setAudience] = useState(DEFAULT_AUDIENCE);
  const [outputFormat, setOutputFormat] = useState(DEFAULT_OUTPUT_FORMAT);
  const [constraints, setConstraints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState(
    buildImprovedPrompt({
      rawPrompt: SAMPLE_PROMPT,
      audience: DEFAULT_AUDIENCE,
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      constraints: "",
    }),
  );

  const onImprove = () => {
    if (!rawPrompt.trim()) {
      setError("Enter a rough prompt first.");
      setOutput("");
      return;
    }

    setOutput(
      buildImprovedPrompt({
        rawPrompt,
        audience,
        outputFormat,
        constraints,
      }),
    );
    setError(null);
  };

  const onLoadSample = () => {
    setRawPrompt(SAMPLE_PROMPT);
    setAudience(DEFAULT_AUDIENCE);
    setOutputFormat(DEFAULT_OUTPUT_FORMAT);
    setConstraints("");
  };

  return (
    <ToolPageLayout
      title="Prompt Improver"
      description="Turn rough prompts into cleaner instructions with audience, constraints, and output expectations."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" /> Prompt Draft
            </CardTitle>
            <CardDescription>Add a rough prompt and optional guardrails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rawPrompt}
              onChange={(event) => setRawPrompt(event.target.value)}
              className="min-h-[180px] font-mono text-sm"
              aria-label="Raw prompt input"
            />
            <Input
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="Target audience"
              aria-label="Target audience"
            />
            <Input
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value)}
              placeholder="Desired output format"
              aria-label="Desired output format"
            />
            <Textarea
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Optional constraints (one per line)"
              className="min-h-[110px] font-mono text-sm"
              aria-label="Optional prompt constraints"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onImprove}>Improve Prompt</Button>
              <Button variant="ghost" onClick={onLoadSample}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Improved Prompt</CardTitle>
            <CardDescription>Copy and reuse this structured prompt.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              readOnly
              className="min-h-[420px] font-mono text-sm"
              aria-label="Improved prompt output"
            />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
