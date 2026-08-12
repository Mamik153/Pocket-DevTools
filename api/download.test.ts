import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { isAllowedUrl } from "./download";

const API_URL = "https://cobalt.example.com/";
const API_KEY = "11111111-2222-3333-4444-555555555555";

const post = (body: unknown) =>
  new Request("https://pocketdevtools.app/api/download", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  process.env.COBALT_API_URL = API_URL;
  process.env.COBALT_API_KEY = API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.COBALT_API_URL;
  delete process.env.COBALT_API_KEY;
});

describe("isAllowedUrl", () => {
  it("accepts http and https", () => {
    expect(isAllowedUrl("http://example.com/a")).toBe(true);
    expect(isAllowedUrl("https://example.com/a")).toBe(true);
  });

  it("rejects other schemes so the proxy is not a general relay", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedUrl("ftp://example.com/a")).toBe(false);
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isAllowedUrl("not a url")).toBe(false);
    expect(isAllowedUrl("")).toBe(false);
  });
});

describe("POST /api/download", () => {
  it("refuses non-POST methods", async () => {
    const res = await handler.fetch(
      new Request("https://pocketdevtools.app/api/download", { method: "GET" }),
    );
    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "proxy.method_not_allowed" },
    });
  });

  it("returns 503 when COBALT_API_URL is unset instead of crashing", async () => {
    delete process.env.COBALT_API_URL;
    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "proxy.not_configured" },
    });
  });

  it("rejects a disallowed scheme", async () => {
    const res = await handler.fetch(post({ url: "file:///etc/passwd" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: "error.api.link.invalid" },
    });
  });

  it("rejects a malformed body", async () => {
    const res = await handler.fetch(
      new Request("https://pocketdevtools.app/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("sends the api key upstream but never returns it", async () => {
    const spy = vi.fn().mockResolvedValue(
      jsonResponse({ status: "tunnel", url: `${API_URL}tunnel?id=1`, filename: "clip.mp4" }),
    );
    vi.stubGlobal("fetch", spy);

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    const sentHeaders = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(sentHeaders.authorization).toBe(`Api-Key ${API_KEY}`);

    const text = await res.text();
    expect(text).not.toContain(API_KEY);
  });

  it("relays only allowlisted fields, dropping anything unexpected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "tunnel",
          url: `${API_URL}tunnel?id=1`,
          filename: "clip.mp4",
          debug: { key: API_KEY, instance: API_URL },
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    const body = await res.json();
    expect(body).toEqual({
      status: "tunnel",
      url: `${API_URL}tunnel?id=1`,
      filename: "clip.mp4",
    });
    expect(body).not.toHaveProperty("debug");
  });

  it("does not forward client-supplied cobalt options", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(
      post({
        url: "https://youtube.com/watch?v=abc",
        localProcessing: "forced",
        alwaysProxy: true,
        audioBitrate: "320",
      }),
    );

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent).not.toHaveProperty("localProcessing");
    expect(sent).not.toHaveProperty("alwaysProxy");
    expect(sent).not.toHaveProperty("audioBitrate");
    expect(sent).toEqual({
      url: "https://youtube.com/watch?v=abc",
      downloadMode: "auto",
      videoQuality: "1080",
    });
  });

  it("falls back to defaults for invalid mode and quality", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(
      post({ url: "https://youtube.com/watch?v=abc", downloadMode: "bogus", videoQuality: "9000" }),
    );

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent.downloadMode).toBe("auto");
    expect(sent.videoQuality).toBe("1080");
  });

  it("omits videoQuality for audio-only requests", async () => {
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    await handler.fetch(post({ url: "https://youtube.com/watch?v=abc", downloadMode: "audio" }));

    const sent = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(sent).not.toHaveProperty("videoQuality");
  });

  it("relays a cobalt error with its code intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ status: "error", error: { code: "error.api.service.unsupported" } }, 400),
      ),
    );

    const res = await handler.fetch(post({ url: "https://example.com/x" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      status: "error",
      error: { code: "error.api.service.unsupported" },
    });
  });

  it("returns 502 without leaking the instance url when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(`connect ECONNREFUSED ${API_URL}`)));

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).toContain("proxy.unreachable");
    expect(text).not.toContain("cobalt.example.com");
  });

  it("returns 502 when upstream sends unparseable json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>gateway error</html>", { status: 200 })),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(502);
  });

  it("relays a well-formed picker response intact", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "picker",
          picker: [
            { type: "photo", url: "https://cdn.example.com/a.jpg", thumb: "https://cdn.example.com/a-thumb.jpg" },
            { type: "video", url: "https://cdn.example.com/b.mp4" },
          ],
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    await expect(res.json()).resolves.toEqual({
      status: "picker",
      picker: [
        { type: "photo", url: "https://cdn.example.com/a.jpg", thumb: "https://cdn.example.com/a-thumb.jpg" },
        { type: "video", url: "https://cdn.example.com/b.mp4" },
      ],
    });
  });

  it("drops a picker item whose url uses a disallowed scheme, keeping well-formed siblings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "picker",
          picker: [
            { type: "photo", url: "javascript:alert(1)" },
            { type: "video", url: "https://cdn.example.com/b.mp4" },
          ],
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    await expect(res.json()).resolves.toEqual({
      status: "picker",
      picker: [{ type: "video", url: "https://cdn.example.com/b.mp4" }],
    });
  });

  it("drops a picker item with an invalid type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "picker",
          picker: [
            { type: "malware", url: "https://cdn.example.com/a.exe" },
            { type: "gif", url: "https://cdn.example.com/b.gif" },
          ],
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    await expect(res.json()).resolves.toEqual({
      status: "picker",
      picker: [{ type: "gif", url: "https://cdn.example.com/b.gif" }],
    });
  });

  it("keeps a picker item but drops its thumb when the thumb fails validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          status: "picker",
          picker: [
            { type: "photo", url: "https://cdn.example.com/a.jpg", thumb: "javascript:alert(1)" },
          ],
        }),
      ),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    await expect(res.json()).resolves.toEqual({
      status: "picker",
      picker: [{ type: "photo", url: "https://cdn.example.com/a.jpg" }],
    });
  });

  it("does not relay a tunnel url that fails validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: "javascript:alert(1)" })),
    );

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    await expect(res.json()).resolves.toEqual({ status: "tunnel" });
  });

  it("works when no api key is configured", async () => {
    delete process.env.COBALT_API_KEY;
    const spy = vi.fn().mockResolvedValue(jsonResponse({ status: "tunnel", url: `${API_URL}t` }));
    vi.stubGlobal("fetch", spy);

    const res = await handler.fetch(post({ url: "https://youtube.com/watch?v=abc" }));
    expect(res.status).toBe(200);
    const sentHeaders = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(sentHeaders).not.toHaveProperty("authorization");
  });
});
