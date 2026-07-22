# TODO.md — fzf-mcp

Open work and recently-done, for continuity. Pairs with `AGENTS.md` / `MEMORY.md`.
**Last updated:** 2026-07-22

## Open

- [ ] **Harden `findstr`/`grep` spawns (binary-planting, same class as the fzf fix).**
      `runSearchCommand` (index.js + bundle) spawns `findstr`/`grep` by **bare name**;
      on Windows `CreateProcess` searches the CWD first even with `shell:false`, so a
      planted `findstr.exe` could run. Injection is already fixed — this is the residual
      *planting* vector. Fix: resolve `findstr` to `%SystemRoot%\System32\findstr.exe`
      (absolute) on Windows; leave `grep` on Unix (CWD not on default PATH). NOTE: the
      existing `tests/test_content_search_injection.js` asserts `cmd === "findstr"` /
      `"grep"` (lines 127, 153) — update those to check the basename so the contract
      still holds. Flagged independently by a code review on 2026-07-22.
- [ ] **Redeploy source → runtime.** The running MCP loads
      `%USERPROFILE%\servers\src\fzf-mcp\index.js`, still the OLD pre-fix version.
      Sync the repo `index.js` (and confirm deps) into `servers\src`, then restart
      Claude Code so the running server matches `main`.
- [ ] **Dependabot alert #29** (moderate) on the default branch — review and patch.
- [ ] **Add a real build step.** With no bundler, `bundle/index.cjs` is hand-synced to
      `index.js` (parity-drift risk; the resolver test now covers both to compensate).
      A `scripts.build` would regenerate it — verify the banner/shims match first.

## Done (2026-07-22)

- [x] Security: `resolveFzfPath()` — absolute-only, no bare `'fzf'`, lazy (`546f3b6`).
- [x] `extractArchive` → absolute System32 bsdtar; suite green 17/17 (`4b96602`).
- [x] Added `tests/test_fzf_path_resolution.js` (both index.js + bundle).
- [x] Repo hygiene: `.gitattributes`, `.mcp.json.example`, untracked `.mcp.json`,
      `AGENTS.md` / `MEMORY.md` / `TODO.md`.
