/**
 * Generates sitemap.xml with lastmod. Run before build to keep sitemap in sync.
 *
 * Entries are derived from the tool registry, so there is nothing to hand-sync.
 * Node 24 strips TypeScript types natively, which is what makes the import work.
 */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tools } from "../src/config/tools.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://pocketdevtools.app";
const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  ...tools.map((tool) => ({
    path: tool.path,
    changefreq: "weekly",
    priority: tool.sitemapPriority ?? "0.8",
  })),
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
