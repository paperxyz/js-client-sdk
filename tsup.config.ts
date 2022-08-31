import { defineConfig } from "tsup";

export default defineConfig((options) => {
  const isBuild = !options.watch;
  return {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    clean: true,
    splitting: true,
    dts: true,
    minify: isBuild,
  };
});
