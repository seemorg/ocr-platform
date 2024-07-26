import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  // transpile @usul-ocr/db
  // external: ['@usul-ocr/db'],
  ...options,
}));