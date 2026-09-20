import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      ".astro/",
      "node_modules/",
      "spikes/",
      "governance/",
      "corpus-pins/",
      "docs/",
      "**/*.astro",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
