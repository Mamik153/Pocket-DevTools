export type DownloadMode = "auto" | "audio" | "mute";
export type VideoQuality = "max" | "1080" | "720" | "480" | "360";

export const DOWNLOAD_MODES: DownloadMode[] = ["auto", "audio", "mute"];
export const VIDEO_QUALITIES: VideoQuality[] = ["max", "1080", "720", "480", "360"];

export interface PickerItem {
  type: "photo" | "video" | "gif";
  url: string;
  thumb?: string;
}

export interface CobaltResponse {
  status?: string;
  url?: string;
  filename?: string;
  picker?: PickerItem[];
  error?: { code?: string };
}

export type DownloadResult =
  | { kind: "single"; url: string; filename?: string; forcesDownload: boolean }
  | { kind: "picker"; items: PickerItem[] }
  | { kind: "error"; code: string; message: string };

const ERROR_COPY: Record<string, string> = {
  "error.api.link.invalid": "That doesn't look like a valid link.",
  "error.api.link.unsupported": "That service isn't supported.",
  "error.api.service.unsupported": "That service isn't supported.",
  "error.api.service.disabled": "That service is turned off on this instance.",
  "error.api.fetch.empty": "Nothing downloadable was found at that link.",
  "error.api.fetch.fail": "The service refused the request. Try again shortly.",
  "error.api.content.too_long": "That file is longer than this instance allows.",
  "error.api.content.video.unavailable": "That video isn't available to download.",
  "error.api.auth.key.missing": "This downloader isn't authorised. Check the server configuration.",
  "error.api.rate_exceeded": "Too many requests. Wait a minute and try again.",
  "proxy.method_not_allowed": "That request wasn't allowed.",
  "proxy.not_configured": "The downloader isn't configured yet.",
  "proxy.unreachable": "Couldn't reach the download service.",
  "error.api.unknown": "The download service returned something unexpected.",
};

export const mapErrorCode = (code: string): string =>
  ERROR_COPY[code] ?? `Download failed (${code}).`;

const errorResult = (code: string): DownloadResult => ({
  kind: "error",
  code,
  message: mapErrorCode(code),
});

export const normalizeCobaltResponse = (raw: CobaltResponse): DownloadResult => {
  switch (raw.status) {
    case "tunnel":
    case "redirect": {
      if (!raw.url) return errorResult("error.api.fetch.empty");
      return {
        kind: "single",
        url: raw.url,
        filename: raw.filename,
        // Only tunnel responses carry Content-Disposition: attachment, so only
        // they reliably download. redirect hands header control to the CDN.
        forcesDownload: raw.status === "tunnel",
      };
    }
    case "picker": {
      if (!raw.picker?.length) return errorResult("error.api.fetch.empty");
      return { kind: "picker", items: raw.picker };
    }
    case "error":
      return errorResult(raw.error?.code ?? "error.api.unknown");
    default:
      return errorResult("error.api.unknown");
  }
};
