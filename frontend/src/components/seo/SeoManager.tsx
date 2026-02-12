import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { getSeoMeta, getWebPageSchema, getWebsiteSchema, SITE_NAME } from "@/config/seo";

const WEBSITE_SCHEMA_ID = "website-schema";
const WEBPAGE_SCHEMA_ID = "webpage-schema";

const upsertMetaTag = (attribute: "name" | "property", key: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const upsertJsonLd = (id: string, payload: object) => {
  let tag = document.head.querySelector<HTMLScriptElement>(`script#${id}`);
  if (!tag) {
    tag = document.createElement("script");
    tag.setAttribute("id", id);
    tag.setAttribute("type", "application/ld+json");
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(payload);
};

export function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const meta = getSeoMeta(location.pathname);

    document.title = meta.title;
    upsertMetaTag("name", "description", meta.description);
    upsertMetaTag("name", "keywords", meta.keywords.join(", "));
    upsertMetaTag("name", "robots", meta.robots);

    upsertMetaTag("property", "og:type", "website");
    upsertMetaTag("property", "og:site_name", SITE_NAME);
    upsertMetaTag("property", "og:title", meta.title);
    upsertMetaTag("property", "og:description", meta.description);
    upsertMetaTag("property", "og:url", meta.canonicalUrl);

    upsertMetaTag("name", "twitter:card", "summary_large_image");
    upsertMetaTag("name", "twitter:title", meta.title);
    upsertMetaTag("name", "twitter:description", meta.description);

    upsertCanonical(meta.canonicalUrl);
    upsertJsonLd(WEBSITE_SCHEMA_ID, getWebsiteSchema());
    upsertJsonLd(WEBPAGE_SCHEMA_ID, getWebPageSchema(meta));
  }, [location.pathname]);

  return null;
}
