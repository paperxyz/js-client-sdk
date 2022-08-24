import { defineConfig } from "tsup";

export default defineConfig((options) => {
  const isBuild = !options.watch;
  return {
    entry: ["src/**/*.ts"],
    format: ["cjs", "esm"],
    clean: true,
    splitting: true,
    dts: true,
    minify: isBuild,
  };
});
