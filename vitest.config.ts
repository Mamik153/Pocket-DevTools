import { defineConfig } from "vitest/config";

// Scoped to api/ so this suite never picks up the frontend's tests,
// which have their own runner and alias config in frontend/vite.config.ts.
export default defineConfig({
  test: {
    include: ["api/**/*.test.ts"],
    environment: "node",
  },
});
