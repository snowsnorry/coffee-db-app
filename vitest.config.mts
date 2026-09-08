import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["./client/vite.config.ts", "./server/vitest.config.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: ["client/src/**/*.{ts,tsx}", "server/src/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "client/src/main.tsx",
        "client/src/test/**",
        "server/src/index.ts",
      ],
      thresholds: {
        perFile: true,
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
