import baseConfig, { restrictEnvAccess } from "@usul-ocr/eslint-config/base";
import nextjsConfig from "@usul-ocr/eslint-config/nextjs";
import reactConfig from "@usul-ocr/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
