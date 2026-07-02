import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const tsconfigRootDir = import.meta.dirname;

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Client (React)
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ["./client/tsconfig.app.json", "./client/tsconfig.node.json"],
        tsconfigRootDir,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Server
  {
    files: ["server/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        project: "./server/tsconfig.json",
        tsconfigRootDir,
      },
    },
  },

  // Shared
  {
    files: ["shared/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        project: "./shared/tsconfig.json",
        tsconfigRootDir,
      },
    },
  },

  // General TS rule tweaks (applies everywhere)
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
