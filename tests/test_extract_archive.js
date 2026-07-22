// Behavioral test for extractArchive() in install-fzf.js.
//
// Verifies a real archive round-trip on the current platform, using a
// destination directory whose name contains a space — the previous shell-string
// implementation (execSync with interpolated quotes) was fragile for such paths;
// the env-var / argv-array implementation must handle them cleanly. This also
// exercises the injection-safety change: paths are never interpolated into a
// shell command.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { extractArchive } = require("../install-fzf.js");

const isWin = process.platform === "win32";

test("extractArchive extracts an archive into a destination path containing a space", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "fzf extract "));
  try {
    const srcDir = path.join(base, "src");
    const outDir = path.join(base, "out dir"); // intentional space
    fs.mkdirSync(srcDir);
    fs.mkdirSync(outDir);
    fs.writeFileSync(path.join(srcDir, "hello.txt"), "fzf-extract-marker");

    let archivePath;
    if (isWin) {
      archivePath = path.join(base, "a.zip");
      // Build the fixture zip with bsdtar (System32\tar.exe), separate from the
      // code under test. `-a` selects the format from the .zip extension.
      const tarExe = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
      execFileSync(tarExe, ["-a", "-c", "-f", archivePath, "-C", srcDir, "hello.txt"], { stdio: "inherit" });
      extractArchive(archivePath, outDir, true);
    } else {
      archivePath = path.join(base, "a.tar.gz");
      execFileSync("tar", ["-czf", archivePath, "-C", srcDir, "hello.txt"], { stdio: "inherit" });
      extractArchive(archivePath, outDir, false);
    }

    const extracted = path.join(outDir, "hello.txt");
    assert.ok(fs.existsSync(extracted), "extracted file should exist");
    assert.equal(fs.readFileSync(extracted, "utf8"), "fzf-extract-marker");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
