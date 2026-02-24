import { tools, type ToolPath } from "@/config/tools";

const DEFAULT_SITE_URL = "https://pocketdevtools.app";
const rawSiteUrl = import.meta.env.VITE_SITE_URL?.trim() ?? "";

const normalizeSiteUrl = (value: string) => {
  if (!value) return DEFAULT_SITE_URL;
  if (!/^https?:\/\//i.test(value)) return DEFAULT_SITE_URL;
  return value.replace(/\/+$/, "");
};

const normalizePath = (value: string) => {
  if (!value || value === "/") return "/";
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const mergeKeywords = (...groups: Array<string[] | undefined>) => {
  const deduped = new Set<string>();
  groups
    .flatMap((group) => group ?? [])
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .forEach((entry) => deduped.add(entry));
  return Array.from(deduped);
};

export const SITE_NAME = "Pocket DevTools";
export const SITE_URL = normalizeSiteUrl(rawSiteUrl);
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_ALT = "Pocket DevTools – Slick everyday devtools for developers.";
export const DEFAULT_DESCRIPTION =
  "Pocket DevTools is a slick collection of everyday devtools for formatting, debugging, and shipping faster.";
export const DEFAULT_KEYWORDS = [
  "devtools",
  "pocket devtools",
  "pocket",
  "slick",
  "developer tools",
  "json tools",
  "regex tester",
  "base64",
  "url shortener",
  "prompt improver",
  "markdown tts",
];

interface PageSettings {
  title: string;
  description: string;
  keywords?: string[];
  robots?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  robots: string;
  pathname: string;
}

const homePage: PageSettings = {
  title: `${SITE_NAME} | Slick Everyday Devtools`,
  description:
    "Pocket DevTools bundles slick utilities for JSON, regex, URLs, prompts, markdown, and more in one place.",
  keywords: [...DEFAULT_KEYWORDS, "developer productivity", "online devtools"],
};

const toolPages = Object.fromEntries(
  tools.map((tool) => [
    tool.path,
    {
      title: `${tool.name} | ${SITE_NAME}`,
      description:
        tool.metaDescription ??
        `${tool.description} Built as a slick pocket devtools workflow for daily engineering tasks.`,
      keywords: mergeKeywords(
        DEFAULT_KEYWORDS,
        [tool.name, tool.id.replace(/-/g, " ")],
        tool.metaKeywords,
      ),
    },
  ]),
) as Record<ToolPath, PageSettings>;

const pagesByPath: Record<string, PageSettings> = {
  "/": homePage,
  ...toolPages,
};

export const CRAWLABLE_PATHS = ["/", ...tools.map((tool) => tool.path)];

export const getSeoMeta = (pathname: string): SeoMeta => {
  const normalizedPath = normalizePath(pathname);
  const page = pagesByPath[normalizedPath];
  const isKnownPage = Boolean(page);
  const robots = page?.robots ?? (isKnownPage ? "index, follow, max-image-preview:large" : "noindex, nofollow");
  const canonicalPath = isKnownPage ? normalizedPath : "/";

  return {
    title: page?.title ?? `Not Found | ${SITE_NAME}`,
    description: page?.description ?? DEFAULT_DESCRIPTION,
    keywords: mergeKeywords(DEFAULT_KEYWORDS, page?.keywords),
    canonicalUrl: `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`,
    robots,
    pathname: normalizedPath,
  };
};

export const getWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  keywords: DEFAULT_KEYWORDS.join(", "),
  inLanguage: "en",
});

export const getWebPageSchema = (meta: SeoMeta) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: meta.title,
  description: meta.description,
  url: meta.canonicalUrl,
  keywords: meta.keywords.join(", "),
  inLanguage: "en",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  },
});

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export const getBreadcrumbSchema = (pathname: string, meta: SeoMeta) => {
  const items: BreadcrumbItem[] = [
    { name: SITE_NAME, url: SITE_URL },
  ];
  if (pathname !== "/") {
    const tool = tools.find((t) => t.path === pathname);
    const name = tool?.name ?? meta.title.replace(` | ${SITE_NAME}`, "");
    items.push({ name, url: meta.canonicalUrl });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};
