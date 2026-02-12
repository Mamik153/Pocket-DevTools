import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTYiLCJuYW1lIjoiQWxpY2UiLCJyb2xlIjoiZGV2ZWxvcGVyIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.signature";

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const missingPadding = normalized.length % 4;
  const padded = missingPadding === 0 ? normalized : normalized + "=".repeat(4 - missingPadding);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const formatDateClaim = (value: unknown) => {
  if (typeof value !== "number") return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export function JwtDecodePage() {
  const [token, setToken] = useState(SAMPLE_JWT);
  const [header, setHeader] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDecode = () => {
    const cleanToken = token.trim().replace(/^Bearer\s+/i, "");
    const parts = cleanToken.split(".");

    if (parts.length < 2) {
      setError("Invalid token format. Expected at least header.payload.");
      setHeader(null);
      setPayload(null);
      return;
    }

    try {
      const decodedHeader = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
      const decodedPayload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
      setHeader(decodedHeader);
      setPayload(decodedPayload);
      setError(null);
    } catch {
      setError("Unable to decode token. Ensure header and payload are valid base64url JSON.");
      setHeader(null);
      setPayload(null);
    }
  };

  const claimNotes = useMemo(() => {
    if (!payload) return [];
    const notes: string[] = [];

    const issuedAt = formatDateClaim(payload.iat);
    if (issuedAt) {
      notes.push(`iat: ${issuedAt}`);
    }

    const expiresAt = formatDateClaim(payload.exp);
    if (expiresAt) {
      notes.push(`exp: ${expiresAt}`);
    }

    return notes;
  }, [payload]);

  return (
    <ToolPageLayout
      title="JWT Decode"
      description="Decode and inspect JWT header/payload claims. Signature validation is not performed here."
    >
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Token Input
            </CardTitle>
            <CardDescription>Paste a JWT (optional `Bearer` prefix supported).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="min-h-[160px] font-mono text-sm"
              aria-label="JWT input"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={onDecode}>Decode</Button>
              <Button variant="ghost" onClick={() => setToken(SAMPLE_JWT)}>
                Load Sample
              </Button>
            </div>
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Header</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={header ? JSON.stringify(header, null, 2) : ""}
                readOnly
                className="min-h-[220px] font-mono text-sm"
                aria-label="JWT header output"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={payload ? JSON.stringify(payload, null, 2) : ""}
                readOnly
                className="min-h-[220px] font-mono text-sm"
                aria-label="JWT payload output"
              />
              {claimNotes.length > 0 ? (
                <div className="rounded-md border border-border/70 bg-secondary/20 p-3 text-sm text-muted-foreground">
                  {claimNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </ToolPageLayout>
  );
}
