import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import typescript from "rollup-plugin-typescript2";

export default defineConfig([
  {
    input: "src/build.ts",
    output: {
      file: "build/index.js",
      format: "cjs",
      inlineDynamicImports: true,
    },
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      typescript(),
    ],
  },
  {
    input: "src/publish.ts",
    output: {
      file: "publish/index.js",
      format: "cjs",
      inlineDynamicImports: true,
    },
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      json(),
      typescript(),
    ],
  },
]);
