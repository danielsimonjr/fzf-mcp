#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require("child_process");
const { promisify } = require("util");
const { exec } = require("child_process");
const execAsync = promisify(exec);

// Path to fzf.exe - can be overridden via environment variable
const FZF_PATH = process.env.FZF_PATH || "fzf";

/**
 * Execute fzf with the given arguments and input
 */
function executeFzf(args, input = "") {
  return new Promise((resolve, reject) => {
    const process = spawn(FZF_PATH, args);
    let stdout = "";
    let stderr = "";

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      // fzf returns 0 for matches found, 1 for no matches, 2 for error
      if (code === 2) {
        reject(new Error(`fzf exited with code ${code}: ${stderr}`));
      } else {
        resolve({
          stdout: stdout.trim(),
          stderr,
          code,
          hasMatches: code === 0
        });
      }
    });

    process.on("error", (err) => {
      reject(new Error(`Failed to execute fzf: ${err.message}`));
    });
  });
}

/**
 * Get list of files from a directory (recursively)
 */
async function getFileList(directory = ".", maxDepth = 10) {
  try {
    // Use dir /s /b on Windows to get recursive file listing
    const { stdout } = await execAsync(`dir "${directory}" /s /b 2>nul || find "${directory}" -type f 2>/dev/null || ls -R "${directory}" 2>/dev/null`);
    return stdout;
  } catch (error) {
    // If commands fail, return empty string
    return "";
  }
}

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: "fzf-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "fuzzy_search_files",
        description:
          "Search for files using fzf fuzzy finder. Searches recursively from a starting directory and returns files matching the fuzzy query.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Fuzzy search query (e.g., 'readme', 'index.js', 'test')",
            },
            directory: {
              type: "string",
              description: "Starting directory for search (default: current directory)",
              default: ".",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 50)",
              default: 50,
            },
            caseSensitive: {
              type: "boolean",
              description: "Enable case-sensitive matching (default: false)",
              default: false,
            },
            exact: {
              type: "boolean",
              description: "Enable exact matching instead of fuzzy (default: false)",
              default: false,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "fuzzy_filter",
        description:
          "Filter a list of items using fzf's fuzzy matching algorithm. Pass a list of items and a query to get filtered results.",
        inputSchema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
              description: "List of items to filter",
            },
            query: {
              type: "string",
              description: "Fuzzy search query",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 50)",
              default: 50,
            },
            caseSensitive: {
              type: "boolean",
              description: "Enable case-sensitive matching (default: false)",
              default: false,
            },
            exact: {
              type: "boolean",
              description: "Enable exact matching instead of fuzzy (default: false)",
              default: false,
            },
          },
          required: ["items", "query"],
        },
      },
      {
        name: "fuzzy_search_content",
        description:
          "Search within file contents using fuzzy matching. Searches for text patterns across files in a directory.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Content search query",
            },
            directory: {
              type: "string",
              description: "Directory to search in (default: current directory)",
              default: ".",
            },
            filePattern: {
              type: "string",
              description: "File pattern to search (e.g., '*.js', '*.txt')",
              default: "*",
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 50)",
              default: 50,
            },
            caseSensitive: {
              type: "boolean",
              description: "Enable case-sensitive matching (default: false)",
              default: false,
            },
          },
          required: ["query"],
        },
      },
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "fuzzy_search_files") {
      const {
        query,
        directory = ".",
        maxResults = 50,
        caseSensitive = false,
        exact = false,
      } = args;

      // Get file list
      const fileList = await getFileList(directory);

      if (!fileList) {
        return {
          content: [
            {
              type: "text",
              text: "No files found in directory",
            },
          ],
        };
      }

      // Build fzf arguments
      const fzfArgs = ["--filter", query];

      if (caseSensitive) fzfArgs.push("+i"); // Disable case-insensitive (make case-sensitive)
      if (exact) fzfArgs.push("-e"); // Exact match

      // Execute fzf with file list as input
      const result = await executeFzf(fzfArgs, fileList);

      // Limit results
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const limitedResults = lines.slice(0, maxResults);

      return {
        content: [
          {
            type: "text",
            text: limitedResults.length > 0
              ? limitedResults.join('\n')
              : "No matches found",
          },
        ],
      };
    } else if (name === "fuzzy_filter") {
      const {
        items,
        query,
        maxResults = 50,
        caseSensitive = false,
        exact = false,
      } = args;

      // Build fzf arguments
      const fzfArgs = ["--filter", query];

      if (caseSensitive) fzfArgs.push("+i");
      if (exact) fzfArgs.push("-e");

      // Join items with newlines for fzf input
      const input = items.join('\n');

      // Execute fzf
      const result = await executeFzf(fzfArgs, input);

      // Limit results
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const limitedResults = lines.slice(0, maxResults);

      return {
        content: [
          {
            type: "text",
            text: limitedResults.length > 0
              ? limitedResults.join('\n')
              : "No matches found",
          },
        ],
      };
    } else if (name === "fuzzy_search_content") {
      const {
        query,
        directory = ".",
        filePattern = "*",
        maxResults = 50,
        caseSensitive = false,
      } = args;

      // Use grep/findstr to search file contents, then pipe to fzf
      let grepCommand;
      if (process.platform === 'win32') {
        // Windows: use findstr
        grepCommand = `findstr /s /n /p "${query}" "${directory}\\${filePattern}" 2>nul`;
      } else {
        // Unix: use grep
        const caseFlag = caseSensitive ? '' : '-i';
        grepCommand = `grep -r ${caseFlag} -n "${query}" "${directory}" 2>/dev/null`;
      }

      try {
        const { stdout } = await execAsync(grepCommand);

        // If we have results, filter them with fzf
        if (stdout) {
          const fzfArgs = ["--filter", query];
          if (caseSensitive) fzfArgs.push("+i");

          const result = await executeFzf(fzfArgs, stdout);

          // Limit results
          const lines = result.stdout.split('\n').filter(line => line.trim());
          const limitedResults = lines.slice(0, maxResults);

          return {
            content: [
              {
                type: "text",
                text: limitedResults.length > 0
                  ? limitedResults.join('\n')
                  : "No matches found",
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "No matches found",
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: "No matches found",
            },
          ],
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("fzf MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
