# fzf skill

Load id: `fzf-mcp:fzf`. Slash trigger: `/fzf`.

Playbook for the `fzf-mcp` server — fuzzy, typo-tolerant search backed by
the fzf command-line fuzzy finder.

## Tools covered

- `fuzzy_filter` — rank/filter a list you already have against a fuzzy
  query; no filesystem access.
- `fuzzy_search_files` — fuzzy file-name search, walking a directory tree.
- `fuzzy_search_content` — fuzzy grep of file contents across a tree.

## fzf vs Everything

fzf is fuzzy and walks the filesystem live (slower, works everywhere).
Everything (`everything-mcp`, `/everything`) is instant and index-backed
(faster, exact/glob/regex only, and has index gaps — e.g. it does not
cover `~\Dropbox` on this machine). Prefer Everything for exact/known
names; use fzf for fuzzy queries or paths Everything doesn't index.

## See also

`SKILL.md` in this directory for the full playbook, including the
filesystem-walk gotcha (slow on huge trees; avoid on-demand-stub paths).
