const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MODES = new Set(["auto", "audio", "mute"]);
const QUALITIES = new Set(["max", "1080", "720", "480", "360"]);
const TIMEOUT_MS = 30_000;

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const fail = (code: string, status: number): Response =>
  json({ status: "error", error: { code } }, status);

export const isAllowedUrl = (value: string): boolean => {
  try {
    return ALLOWED_SCHEMES.has(new URL(value).protocol);
  } catch {
    return false;
  }
};

const PICKER_TYPES = new Set(["photo", "video", "gif"]);

/**
 * A picker item is only relayed if it matches the frontend's type contract
 * and its url passes the same allowlist as inbound urls. A bad thumb drops
 * only the thumb: it is decorative, the download link is not.
 */
const sanitizePickerItem = (item: unknown): Record<string, unknown> | null => {
  if (typeof item !== "object" || item === null) return null;
  const raw = item as Record<string, unknown>;
  if (typeof raw.type !== "string" || !PICKER_TYPES.has(raw.type)) return null;
  if (typeof raw.url !== "string" || !isAllowedUrl(raw.url)) return null;
  const out: Record<string, unknown> = { type: raw.type, url: raw.url };
  if (typeof raw.thumb === "string" && isAllowedUrl(raw.thumb)) out.thumb = raw.thumb;
  return out;
};

/**
 * Field allowlist. Anything cobalt adds that we do not know about is dropped,
 * so a future upstream field can never relay something sensitive by accident.
 * Urls are also re-validated on the way out: cobalt is trusted for shape, not
 * for scheme, since its response ends up in window.open() and href/src.
 */
const sanitize = (data: unknown): Record<string, unknown> => {
  const raw = (data ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {
    status: typeof raw.status === "string" ? raw.status : "error",
  };
  if (typeof raw.url === "string" && isAllowedUrl(raw.url)) out.url = raw.url;
  if (typeof raw.filename === "string") out.filename = raw.filename;
  if (Array.isArray(raw.picker)) {
    const picker = raw.picker
      .map(sanitizePickerItem)
      .filter((item): item is Record<string, unknown> => item !== null);
    if (picker.length > 0) out.picker = picker;
  }
  const code = (raw.error as Record<string, unknown> | undefined)?.code;
  if (typeof code === "string") out.error = { code };
  return out;
};

/**
 * Built server-side from an allowlist rather than relaying the client's body.
 * Otherwise a caller could set localProcessing: "forced" (breaking the
 * no-wasm assumption) or alwaysProxy: true (burning instance bandwidth).
 */
const buildPayload = (body: Record<string, unknown>, url: string): Record<string, string> => {
  const downloadMode = MODES.has(body.downloadMode as string)
    ? (body.downloadMode as string)
    : "auto";
  const payload: Record<string, string> = { url, downloadMode };
  if (downloadMode !== "audio") {
    payload.videoQuality = QUALITIES.has(body.videoQuality as string)
      ? (body.videoQuality as string)
      : "1080";
  }
  return payload;
};

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return fail("proxy.method_not_allowed", 405);
    }

    const apiUrl = process.env.COBALT_API_URL?.trim();
    if (!apiUrl) {
      return fail("proxy.not_configured", 503);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return fail("error.api.link.invalid", 400);
    }

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!isAllowedUrl(url)) {
      return fail("error.api.link.invalid", 400);
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json",
    };
    const apiKey = process.env.COBALT_API_KEY?.trim();
    if (apiKey) {
      headers.authorization = `Api-Key ${apiKey}`;
    }

    let upstream: Response;
    try {
      upstream = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(buildPayload(body, url)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // Swallow the cause deliberately: it embeds COBALT_API_URL.
      return fail("proxy.unreachable", 502);
    }

    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      return fail("proxy.unreachable", 502);
    }

    return json(sanitize(data), upstream.ok ? 200 : upstream.status);
  },
};
