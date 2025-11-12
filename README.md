# fzf MCP Server

[![NPM](https://img.shields.io/npm/v/@danielsimonjr/fzf-mcp.svg)](https://www.npmjs.com/package/@danielsimonjr/fzf-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io)

Model Context Protocol (MCP) server for [fzf](https://github.com/junegunn/fzf), the command-line fuzzy finder. Enables fuzzy file searching, list filtering, and content searching through MCP.

## Features

- **Fuzzy File Search**: Search for files recursively using fzf's fuzzy matching
- **List Filtering**: Filter any list of items with fuzzy matching
- **Content Search**: Search within file contents using fuzzy matching
- **Fast & Efficient**: Leverages fzf's blazing-fast fuzzy finder
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Prerequisites

**fzf must be installed on your system:**

### Windows (via winget)
```bash
winget install fzf
```

### Windows (via Scoop)
```bash
scoop install fzf
```

### macOS (via Homebrew)
```bash
brew install fzf
```

### Linux (via package manager)
```bash
# Ubuntu/Debian
sudo apt install fzf

# Arch Linux
sudo pacman -S fzf

# Fedora
sudo dnf install fzf
```

## Installation

### Using NPX (Recommended)
No installation required:
```bash
npx @danielsimonjr/fzf-mcp
```

### Global Installation
```bash
npm install -g @danielsimonjr/fzf-mcp
```

### From Source
```bash
git clone https://github.com/danielsimonjr/fzf-mcp.git
cd fzf-mcp
npm install
chmod +x index.js
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

#### Using NPX
```json
{
  "mcpServers": {
    "fzf": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/fzf-mcp"]
    }
  }
}
```

#### Using Global Install
```json
{
  "mcpServers": {
    "fzf": {
      "command": "fzf-mcp"
    }
  }
}
```

#### Custom fzf Path
If fzf is not in your PATH, set the `FZF_PATH` environment variable:

```json
{
  "mcpServers": {
    "fzf": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/fzf-mcp"],
      "env": {
        "FZF_PATH": "C:\\path\\to\\fzf.exe"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "fzf": {
      "command": "npx",
      "args": ["-y", "@danielsimonjr/fzf-mcp"]
    }
  }
}
```

## Available Tools

### 1. `fuzzy_search_files`

Search for files using fzf's fuzzy matching.

**Parameters:**
- `query` (required): Fuzzy search query (e.g., "readme", "index.js")
- `directory` (optional): Starting directory (default: current directory)
- `maxResults` (optional): Maximum number of results (default: 50)
- `caseSensitive` (optional): Enable case-sensitive matching (default: false)
- `exact` (optional): Enable exact matching instead of fuzzy (default: false)

**Example:**
```json
{
  "query": "readme",
  "directory": "C:\\projects",
  "maxResults": 10
}
```

### 2. `fuzzy_filter`

Filter a list of items using fzf's fuzzy matching algorithm.

**Parameters:**
- `items` (required): Array of strings to filter
- `query` (required): Fuzzy search query
- `maxResults` (optional): Maximum number of results (default: 50)
- `caseSensitive` (optional): Enable case-sensitive matching (default: false)
- `exact` (optional): Enable exact matching (default: false)

**Example:**
```json
{
  "items": ["apple", "banana", "orange", "grape", "pineapple"],
  "query": "app",
  "maxResults": 5
}
```

### 3. `fuzzy_search_content`

Search within file contents using fuzzy matching.

**Parameters:**
- `query` (required): Content search query
- `directory` (optional): Directory to search (default: current directory)
- `filePattern` (optional): File pattern to search (default: "*")
- `maxResults` (optional): Maximum number of results (default: 50)
- `caseSensitive` (optional): Enable case-sensitive matching (default: false)

**Example:**
```json
{
  "query": "function",
  "directory": "C:\\projects\\myapp",
  "filePattern": "*.js",
  "maxResults": 20
}
```

## Usage Examples

### Example 1: Find Configuration Files

Tell Claude:
```
Use fzf to search for all configuration files (config, .env, settings) in my project directory.
```

Claude will use the `fuzzy_search_files` tool to find matching files.

### Example 2: Filter List of Options

Tell Claude:
```
I have this list of packages: [express, react, vue, angular, svelte, next, nuxt, remix]
Use fzf to filter for packages containing "re"
```

Claude will use the `fuzzy_filter` tool to return: `express`, `react`, `svelte`

### Example 3: Search Code

Tell Claude:
```
Search for all occurrences of "async function" in my TypeScript files.
```

Claude will use the `fuzzy_search_content` tool to find matches.

## How It Works

fzf-mcp uses fzf's `--filter` mode to provide non-interactive fuzzy matching:

1. **File Search**: Generates a file list from the directory and pipes it to fzf
2. **List Filter**: Pipes the provided list to fzf for filtering
3. **Content Search**: Uses grep/findstr to find content, then filters with fzf

All matching is done server-side, returning only the filtered results to Claude.

## Fuzzy Matching Algorithm

fzf uses a sophisticated fuzzy matching algorithm that:
- Matches characters in order but not necessarily consecutive
- Scores matches based on character positions
- Prioritizes matches at word boundaries
- Supports exact matching with the `exact` option

**Examples:**
- Query `"abc"` matches: `"abc"`, `"a_b_c"`, `"aXbXc"`, `"AnyBigCat"`
- Query `"^music"` matches files starting with "music"
- Query `"mp3$"` matches files ending with "mp3"

## Troubleshooting

### fzf Not Found

**Error:** `Failed to execute fzf: spawn fzf ENOENT`

**Solution:**
1. Ensure fzf is installed: `fzf --version`
2. Add fzf to your PATH, or set `FZF_PATH` environment variable in MCP config

### No Results Found

**Causes:**
- Query doesn't match any items
- Directory doesn't exist or is empty
- Insufficient permissions to read directory

**Solutions:**
- Try a less specific query
- Verify directory path
- Check file permissions

### Windows-Specific Issues

**Issue:** File listing commands fail

**Solution:**
The server tries multiple commands (`dir`, `find`, `ls`) and uses the first that succeeds. Ensure at least one is available in your PATH.

## Development

```bash
# Clone repository
git clone https://github.com/danielsimonjr/fzf-mcp.git
cd fzf-mcp

# Install dependencies
npm install

# Make executable
chmod +x index.js

# Test locally
node index.js
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [fzf](https://github.com/junegunn/fzf) by Junegunn Choi - The amazing fuzzy finder
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic

## Links

- **NPM Package:** https://www.npmjs.com/package/@danielsimonjr/fzf-mcp
- **GitHub Repository:** https://github.com/danielsimonjr/fzf-mcp
- **fzf Project:** https://github.com/junegunn/fzf
- **MCP Documentation:** https://modelcontextprotocol.io

---

**Made with ❤️ for the MCP community**
