/**
 * Copies pdf.js's own runtime assets (CMaps, standard fonts, the OpenJPEG/JBIG2
 * wasm decoders) from node_modules into public/pdfjs/, so renderPdfToImages can
 * point pdf.js at same-origin URLs instead of leaving cMapUrl/standardFontDataUrl/
 * wasmUrl unset. Unset, pdf.js's binary data factory throws instead of fetching,
 * and CJK text plus JPEG2000/JBIG2 images render as silently blank pages.
 *
 * Run before build (see package.json). Never committed — see .gitignore — so the
 * copy always matches whatever pdfjs-dist version is installed.
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfjsRoot = join(__dirname, "..", "node_modules", "pdfjs-dist");
const outRoot = join(__dirname, "..", "public", "pdfjs");

/** Copy a file or directory, failing loudly if the source is missing. A silent
 * no-op here recreates the exact bug this script exists to fix. */
const copy = (source, dest) => {
  if (!existsSync(source)) {
    throw new Error(
      `copy-pdfjs-assets: expected source "${source}" does not exist. ` +
        "The installed pdfjs-dist version may have changed its layout — update this script.",
    );
  }
  cpSync(source, dest, { recursive: true });
};

mkdirSync(outRoot, { recursive: true });

copy(join(pdfjsRoot, "cmaps"), join(outRoot, "cmaps"));
copy(join(pdfjsRoot, "standard_fonts"), join(outRoot, "standard_fonts"));

// Only the two wasm decoders pdf.js needs for image rendering. Deliberately NOT
// the whole wasm/ directory: quickjs-eval.wasm is XFA scripting and unrelated.
mkdirSync(join(outRoot, "wasm"), { recursive: true });
copy(join(pdfjsRoot, "wasm", "openjpeg.wasm"), join(outRoot, "wasm", "openjpeg.wasm"));
copy(join(pdfjsRoot, "wasm", "jbig2.wasm"), join(outRoot, "wasm", "jbig2.wasm"));

console.log("Copied pdf.js assets (cmaps, standard_fonts, wasm) into public/pdfjs/");
