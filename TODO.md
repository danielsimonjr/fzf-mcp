# TODO.md — fzf-mcp

Open work and recently-done, for continuity. Pairs with `AGENTS.md` / `MEMORY.md`.
**Last updated:** 2026-07-22

## Open

- [ ] **Restart Claude Code** to load the re-synced `servers\src` copy into the running
      MCP. `%USERPROFILE%\servers\src\fzf-mcp\index.js` matches `main` as of 2026-07-22;
      a restart activates it. Re-sync it again after any future `index.js` change.
- [ ] **Add a real build step.** With no bundler, `bundle/index.cjs` is hand-synced to
      `index.js` (parity-drift risk; the resolver + injection tests now run against both
      to compensate). A `scripts.build` would regenerate it — verify the banner/shims
      match first.

## Done (2026-07-22)

- [x] Security: `resolveFzfPath()` — absolute-only, no bare `'fzf'`, lazy (`546f3b6`).
- [x] `extractArchive` → absolute System32 bsdtar; suite green 17/17 (`4b96602`).
- [x] Added `tests/test_fzf_path_resolution.js` (both index.js + bundle).
- [x] Repo hygiene: `.gitattributes`, `.mcp.json.example`, untracked `.mcp.json`,
      `AGENTS.md` / `MEMORY.md` / `TODO.md`.
- [x] Harden `findstr` to an absolute System32 path in content search (`fc48e5c`).
- [x] Dependabot #29 — override `@hono/node-server` to `>=2.0.5` (→ 2.0.11) (`cd0129b`).
- [x] Merged PR #18 (setup-node bump), deleted its branch.
- [x] Re-synced `servers\src\fzf-mcp\index.js` to match `main` (2026-07-22).
