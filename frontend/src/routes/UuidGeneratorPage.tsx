import { useMemo, useState } from "react";
import { Fingerprint } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const MAX_UUID_COUNT = 50;

const fallbackUuid = () => {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const createUuid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return fallbackUuid();
};

export function UuidGeneratorPage() {
  const [countInput, setCountInput] = useState("5");
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, () => createUuid()));

  const parsedCount = useMemo(() => {
    const numericValue = Number.parseInt(countInput, 10);
    if (Number.isNaN(numericValue)) return 1;
    return Math.min(Math.max(numericValue, 1), MAX_UUID_COUNT);
  }, [countInput]);

  const generate = () => {
    setUuids(Array.from({ length: parsedCount }, () => createUuid()));
  };

  return (
    <ToolPageLayout
      title="UUID Generator"
      description="Generate one or many RFC4122-style UUIDs for IDs, seeds, and test data."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4" /> Generate
            </CardTitle>
            <CardDescription>Choose how many UUIDs to create per run (1-50).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Count</span>
              <input
                type="number"
                min={1}
                max={MAX_UUID_COUNT}
                value={countInput}
                onChange={(event) => setCountInput(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                aria-label="UUID count"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generate}>Generate UUIDs</Button>
              <Button variant="secondary" onClick={() => { setCountInput("1"); setUuids([createUuid()]); }}>
                Single UUID
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>One UUID per line.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={uuids.join("\n")}
              readOnly
              className="min-h-[280px] font-mono text-sm"
              aria-label="UUID output"
            />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
