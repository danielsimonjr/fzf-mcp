# Changelog

All notable changes to this project will be documented in this file.

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
