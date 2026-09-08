import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.CATALOG_PREVIEW_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
  },
});
