import { useMemo, useState } from "react";
import { Braces, Split } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { JsonEditorWithLineNumbers } from "@/components/json/JsonEditorWithLineNumbers";
import { JsonScaffoldBuilder } from "@/components/json/JsonScaffoldBuilder";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { diffJsonValues } from "@/lib/jsonDiff";
import { convertJsonValueToToon } from "@/lib/jsonToToon";
import { beautifyJson, minifyJson, validateJson } from "@/lib/jsonValidation";
import { cn } from "@/lib/utils";
import type { JsonToolkitMode } from "@/types/jsonToolkit";

interface JsonToolkitProps {
  initialMode?: JsonToolkitMode;
}

type JsonPaneTarget = "left" | "right";

const LEFT_SAMPLE = `{
  "name": "Alice",
  "role": "developer",
  "flags": {
    "beta": true,
    "new_ui": false
  }
}`;

const RIGHT_SAMPLE = `{
  "name": "Alice",
  "role": "lead developer",
  "flags": {
    "beta": false,
    "new_ui": true
  }
}`;

const MODE_CONFIG: Array<{ id: JsonToolkitMode; label: string }> = [
  { id: "compare", label: "Compare" },
  { id: "beautify", label: "Beautify" },
  { id: "toon", label: "TOON" },
  { id: "scaffold", label: "Scaffold" },
];

function sideTitle(side: JsonPaneTarget): string {
  return side === "left" ? "Left" : "Right";
}

function sideInput(
  side: JsonPaneTarget,
  leftInput: string,
  rightInput: string,
): string {
  return side === "left" ? leftInput : rightInput;
}

export function JsonToolkit({ initialMode = "compare" }: JsonToolkitProps) {
  const [mode, setMode] = useState<JsonToolkitMode>(initialMode);
  const [leftInput, setLeftInput] = useState(LEFT_SAMPLE);
  const [rightInput, setRightInput] = useState(RIGHT_SAMPLE);
  const [comparePressed, setComparePressed] = useState(false);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [toonSource, setToonSource] = useState<JsonPaneTarget>("left");

  const leftValidation = useMemo(() => validateJson(leftInput), [leftInput]);
  const rightValidation = useMemo(() => validateJson(rightInput), [rightInput]);

  const leftIssue = leftValidation.ok ? null : leftValidation.issue;
  const rightIssue = rightValidation.ok ? null : rightValidation.issue;

  const differences = useMemo(() => {
    if (!comparePressed || !leftValidation.ok || !rightValidation.ok) {
      return [];
    }

    return diffJsonValues(leftValidation.value, rightValidation.value);
  }, [comparePressed, leftValidation, rightValidation]);

  const toonResult = useMemo(() => {
    const sourceValidation =
      toonSource === "left" ? leftValidation : rightValidation;

    if (!sourceValidation.ok) {
      return "";
    }

    return convertJsonValueToToon(sourceValidation.value);
  }, [toonSource, leftValidation, rightValidation]);

  const handleSetMode = (nextMode: JsonToolkitMode) => {
    setMode(nextMode);
    setToolMessage(null);
  };

  const handleLoadSample = () => {
    setLeftInput(LEFT_SAMPLE);
    setRightInput(RIGHT_SAMPLE);
    setComparePressed(false);
    setToolMessage(null);
  };

  const formatSide = (
    target: JsonPaneTarget,
    action: "beautify" | "minify",
  ) => {
    const currentInput = sideInput(target, leftInput, rightInput);
    const result =
      action === "beautify"
        ? beautifyJson(currentInput, 2)
        : minifyJson(currentInput);

    if (!result.ok || typeof result.output !== "string") {
      const issue = result.ok ? null : result.issue;
      setToolMessage(
        issue
          ? `${sideTitle(target)} JSON is malformed at line ${issue.line}, column ${issue.column}.`
          : `${sideTitle(target)} JSON is malformed.`,
      );
      return;
    }

    if (target === "left") {
      setLeftInput(result.output);
    } else {
      setRightInput(result.output);
    }

    setToolMessage(
      `${sideTitle(target)} JSON ${action === "beautify" ? "beautified" : "minified"}.`,
    );
  };

  const insertScaffold = (target: JsonPaneTarget, json: string) => {
    if (target === "left") {
      setLeftInput(json);
    } else {
      setRightInput(json);
    }

    setToolMessage(`Scaffold inserted into ${sideTitle(target)} JSON.`);
  };

  return (
    <ToolPageLayout
      title="JSON Toolkit"
      description="One-shot JSON utility for compare, beautify/minify, malformed-line debugging, TOON conversion, and scaffolding."
      className="overflow-y-auto h-[calc(100vh-4rem)] max-w-full"
    >
      <section className="space-y-4 pb-4 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Braces className="h-4 w-4" /> Toolkit Modes
            </CardTitle>
            <CardDescription>
              Switch modes without losing your shared left/right JSON workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {MODE_CONFIG.map((modeOption) => (
                <Button
                  key={modeOption.id}
                  variant={mode === modeOption.id ? "default" : "outline"}
                  onClick={() => handleSetMode(modeOption.id)}
                >
                  {modeOption.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={handleLoadSample}>
                Load Sample Pair
              </Button>
            </div>

            {toolMessage ? (
              <p className="text-sm text-primary">{toolMessage}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Split className="h-4 w-4" /> Left JSON
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JsonEditorWithLineNumbers
                label="Left JSON"
                ariaLabel="Left JSON"
                value={leftInput}
                onChange={(value) => {
                  setLeftInput(value);
                  setToolMessage(null);
                }}
                issue={leftIssue}
                minHeightClassName="min-h-[300px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Right JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonEditorWithLineNumbers
                label="Right JSON"
                ariaLabel="Right JSON"
                value={rightInput}
                onChange={(value) => {
                  setRightInput(value);
                  setToolMessage(null);
                }}
                issue={rightIssue}
                minHeightClassName="min-h-[300px]"
              />
            </CardContent>
          </Card>
        </div>

        {mode === "compare" ? (
          <Card>
            <CardHeader>
              <CardTitle>Compare Results</CardTitle>
              <CardDescription>
                Run compare to inspect path-level mismatches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setComparePressed(true);
                    setToolMessage(null);
                  }}
                >
                  Compare
                </Button>
              </div>

              {comparePressed && (!leftValidation.ok || !rightValidation.ok) ? (
                <p className="text-sm text-rose-700">
                  Fix malformed JSON in highlighted red lines before compare.
                </p>
              ) : null}

              {comparePressed &&
              leftValidation.ok &&
              rightValidation.ok &&
              differences.length === 0 ? (
                <p className="text-sm text-emerald-700">
                  No differences found. JSON documents match.
                </p>
              ) : null}

              {differences.map((difference) => (
                <div
                  key={`${difference.path}-${difference.left}-${difference.right}`}
                  className="rounded-md border border-border/70 bg-secondary/20 p-3"
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {difference.path}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Left:</span>{" "}
                    <code>{difference.left}</code>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Right:</span>{" "}
                    <code>{difference.right}</code>
                  </p>
                </div>
              ))}

              {!comparePressed ? (
                <p className="text-sm text-muted-foreground">
                  Run compare to see differences.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {mode === "beautify" ? (
          <Card>
            <CardHeader>
              <CardTitle>Beautify and Minify</CardTitle>
              <CardDescription>
                Format either side without leaving the shared compare workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => formatSide("left", "beautify")}>
                  Beautify Left
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => formatSide("left", "minify")}
                >
                  Minify Left
                </Button>
                <Button onClick={() => formatSide("right", "beautify")}>
                  Beautify Right
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => formatSide("right", "minify")}
                >
                  Minify Right
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {mode === "toon" ? (
          <Card>
            <CardHeader>
              <CardTitle>JSON to TOON</CardTitle>
              <CardDescription>
                Convert left or right JSON into TOON tree format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={toonSource === "left" ? "default" : "outline"}
                  onClick={() => setToonSource("left")}
                >
                  Source: Left
                </Button>
                <Button
                  variant={toonSource === "right" ? "default" : "outline"}
                  onClick={() => setToonSource("right")}
                >
                  Source: Right
                </Button>
              </div>

              <Textarea
                value={toonResult}
                readOnly
                className={cn(
                  "min-h-[320px] font-mono text-sm",
                  !toonResult ? "opacity-70" : null,
                )}
                aria-label="TOON output"
                placeholder="Select a valid source JSON to generate TOON output."
              />

              {(toonSource === "left" ? leftIssue : rightIssue) ? (
                <p className="text-sm text-rose-700">
                  Fix malformed JSON in the selected source to generate TOON
                  output.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {mode === "scaffold" ? (
          <JsonScaffoldBuilder
            onInsertLeft={(json) => insertScaffold("left", json)}
            onInsertRight={(json) => insertScaffold("right", json)}
          />
        ) : null}
      </section>
    </ToolPageLayout>
  );
}
