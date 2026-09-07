#!/usr/bin/env node
// Build bundle/index.cjs: the single self-contained file the Claude Code plugin runs.
//
// This script did not exist before. bundle/index.cjs was a COMMITTED artifact with no
// reproducible build, so nothing could tell whether it still matched src/ -- the exact
// gap recorded in the workspace tracker. Now the bundle has a build, and
// `bun run bundle` followed by a clean `git diff` is a parity check anyone can run.
//
// Output is CommonJS, matching the .cjs extension the plugin manifest launches. The
// entry is the TypeScript source: esbuild compiles it, so bundling does not depend on
// `bun run build` having run first.
import { build } from "esbuild";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

await build({
  entryPoints: ["src/index.ts"],
  outfile: "bundle/index.cjs",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  // The fzf binary is shipped beside the bundle, not inlined; keep the resolution
  // logic in src/index.ts working by leaving these as runtime requires.
  external: [],
  // NO shebang banner: esbuild already preserves the one on src/index.ts. Adding it
  // here produced TWO shebang lines, and a '#!' on line 2 is a syntax error -- the
  // bundle would not load at all. Caught by tests/test_fzf_path_resolution.js, which
  // requires bundle/index.cjs as well as dist/, which is exactly why it does that.
  define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  legalComments: "none",
});

console.log(`bundled src/index.ts -> bundle/index.cjs (v${pkg.version})`);
