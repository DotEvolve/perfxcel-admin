/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Upload source maps to Sentry in production builds
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  define: {
    "import.meta.env.VITE_APP_ENV": JSON.stringify(
      process.env.VITE_APP_ENV ||
        (process.env.CF_PAGES_BRANCH === "main" ? "prod" : "dev"),
    ),
  },
  build: {
    sourcemap: true, // Generate source maps for Sentry
  },
  test: {
    environment: "jsdom",
    globals: true,
    testTimeout: 15000,
    setupFiles: "./src/vitest.setup.ts",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Exclude integration tests that require a live server (platform metrics revamp spec)
      "src/__tests__/infra-endpoint.test.ts",
    ],
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-key",
    },
  },
});
