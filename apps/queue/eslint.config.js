import baseConfig from "@usul-ocr/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**", ".output/**"],
  },
  ...baseConfig,
];