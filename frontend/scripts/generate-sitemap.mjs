/**
 * Generates sitemap.xml with lastmod. Run before build to keep sitemap in sync.
 * Paths and priorities should match CRAWLABLE_PATHS and tool order in src/config/tools.ts.
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://pocketdevtools.app";
const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/audioscribe", changefreq: "weekly", priority: "0.9" },
  { path: "/json-compare", changefreq: "weekly", priority: "0.85" },
  { path: "/json-beautifier", changefreq: "weekly", priority: "0.7" },
  { path: "/json-to-toon", changefreq: "weekly", priority: "0.7" },
  { path: "/prompt-improver", changefreq: "weekly", priority: "0.8" },
  { path: "/url-encoder-decoder", changefreq: "weekly", priority: "0.8" },
  { path: "/url-shortener", changefreq: "weekly", priority: "0.8" },
  { path: "/jwt-decode", changefreq: "weekly", priority: "0.8" },
  { path: "/uuid-generator", changefreq: "weekly", priority: "0.8" },
  { path: "/password-generator", changefreq: "weekly", priority: "0.8" },
  { path: "/base64", changefreq: "weekly", priority: "0.8" },
  { path: "/regex-tester", changefreq: "weekly", priority: "0.8" },
  { path: "/timestamp-converter", changefreq: "weekly", priority: "0.8" },
];

const urlBlocks = entries
  .map(
    (e) => `  <url>
    <loc>${SITE_URL}${e.path === "/" ? "/" : e.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>
`;

const outPath = join(__dirname, "..", "public", "sitemap.xml");
writeFileSync(outPath, sitemap, "utf8");
console.log("Wrote sitemap.xml with lastmod:", lastmod);
