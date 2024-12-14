import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts", "src/single.ts"],
  format: "esm",
  clean: true,
  dts: true,
  bundle: false,
  ...options,
}));
