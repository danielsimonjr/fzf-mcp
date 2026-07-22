/**
 * Security regression tests for resolveFzfPath() in index.js.
 *
 * Background: getFzfPath() used to fall back to a bare `return 'fzf'`. On
 * Windows, spawn("fzf", ...) lets CreateProcess search the current working
 * directory first, so an fzf.exe planted in the CWD could be executed
 * (binary planting / search-path hijack). It also returned process.env.FZF_PATH
 * verbatim, so a relative override was equally plantable.
 *
 * resolveFzfPath() must therefore:
 *   - reject a non-absolute FZF_PATH (throw),
 *   - honor an absolute FZF_PATH,
 *   - never return a bare/relative name: it returns an ABSOLUTE path or throws.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Exercise BOTH the source and the hand-mirrored bundle. bundle/index.cjs is
// what .mcp.json launches, so its resolver must hold the same invariant; running
// the suite over both guards against source/bundle parity drift.
const MODULES = [
  ["index.js", require("../index.js")],
  ["bundle/index.cjs", require("../bundle/index.cjs")],
];

function withEnv(value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, "FZF_PATH");
  const prev = process.env.FZF_PATH;
  if (value === undefined) delete process.env.FZF_PATH;
  else process.env.FZF_PATH = value;
  try {
    return fn();
  } finally {
    if (had) process.env.FZF_PATH = prev;
    else delete process.env.FZF_PATH;
  }
}

for (const [modName, mod] of MODULES) {
  const { resolveFzfPath } = mod;

  test(`[${modName}] resolveFzfPath: rejects a relative FZF_PATH (planting vector)`, () => {
    for (const rel of ["fzf", "fzf.exe", "./fzf", "bin/fzf.exe"]) {
      withEnv(rel, () => {
        assert.throws(
          () => resolveFzfPath(),
          /absolute/i,
          `relative FZF_PATH ${JSON.stringify(rel)} must be rejected, not spawned`
        );
      });
    }
  });

  test(`[${modName}] resolveFzfPath: honors an absolute FZF_PATH`, () => {
    // __filename is guaranteed absolute and existing.
    withEnv(__filename, () => {
      assert.equal(resolveFzfPath(), __filename);
    });
  });

  test(`[${modName}] resolveFzfPath: fallback is an ABSOLUTE path or a throw — never a bare name`, () => {
    withEnv(undefined, () => {
      let result;
      try {
        result = resolveFzfPath();
      } catch (err) {
        // Throwing when no binary is found is an acceptable safe outcome.
        assert.match(err.message, /fzf/i);
        return;
      }
      assert.ok(
        path.isAbsolute(result),
        `resolveFzfPath returned a non-absolute path (plantable): ${JSON.stringify(result)}`
      );
    });
  });
}
