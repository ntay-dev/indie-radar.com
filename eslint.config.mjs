// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "import/first": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-useless-escape": "off",
    },
  },
);
