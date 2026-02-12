import { useMemo, useState } from "react";
import { Split } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { diffJsonValues } from "@/lib/jsonDiff";

const LEFT_SAMPLE = '{"name":"Alice","role":"developer","flags":{"beta":true}}';
const RIGHT_SAMPLE = '{"name":"Alice","role":"lead developer","flags":{"beta":false,"new_ui":true}}';

export function JsonComparePage() {
  const [leftInput, setLeftInput] = useState(LEFT_SAMPLE);
  const [rightInput, setRightInput] = useState(RIGHT_SAMPLE);
  const [comparePressed, setComparePressed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftValue, setLeftValue] = useState<unknown>(null);
  const [rightValue, setRightValue] = useState<unknown>(null);

  const runCompare = () => {
    setComparePressed(true);

    try {
      const parsedLeft = JSON.parse(leftInput);
      const parsedRight = JSON.parse(rightInput);
      setLeftValue(parsedLeft);
      setRightValue(parsedRight);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON input.");
      setLeftValue(null);
      setRightValue(null);
    }
  };

  const differences = useMemo(() => {
    if (!comparePressed || error) {
      return [];
    }
    return diffJsonValues(leftValue, rightValue);
  }, [comparePressed, error, leftValue, rightValue]);

  return (
    <ToolPageLayout
      title="JSON Compare"
      description="Compare two JSON blobs and pinpoint exact path-level differences."
    >
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Split className="h-4 w-4" /> Left JSON
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={leftInput}
                onChange={(event) => setLeftInput(event.target.value)}
                className="min-h-[260px] font-mono text-sm"
                aria-label="Left JSON"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Right JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rightInput}
                onChange={(event) => setRightInput(event.target.value)}
                className="min-h-[260px] font-mono text-sm"
                aria-label="Right JSON"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={runCompare}>Compare</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setLeftInput(LEFT_SAMPLE);
              setRightInput(RIGHT_SAMPLE);
              setComparePressed(false);
              setError(null);
            }}
          >
            Load Sample
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Diff Results</CardTitle>
            <CardDescription>Each entry shows path + value mismatch between left and right blobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {comparePressed && !error && differences.length === 0 ? (
              <p className="text-sm text-emerald-700">No differences found. JSON documents match.</p>
            ) : null}
            {differences.map((difference) => (
              <div key={`${difference.path}-${difference.left}-${difference.right}`} className="rounded-md border border-border/70 bg-secondary/20 p-3">
                <p className="font-mono text-xs text-muted-foreground">{difference.path}</p>
                <p className="text-sm">
                  <span className="font-semibold">Left:</span> <code>{difference.left}</code>
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Right:</span> <code>{difference.right}</code>
                </p>
              </div>
            ))}
            {!comparePressed ? <p className="text-sm text-muted-foreground">Run compare to see differences.</p> : null}
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
