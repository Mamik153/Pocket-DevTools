import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
var srcPath = path.resolve(process.cwd(), "./src");
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": srcPath,
            // Force the prebuilt browser bundle everywhere. mammoth's "browser" field
            // is a sub-path map covering only lib/unzip.js and lib/docx/files.js, and
            // vitest's node environment does not apply it — so the Node unzip path
            // loads and { arrayBuffer } input fails with "Could not find file in
            // options". Aliasing keeps tests and production on one code path.
            mammoth: "mammoth/mammoth.browser.js"
        }
    }
});
