import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "client/dist/**",
      "server/dist/**",
      "playwright-report/**",
      "test-results/**",
      ".dependency-cruiser.cjs",
      ".agents/**",
    ],
  },
  {
    files: ["*.config.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.eslint.json",
          "./client/tsconfig.json",
          "./client/tsconfig.node.json",
          "./server/tsconfig.src.json",
          "./server/tsconfig.test.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 5],
      "max-lines": [
        "warn",
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 90,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      complexity: "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "no-console": "off",
    },
  },
);
