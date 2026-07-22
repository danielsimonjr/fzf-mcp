# AGENTS.md — fzf-mcp

How to operate on this repo without breaking it. Read this **and** `MEMORY.md` before
making changes. Pairs with `TODO.md` (open work).

## What this is

MCP server (`@danielsimonjr/fzf-mcp`, CommonJS, Windows-primary) that wraps the `fzf`
fuzzy finder plus `findstr`/`grep` for content search. Tools: `fuzzy_search_files`,
`fuzzy_search_content`, `fuzzy_filter`. `install-fzf.js` (postinstall) downloads the
`fzf` binary into `bin/`.

## The things that bite

1. **Two copies of the code — edit both.**
   - `index.js` — source (`package.json main`/`bin`).
   - `bundle/index.cjs` — the **built** bundle that `.mcp.json` launches
     (`${CLAUDE_PLUGIN_ROOT}/bundle/index.cjs`).
   - **No build script** (`package.json scripts` has only `postinstall`/`test`), so the
     bundle is **not regenerated** — hand-port any `index.js` change into
     `bundle/index.cjs` and keep them in sync. The bundle uses `__require`, so
     `require("fs")`/`require("path")` work inside it. `tests/test_fzf_path_resolution.js`
     runs against **both** modules to catch parity drift.

2. **The running server is NOT this repo (maintainer's machine).**
   Claude Code loads a separate copy at
   `%USERPROFILE%\servers\src\fzf-mcp\index.js` via `.claude.json`. Repo commits do
   not change the running server until redeployed to `servers\src`. See `TODO.md`.

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

- Set `FZF_PATH` (absolute path to the fzf executable) in the MCP config `env` block —
  `.mcp.json` (local) or `.claude.json` (maintainer's runtime).
- `.mcp.json` is **gitignored** (local machine config). `.mcp.json.example` is the
  committed template.

## Testing & git

- Tests: `node --test tests/*.js` (Node built-in runner; no deps).
- `main` has branch protection: build matrix `[ubuntu-latest, windows-latest]`.
- Verify a push by SHA, not exit code:
  `git rev-parse HEAD` == `git ls-remote origin -h refs/heads/main | cut -f1`.

## Sanity checks before commit

```bash
node --check index.js && node --check bundle/index.cjs
node --test tests/*.js            # expect all green
git diff --cached | grep -i "$USERNAME" || echo "no personal path staged"
```
