import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { runHook } from "./hook";

describe("runHook", () => {
  it("resolves immediately for null command without spawning", async () => {
    await expect(runHook(null, "/tmp")).resolves.toBeUndefined();
  });

  it("resolves immediately for undefined command without spawning", async () => {
    await expect(runHook(undefined, "/tmp")).resolves.toBeUndefined();
  });

  it("resolves for a successful command", async () => {
    await expect(runHook("true", "/tmp")).resolves.toBeUndefined();
  });

  it("rejects for a failing command", async () => {
    await expect(runHook("false", "/tmp")).rejects.toThrow(
      /Hook exited with code 1/,
    );
  });

  it("includes the command in the error message on failure", async () => {
    const command = "exit 42";
    await expect(runHook(command, "/tmp")).rejects.toThrow(command);
  });

  it("injects env vars into the subprocess", async () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `release-gems-hook-test-env-${process.pid}-${Date.now()}`,
    );
    try {
      await runHook(
        `printf '%s' "$RELEASE_GEMS_GEM_NAME" > ${tmpFile}`,
        "/tmp",
        {
          RELEASE_GEMS_GEM_NAME: "my-gem",
        },
      );
      const contents = fs.readFileSync(tmpFile, "utf8");
      expect(contents).toBe("my-gem");
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });

  it("injects all HookEnv vars (name, version, gemspec path)", async () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `release-gems-hook-test-envall-${process.pid}-${Date.now()}`,
    );
    try {
      await runHook(
        `printf '%s %s %s' "$RELEASE_GEMS_GEM_NAME" "$RELEASE_GEMS_GEM_VERSION" "$RELEASE_GEMS_GEMSPEC_PATH" > ${tmpFile}`,
        "/tmp",
        {
          RELEASE_GEMS_GEM_NAME: "foo",
          RELEASE_GEMS_GEM_VERSION: "1.2.3",
          RELEASE_GEMS_GEMSPEC_PATH: "/path/to/foo.gemspec",
        },
      );
      const contents = fs.readFileSync(tmpFile, "utf8");
      expect(contents).toBe("foo 1.2.3 /path/to/foo.gemspec");
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });

  it("runs the command with the given cwd", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `release-gems-hook-test-cwd-${process.pid}-`),
    );
    const tmpFile = path.join(
      os.tmpdir(),
      `release-gems-hook-test-cwd-out-${process.pid}-${Date.now()}`,
    );
    try {
      await runHook(`pwd > ${tmpFile}`, tmpDir);
      const contents = fs.readFileSync(tmpFile, "utf8").trim();
      // Resolve symlinks for comparison (e.g. /tmp may be a symlink on macOS)
      expect(fs.realpathSync(contents)).toBe(fs.realpathSync(tmpDir));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      fs.rmSync(tmpFile, { force: true });
    }
  });
});
