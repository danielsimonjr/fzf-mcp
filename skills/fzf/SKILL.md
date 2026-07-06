---
name: fzf
description: "Playbook for the fzf-mcp server: fuzzy finding. Use when the user wants a fuzzy (not exact) match — 'fuzzy-find files like <query>', 'filter this list by <query>', 'search file contents for <query>' — or when an exact/indexed lookup isn't right. Three tools: fuzzy_filter (filter a provided list), fuzzy_search_files (fuzzy file names), fuzzy_search_content (fuzzy content grep)."
---

# fzf

A judgment layer over the `fzf-mcp` server's 3 tools — fuzzy, typo-tolerant matching backed by [fzf](https://github.com/junegunn/fzf), the command-line fuzzy finder. This skill adds no tools of its own: every action below is one of the server's existing MCP tools. Its job is to steer you toward the right tool for the shape of the input (a list you already have vs. a directory tree vs. file contents), and to flag when fzf is the wrong choice because an indexed/exact lookup would be faster.

**Skill root**: this skill ships inside the `fzf-mcp` plugin (repo `danielsimonjr/fzf-mcp`, `skills/fzf/`). Slash trigger: `/fzf`.

## Tool map

| Tool | Purpose |
|---|---|
| `fuzzy_filter` | Rank/filter a candidate list you already have in hand (e.g. an array of package names, tool names, or prior search results) against a fuzzy query. No filesystem access. |
| `fuzzy_search_files` | Fuzzy file-name find, walking the filesystem recursively from a starting directory. |
| `fuzzy_search_content` | Fuzzy grep of file contents across a directory tree, optionally scoped by file pattern. |

Use `fuzzy_filter` when the candidates are already in memory (no need to touch disk). Use `fuzzy_search_files` / `fuzzy_search_content` when you need to discover files or matches by walking a directory — these are the two that pay the filesystem-walk cost.

If a tool isn't loaded, fetch its schema first: `ToolSearch select:mcp__plugin_fzf-mcp_fzf-mcp__fuzzy_search_files`.

## fzf vs Everything

**fzf** = fuzzy/typo-tolerant matching that walks the filesystem live — works anywhere, including paths an index doesn't cover, but slower on large trees. **Everything** (`everything-mcp`, `/everything` skill) = instant, index-backed, best for exact/glob/regex file-name lookups on indexed drives. Prefer Everything for a known exact name or pattern; drop to fzf for approximate/fuzzy queries or for paths Everything doesn't index.

## Gotcha: fzf walks the filesystem

`fuzzy_search_files` and `fuzzy_search_content` recurse the directory tree live — this is slow on huge trees (deep `node_modules`, large monorepos) compared to an indexed lookup. It's also the reason fzf is the right fallback for `~\Dropbox` (which Everything does not index on this machine) — but Dropbox's on-demand ("online-only") file stubs are a known risk for filesystem walks in general (the same class of issue as verified iCloud/OneDrive stub gotchas elsewhere on this machine), so avoid walking Dropbox trees blind and prefer scoping the `directory` argument narrowly rather than searching from a Dropbox root.
