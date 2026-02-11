import { useState } from "react";
import { Link2 } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_URL = "https://example.com/search?q=tanstack router&sort=created_at desc";

export function UrlEncoderDecoderPage() {
  const [input, setInput] = useState(SAMPLE_URL);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onEncode = () => {
    setOutput(encodeURIComponent(input));
    setError(null);
  };

  const onDecode = () => {
    try {
      setOutput(decodeURIComponent(input));
      setError(null);
    } catch {
      setError("Unable to decode value. Check for malformed escape sequences.");
      setOutput("");
    }
  };

  return (
    <ToolPageLayout
      title="URL Encoder/Decoder"
      description="Encode unsafe URL characters or decode encoded strings for easier inspection."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Input
            </CardTitle>
            <CardDescription>Enter a raw or encoded URL string.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[260px] font-mono text-sm"
              aria-label="URL input"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onEncode}>Encode</Button>
              <Button variant="secondary" onClick={onDecode}>
                Decode
              </Button>
              <Button variant="ghost" onClick={() => setInput(SAMPLE_URL)}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>Result of encode/decode operation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={output} readOnly className="min-h-[260px] font-mono text-sm" aria-label="URL output" />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
