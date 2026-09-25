import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8110",
        changeOrigin: true,
        // The SPA also owns the literal "/api" route (the developer docs
        // page). Only forward requests that target a real backend
        // namespace so a hard refresh on /api still serves the app.
        bypass: (req) => {
          const url = req.url ?? "";
          if (/^\/api\/(v1|admin)\//.test(url)) {
            return undefined;
          }
          return req.url;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
