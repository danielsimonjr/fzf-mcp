# AGENTS.md — fzf-mcp

How to operate on this repo without breaking it. Read this **and** `MEMORY.md` before
making changes. Pairs with `TODO.md` (open work).

## What this is

MCP server (`@danielsimonjr/fzf-mcp`, CommonJS, Windows-primary) that wraps the `fzf`
fuzzy finder plus `findstr`/`grep` for content search. Tools: `fuzzy_search_files`,
`fuzzy_search_content`, `fuzzy_filter`. `install-fzf.js` (postinstall) downloads the
`fzf` binary into `bin/`.

## The things that bite

1. **The plugin is `plugin/`, not the repo root.** The marketplace installs only
   `plugin/` (a `git-subdir` source). That directory holds `.claude-plugin/plugin.json`,
   `.mcp.json`, `bundle/` and `skills/`, and no `package.json` or lockfile. Claude Code
   therefore runs no `npm ci`/`bun install` and the install has no `node_modules`.
   - `src/*.ts` is the source; `bun run bundle` writes `plugin/bundle/index.cjs`.
     Commit the rebuilt bundle; CI fails when the committed bundle is stale.
   - The bundle requires Node built-ins only. Keep it so: a runtime dependency that
     esbuild cannot inline breaks the installed plugin.
   - Change the version in `package.json`, `plugin/.claude-plugin/plugin.json`, the
     server version in `src/index.ts`, and the marketplace entry together.

2. **The running server is the plugin cache copy**
   (`~/.claude/plugins/cache/local-marketplace/fzf-mcp/<version>/`). Repo commits do not
   change it until the marketplace entry is updated and the plugin is reinstalled.

3. **CRLF churn — normalize to LF before staging.** (`.gitattributes` now enforces LF,
   but existing working-tree flips may linger.) Before staging an edited file:
   ```bash
   tr -d '\r' < index.js > index.js.tmp && mv -f index.js.tmp index.js
   git diff HEAD --stat -- index.js   # should be tiny
   ```
   Confirm a suspected EOL flip with `git diff HEAD --ignore-all-space -- <file>`
   (empty = pure EOL). **Stage narrowly** — never `git add -A`.

4. **Never spawn a bare executable name.** On Windows `spawn("fzf")` /
   `spawn("findstr")` lets `CreateProcess` search the CWD first (binary planting).
   - fzf: `resolveFzfPath()` requires an absolute `FZF_PATH` or probes known absolute
     locations, and throws instead of a bare name. Resolved lazily (at spawn time).
   - archive extract (`install-fzf.js`): uses absolute `%SystemRoot%\System32\tar.exe`.
   - **Still bare (tracked in TODO):** `findstr`/`grep` in `runSearchCommand`.

5. **Content search is injection-safe — keep it that way.** `buildContentSearchCommand`
   returns `{cmd, args}`; `runSearchCommand` uses `spawn(cmd, args, {shell:false})`.
   **Never** switch back to `exec` with an interpolated string (that was CVE-class
   command injection, fixed in 1.1.2). `tests/test_content_search_injection.js` pins it.

## Config

- `plugin/.mcp.json` is committed and sets no `FZF_PATH`: the server uses the bundled
  `plugin/bundle/bin/fzf.exe`. Set an absolute `FZF_PATH` in an `env` block only to
  override it. A root `.mcp.json` stays gitignored (local machine config).

## Testing & git

- Tests: `node --test tests/*.js` (Node built-in runner; no deps).
- `main` has branch protection: build matrix `[ubuntu-latest, windows-latest]`.
- Verify a push by SHA, not exit code:
  `git rev-parse HEAD` == `git ls-remote origin -h refs/heads/main | cut -f1`.

## Sanity checks before commit

```bash
bun run typecheck && bun run test   # builds, bundles, runs node --test
git diff --cached | grep -i "$USERNAME" || echo "no personal path staged"
```
