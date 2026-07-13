# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Windows CI leg.** CI ran on `ubuntu-latest` only — but Windows is the *production*
  platform for this MCP server (it runs on Daniel's Windows box), so CI had never once
  tested the OS the server actually ships on. The `build` job now runs a
  `[ubuntu-latest, windows-latest]` matrix.

## [1.2.0] - 2026-07-06

### Added
- **Companion skill** — `fzf` (`fzf-mcp:fzf`, `/fzf`), a judgment layer over
  the 3 tools that steers toward `fuzzy_filter` for a list already in hand,
  `fuzzy_search_files` / `fuzzy_search_content` for filesystem walks, and
  flags when an indexed lookup (`everything-mcp`) would be faster than fzf's
  live directory walk. Ships at `skills/fzf/SKILL.md`.

## [1.1.4] - 2026-06-26

### Security
- **Harden archive extraction in `install-fzf.js` against shell injection** (defense-in-depth, CWE-78). `extractArchive` built `powershell -Command "..."` and `tar ... "..."` by interpolating the archive/destination paths into a shell string passed to `execSync`. The paths are internal (derived from `__dirname` + a constant filename), so this was not remotely exploitable, but an install directory whose path contained `$(...)`/backticks (Unix) or a PowerShell subexpression could break extraction or execute code, and paths with spaces were fragile. Both branches now use `execFileSync` with no shell: the Windows branch passes paths via environment variables read with `$Env:` + `-LiteralPath` (zero interpolation, `-NoProfile`/`-NonInteractive`), and the Unix branch passes paths as argv elements to `tar`.

### Tests
- Added `tests/test_extract_archive.js` — real archive round-trip on the current platform (zip via PowerShell on Windows, tar.gz on Unix) extracted into a destination directory containing a space, asserting the file and its contents survive. `install-fzf.js` now exports `extractArchive`/`getDownloadInfo` and only auto-runs `install()` under `require.main === module`, so it can be required without side effects.

### Fixed
- Synced the MCP server `version` reported by `index.js` (was `1.0.0`) to the package version.

## [1.1.3] - 2026-05-01

### Documentation
- Add CycloneDX SBOM (sbom.json).

### Tests
- Added `tests/test_content_search_injection.js` (10 tests, Node built-in test runner — no new dependencies) — regression coverage for the v1.1.2 command-injection fix in `fuzzy_search_content`. Asserts that for a 14-payload battery (Windows quote-breakers, POSIX chaining, subshell expansion, pipe-to-attacker, newline injection, glob, null-byte) the user's query/directory/filePattern flow into `child_process.spawn` as their own argv elements with `shell: false` — never concatenated into a shell string. Also covers 7 legitimate-input cases (filenames with spaces, unicode, dash-prefixed queries that look like flags). `npm test` now runs the suite.

### Refactor
- Extracted argv construction in `fuzzy_search_content` into the pure helper `buildContentSearchCommand(opts, platform)`. Behavior unchanged; the helper is exported alongside `runSearchCommand` so regression tests can pin the safe call shape without booting the MCP transport. `index.js` only auto-starts the stdio server when invoked as `require.main === module`.

## [1.1.2] - 2026-04-30

### Security
- **Fix command-injection vulnerability in `fuzzy_search_content`** (CWE-78).
  Previous versions built the underlying `findstr`/`grep` invocation by
  string-interpolating the caller-supplied `query`, `directory`, and
  `filePattern` into a shell command that was then passed to `exec`. A
  crafted query such as `"; calc.exe & echo "` (Windows) or
  `"; rm -rf ~ #` (Unix) escaped the surrounding quotes and ran arbitrary
  commands with the privileges of the MCP server process.
  The handler now uses `child_process.spawn` with the default `shell: false`
  and passes each user-supplied value as a separate argv item, so shell
  metacharacters are interpreted as literal pattern text. The return shape
  of the tool is unchanged.

## [1.1.1]

- Fix `fuzzy_search_files` with Node.js fs module.

## [1.1.0]

- Self-contained: automatic fzf binary download on `npm install`.
