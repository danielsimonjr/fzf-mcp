# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
