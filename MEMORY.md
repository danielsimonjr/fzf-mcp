# MEMORY.md — fzf-mcp (current state)

Point-in-time state. Pairs with `AGENTS.md` (how to operate) and `TODO.md` (open work).
**Last updated:** 2026-07-22

## What it is

`@danielsimonjr/fzf-mcp` — MCP server wrapping `fzf` (+ `findstr`/`grep` for content
search). Tools: `fuzzy_search_files`, `fuzzy_search_content`, `fuzzy_filter`. Entry
points: `index.js` (source) and `bundle/index.cjs` (built, launched by `.mcp.json`).
No build step — the two are kept in sync by hand. Latest tag: 1.2.0.

## Recent changes (2026-07-22)

- **`546f3b6` fix(security):** `getFzfPath()` → `resolveFzfPath()`. Was falling back to
  a bare `return 'fzf'` and returning `FZF_PATH` verbatim; on Windows `spawn("fzf")`
  searches the CWD first (binary planting / search-path hijack). Now: reject non-absolute
  `FZF_PATH`, probe known absolute locations, throw instead of a bare name; lazy
  resolution so import never throws. Mirrored in `bundle/index.cjs`. New
  `tests/test_fzf_path_resolution.js` (runs against both modules).
- **`4b96602` fix:** `extractArchive` (`install-fzf.js`) now uses absolute
  `%SystemRoot%\System32\tar.exe` (bsdtar) instead of PowerShell `Expand-Archive`, whose
  `Microsoft.PowerShell.Archive` module fails to load on some hosts
  (`CouldNotAutoloadMatchingModule`) — that was the lone red test. Full suite green 17/17.
- **Repo hygiene:** added `.gitattributes` (LF), `.mcp.json.example`, untracked
  `.mcp.json`, added `AGENTS.md`/`MEMORY.md`/`TODO.md`.

## Security posture

- **Content-search injection: FIXED** (1.1.2, `d8c81e5`). `buildContentSearchCommand` +
  `runSearchCommand` use `spawn(cmd, args, {shell:false})` with argv arrays. Pinned by
  `tests/test_content_search_injection.js`. Do not revert to `exec`.
- **fzf binary path: FIXED** (see above) — absolute-only.
- **`findstr` path: FIXED** (`fc48e5c`) — content search resolves `findstr` to
  `%SystemRoot%\System32\findstr.exe`; Unix `grep` left bare (`execvp` ignores the CWD).
- **Dependabot #29: FIXED** (`cd0129b`) — npm `override` forces `@hono/node-server`
  to `>=2.0.5` (→ 2.0.11); it's transitive via the SDK and unused (stdio-only), but the
  alert is cleared.

## Runtime gotcha (maintainer's machine)

The MCP that actually runs is a **separate copy** at
`%USERPROFILE%\servers\src\fzf-mcp\index.js` (per `.claude.json`). **Re-synced
2026-07-22** to match `main` (all fixes) — but the running process still holds the OLD
module in memory, so **restart Claude Code** to activate it. Re-sync again after any
future `index.js` change. See `TODO.md`.

## Environment facts

- No build script — `bundle/index.cjs` hand-synced to `index.js`.
- `main` branch protection: build matrix `[ubuntu-latest, windows-latest]`.
- Dependabot flagged 1 moderate vuln on the default branch (alert #29) — see `TODO.md`.
