import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: "esm",
  platform: "node",
  target: "node20",
  sourcemap: true,
  // transpile @usul-ocr/db
  // external: ["@usul-ocr/client"],
  ...options,
}));
