#!/usr/bin/env node
// Fetch the fzf binary after install.
//
// This shim is plain JavaScript on purpose. postinstall runs BEFORE any build
// step, so it cannot itself be TypeScript that needs compiling: pointing
// postinstall straight at dist/install-fzf.js works for a published tarball
// (dist ships in `files`) and fails for every developer running `bun install`
// in a fresh clone, where dist does not exist yet.
//
// So: run the compiled installer when it is there, and say clearly why it was
// skipped when it is not. Skipping is correct in a source checkout -- the
// developer builds, and the binary is fetched on the next install or on demand.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const compiled = join(ROOT, "dist", "install-fzf.js");

if (!existsSync(compiled)) {
  console.log(
    "fzf-mcp: skipping fzf download — dist/install-fzf.js is not built yet.\n" +
      "         Run `bun run build` first; this is expected in a source checkout.",
  );
  process.exit(0);
}

// The installer does its work as a side effect of loading.
await import(pathToFileURL(compiled).href);
