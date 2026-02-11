import { useEffect, useState } from "react";
import { ExternalLink, Link2Off } from "lucide-react";
import { ToolPageLayout } from "@/components/layout/ToolPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SAMPLE_URL = "https://example.com/docs/guides/getting-started?ref=toolkit";

interface ShortLink {
  code: string;
  long_url: string;
  short_url: string;
  click_count: number;
  created_at: string;
  last_accessed_at: string | null;
}

interface ApiErrorBody {
  detail?: string;
}

const parseError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as ApiErrorBody;
    return payload.detail ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

export function UrlShortenerPage() {
  const [longUrlInput, setLongUrlInput] = useState(SAMPLE_URL);
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [latestShortUrl, setLatestShortUrl] = useState("");
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecentLinks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/short-links?limit=20`);
      if (!response.ok) {
        throw new Error(await parseError(response, "Unable to load short links."));
      }
      const data = (await response.json()) as ShortLink[];
      setLinks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load short links.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecentLinks();
  }, []);

  const onShorten = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/short-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          long_url: longUrlInput,
          custom_code: customCodeInput.trim() || null
        })
      });
      if (!response.ok) {
        throw new Error(await parseError(response, "Unable to shorten URL."));
      }

      const link = (await response.json()) as ShortLink;
      setLatestShortUrl(link.short_url);
      setCustomCodeInput("");
      setLongUrlInput(link.long_url);
      setLinks((current) => [link, ...current.filter((item) => item.code !== link.code)].slice(0, 20));
      setError(null);
    } catch (err) {
      setLatestShortUrl("");
      setError(err instanceof Error ? err.message : "Unable to shorten URL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onClear = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/short-links`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(await parseError(response, "Unable to clear short links."));
      }

      setLinks([]);
      setLatestShortUrl("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clear short links.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ToolPageLayout
      title="URL Shortener"
      description="Create server-backed short links that redirect through the API and track clicks."
    >
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2Off className="h-4 w-4" /> Input
            </CardTitle>
            <CardDescription>Provide a destination URL, then generate a short link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Long URL</span>
              <Input
                value={longUrlInput}
                onChange={(event) => setLongUrlInput(event.target.value)}
                placeholder="https://example.com/path"
                aria-label="Long URL"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-muted-foreground">Custom Code (Optional)</span>
              <Input
                value={customCodeInput}
                onChange={(event) => setCustomCodeInput(event.target.value)}
                placeholder="my-link-1"
                aria-label="Custom short code"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void onShorten()} disabled={isSubmitting}>
                {isSubmitting ? "Shortening..." : "Shorten URL"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setLongUrlInput(SAMPLE_URL);
                  setCustomCodeInput("");
                  setError(null);
                }}
              >
                Load Sample
              </Button>
              <Button variant="secondary" onClick={() => void onClear()} disabled={isClearing}>
                {isClearing ? "Clearing..." : "Clear History"}
              </Button>
            </div>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Latest Result</CardTitle>
              <CardDescription>Most recently created short URL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={latestShortUrl}
                readOnly
                className="min-h-[120px] font-mono text-sm"
                aria-label="Latest short URL"
              />
              {latestShortUrl ? (
                <a
                  href={latestShortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open short URL <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Links</CardTitle>
              <CardDescription>Persistent server-side links and click counts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading links...</p> : null}
              {!isLoading && links.length === 0 ? <p className="text-sm text-muted-foreground">No links yet.</p> : null}
              {links.map((link) => (
                <div key={`${link.code}-${link.created_at}`} className="rounded-md border border-border/70 bg-secondary/20 p-3">
                  <a
                    href={link.short_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-mono text-xs text-primary hover:underline"
                  >
                    {link.short_url}
                  </a>
                  <p className="truncate text-sm">{link.long_url}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(link.created_at).toLocaleString()} • Clicks {link.click_count}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </ToolPageLayout>
  );
}
