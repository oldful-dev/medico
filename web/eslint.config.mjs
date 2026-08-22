import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next@15.1.8 (pinned here for Cloudflare Pages compatibility,
// see git history) predates the package's flat-config-native exports —
// its core-web-vitals/typescript entries are still eslintrc-format
// ({ extends: [...] }), so they need FlatCompat's bridge, not a direct
// spread import.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
