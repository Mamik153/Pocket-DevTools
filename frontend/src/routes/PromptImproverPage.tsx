import { useState } from "react";
import { Copy, ScanSearch } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Defaults & sample data
// ---------------------------------------------------------------------------

const SAMPLE_PROMPT =
  "Write a 3-paragraph launch announcement for a React developer-tools website, highlighting the top 3 features and ending with a clear call-to-action.";

const SAMPLE_PERSONA = "Senior developer-relations writer";
const SAMPLE_AUDIENCE = "Frontend developers";
const SAMPLE_TONE = "Professional yet enthusiastic";
const SAMPLE_LENGTH = "3 paragraphs, roughly 150–200 words total";
const SAMPLE_OUTPUT_FORMAT =
  "Short sections with bullet points for the feature highlights followed by one call-to-action paragraph.";
const SAMPLE_CONTEXT = "";
const SAMPLE_EXAMPLES = "";
const SAMPLE_CONSTRAINTS = "";

const DEFAULT_PERSONA = "Expert assistant focused on clear, actionable outputs";
const DEFAULT_AUDIENCE = "Frontend developers";
const DEFAULT_OUTPUT_FORMAT =
  "Use short sections with bullet points and one call-to-action.";

const TONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Professional", label: "Professional" },
  { value: "Friendly", label: "Friendly" },
  { value: "Formal", label: "Formal" },
  { value: "Casual", label: "Casual" },
  { value: "Technical", label: "Technical" },
  { value: "Concise", label: "Concise" },
  { value: "Enthusiastic", label: "Enthusiastic" },
  { value: "Neutral", label: "Neutral" },
  { value: "Professional yet enthusiastic", label: "Professional yet enthusiastic" },
  { value: "custom", label: "Custom…" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeSentence = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
};

// ---------------------------------------------------------------------------
// Prompt builder – follows OpenAI & Google prompt-engineering guidelines
// ---------------------------------------------------------------------------

interface BuildPromptParams {
  rawPrompt: string;
  persona: string;
  audience: string;
  tone: string;
  length: string;
  outputFormat: string;
  constraints: string;
  contextInput: string;
  examples: string;
}

const buildImprovedPrompt = ({
  rawPrompt,
  persona,
  audience,
  tone,
  length,
  outputFormat,
  constraints,
  contextInput,
  examples,
}: BuildPromptParams): string => {
  const lines: string[] = [];

  // ── Block 1: Instructions (always first) ──────────────────────────────

  // Role / Persona
  const cleanedPersona = (persona.trim() || DEFAULT_PERSONA).trim();
  lines.push(`### Role`);
  lines.push(`You are a ${cleanedPersona}.`);
  lines.push("");

  // Objective
  const cleanedPrompt = normalizeSentence(rawPrompt);
  lines.push(`### Objective`);
  lines.push(cleanedPrompt);
  lines.push("");

  // Audience
  const cleanedAudience = (audience.trim() || DEFAULT_AUDIENCE).trim();
  lines.push(`### Audience`);
  lines.push(normalizeSentence(`Target audience: ${cleanedAudience}`));
  lines.push("");

  // Tone (optional – only included when provided)
  const cleanedTone = tone.trim();
  if (cleanedTone) {
    lines.push(`### Tone`);
    lines.push(normalizeSentence(cleanedTone));
    lines.push("");
  }

  // Length (optional – only included when provided)
  const cleanedLength = length.trim();
  if (cleanedLength) {
    lines.push(`### Length`);
    lines.push(normalizeSentence(cleanedLength));
    lines.push("");
  }

  // Constraints
  const constraintLines = constraints
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("-") ? line : `- ${line}`));

  lines.push(`### Constraints`);
  if (constraintLines.length) {
    lines.push(...constraintLines);
  } else {
    lines.push("- State assumptions explicitly.");
    lines.push(
      "- Only ask clarifying questions when the task cannot be completed without them.",
    );
    lines.push("- Keep responses concise and technically accurate.");
    lines.push("- Prefer stating what to do rather than what to avoid.");
  }
  lines.push("");

  // Output format
  const cleanedOutputFormat = outputFormat.trim() || DEFAULT_OUTPUT_FORMAT;
  lines.push(`### Output format`);
  lines.push(`- ${cleanedOutputFormat}`);
  lines.push("");

  // ── Block 2: Context / Input (optional) ───────────────────────────────

  const cleanedContext = contextInput.trim();
  if (cleanedContext) {
    lines.push(`### Context / Input`);
    lines.push(`"""`);
    lines.push(cleanedContext);
    lines.push(`"""`);
    lines.push("");
  }

  // ── Block 3: Examples (optional) ──────────────────────────────────────

  const cleanedExamples = examples.trim();
  if (cleanedExamples) {
    lines.push(`### Examples`);
    lines.push(cleanedExamples);
    lines.push("");
  }

  // ── Closing instruction ───────────────────────────────────────────────
  lines.push(
    "Before finalizing, verify the response is complete, consistent, and aligned with the constraints above.",
  );

  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PromptImproverPage() {
  const [rawPrompt, setRawPrompt] = useState(SAMPLE_PROMPT);
  const [persona, setPersona] = useState(SAMPLE_PERSONA);
  const [audience, setAudience] = useState(SAMPLE_AUDIENCE);
  const [toneSelectValue, setToneSelectValue] = useState(SAMPLE_TONE);
  const [customToneInput, setCustomToneInput] = useState("");
  const tone =
    toneSelectValue === "custom" ? customToneInput : toneSelectValue;
  const [length, setLength] = useState(SAMPLE_LENGTH);
  const [outputFormat, setOutputFormat] = useState(SAMPLE_OUTPUT_FORMAT);
  const [constraints, setConstraints] = useState(SAMPLE_CONSTRAINTS);
  const [contextInput, setContextInput] = useState(SAMPLE_CONTEXT);
  const [examples, setExamples] = useState(SAMPLE_EXAMPLES);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [output, setOutput] = useState(
    buildImprovedPrompt({
      rawPrompt: SAMPLE_PROMPT,
      persona: SAMPLE_PERSONA,
      audience: SAMPLE_AUDIENCE,
      tone: SAMPLE_TONE,
      length: SAMPLE_LENGTH,
      outputFormat: SAMPLE_OUTPUT_FORMAT,
      constraints: SAMPLE_CONSTRAINTS,
      contextInput: SAMPLE_CONTEXT,
      examples: SAMPLE_EXAMPLES,
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
        persona,
        audience,
        tone,
        length,
        outputFormat,
        constraints,
        contextInput,
        examples,
      }),
    );
    setError(null);
  };

  const onCopyPrompt = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Please copy from the text area manually.");
    }
  };

  const onLoadSample = () => {
    setRawPrompt(SAMPLE_PROMPT);
    setPersona(SAMPLE_PERSONA);
    setAudience(SAMPLE_AUDIENCE);
    const sampleTone = SAMPLE_TONE;
    const presetMatch = TONE_OPTIONS.some((o) => o.value === sampleTone);
    setToneSelectValue(presetMatch ? sampleTone : "custom");
    setCustomToneInput(presetMatch ? "" : sampleTone);
    setLength(SAMPLE_LENGTH);
    setOutputFormat(SAMPLE_OUTPUT_FORMAT);
    setConstraints(SAMPLE_CONSTRAINTS);
    setContextInput(SAMPLE_CONTEXT);
    setExamples(SAMPLE_EXAMPLES);
  };

  return (
    <ToolPageLayout
      shouldScroll={true}
      title="Prompt Improver"
      description="Structure prompts using OpenAI and Google best practices — instructions first, clear delimiters, persona, tone, and optional context or few-shot examples."
    >
      <section className="grid gap-4 lg:grid-cols-2 max-w-7xl mx-auto">
        {/* ── Left: Draft inputs ───────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="h-4 w-4" /> Prompt Draft
            </CardTitle>
            <CardDescription>
              Add a rough prompt and optional guardrails. Fields marked with *
              are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="prompt-improver-objective">
                Objective (required)
              </FieldLabel>
              <Textarea
                id="prompt-improver-objective"
                value={rawPrompt}
                onChange={(event) => setRawPrompt(event.target.value)}
                placeholder="Describe the task you want the model to perform"
                className="min-h-[140px] font-mono text-sm"
                aria-label="Objective — raw prompt input"
              />
              <FieldDescription>
                Describe the task you want the model to perform.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-persona">
                Persona / role
              </FieldLabel>
              <Input
                id="prompt-improver-persona"
                value={persona}
                onChange={(event) => setPersona(event.target.value)}
                placeholder='e.g. Senior frontend engineer, vegan chef'
                aria-label="Persona or role"
              />
              <FieldDescription>
                e.g. Senior frontend engineer, vegan chef.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-audience">
                Target audience
              </FieldLabel>
              <Input
                id="prompt-improver-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder='e.g. Frontend developers'
                aria-label="Target audience"
              />
              <FieldDescription>Who will read or use the output.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-tone">Tone</FieldLabel>
              <Select
                value={toneSelectValue}
                onValueChange={(v) => {
                  setToneSelectValue(v);
                  if (v !== "custom") setCustomToneInput("");
                }}
              >
                <SelectTrigger id="prompt-improver-tone" aria-label="Tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toneSelectValue === "custom" && (
                <Input
                  value={customToneInput}
                  onChange={(e) => setCustomToneInput(e.target.value)}
                  placeholder="e.g. Professional and concise"
                  className="mt-2"
                  aria-label="Custom tone"
                />
              )}
              <FieldDescription>
                e.g. Professional, casual, technical. Choose a preset or Custom
                to type your own.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-length">Length</FieldLabel>
              <Input
                id="prompt-improver-length"
                value={length}
                onChange={(event) => setLength(event.target.value)}
                placeholder='e.g. 3–5 bullet points, 2–3 sentences'
                aria-label="Desired length"
              />
              <FieldDescription>
                e.g. 3–5 bullet points, 2–3 sentences.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-output-format">
                Output format
              </FieldLabel>
              <Input
                id="prompt-improver-output-format"
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
                placeholder='e.g. Bullet list with headers'
                aria-label="Desired output format"
              />
              <FieldDescription>
                e.g. Bullet list, paragraphs, JSON.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-constraints">
                Constraints
              </FieldLabel>
              <Textarea
                id="prompt-improver-constraints"
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="One per line (defaults apply if empty)"
                className="min-h-[90px] font-mono text-sm"
                aria-label="Optional prompt constraints"
              />
              <FieldDescription>
                One per line; defaults apply if empty.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-context">
                Context / input text
              </FieldLabel>
              <Textarea
                id="prompt-improver-context"
                value={contextInput}
                onChange={(event) => setContextInput(event.target.value)}
                placeholder="Paste text the model should process (wrapped in delimiters)"
                className="min-h-[90px] font-mono text-sm"
                aria-label="Context or input text"
              />
              <FieldDescription>
                Paste text the model should process (wrapped in delimiters).
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-improver-examples">
                Few-shot examples
              </FieldLabel>
              <Textarea
                id="prompt-improver-examples"
                value={examples}
                onChange={(event) => setExamples(event.target.value)}
                placeholder="Input/output pairs to guide the model"
                className="min-h-[90px] font-mono text-sm"
                aria-label="Few-shot examples"
              />
              <FieldDescription>
                Input/output pairs to guide the model.
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onImprove}>Improve Prompt</Button>
              <Button variant="ghost" onClick={onLoadSample}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        {/* ── Right: Improved output ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Improved Prompt</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onCopyPrompt()}
                disabled={!output}
                aria-label={copied ? "Copied" : "Copy prompt"}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <CardDescription>
              Copy and reuse this structured prompt with any LLM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="prompt-improver-output">
                Improved prompt
              </FieldLabel>
              <Textarea
                id="prompt-improver-output"
                value={output}
                readOnly
                className="min-h-[620px] font-mono text-sm"
                aria-label="Improved prompt output"
              />
              <FieldDescription>
                Copy and reuse this structured prompt with any LLM.
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
