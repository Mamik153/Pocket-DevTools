import { useState } from "react";
import { Binary } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_TEXT = "Hello developer toolkit";

const encodeUtf8ToBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const decodeBase64ToUtf8 = (value: string) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function Base64Page() {
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [output, setOutput] = useState(encodeUtf8ToBase64(SAMPLE_TEXT));
  const [error, setError] = useState<string | null>(null);

  const onEncode = () => {
    setOutput(encodeUtf8ToBase64(input));
    setError(null);
  };

  const onDecode = () => {
    try {
      setOutput(decodeBase64ToUtf8(input.trim()));
      setError(null);
    } catch {
      setOutput("");
      setError("Invalid Base64 input.");
    }
  };

  return (
    <ToolPageLayout
      title="Base64 Encoder/Decoder"
      description="Encode plain text to Base64 and decode Base64 back to readable UTF-8 text."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Binary className="h-4 w-4" /> Input
            </CardTitle>
            <CardDescription>Paste text or Base64 value and run the desired action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[260px] font-mono text-sm"
              aria-label="Base64 input"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onEncode}>Encode</Button>
              <Button variant="secondary" onClick={onDecode}>
                Decode
              </Button>
              <Button variant="ghost" onClick={() => setInput(SAMPLE_TEXT)}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>Encoded or decoded result.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              readOnly
              className="min-h-[260px] font-mono text-sm"
              aria-label="Base64 output"
            />
          </CardContent>
        </Card>
      </section>
    </ToolPageLayout>
  );
}
