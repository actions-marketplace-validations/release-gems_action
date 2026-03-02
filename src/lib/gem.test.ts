import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGem, inspectGemspec } from "./gem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEMSPEC_PATH = path.resolve(__dirname, "../../fixtures/test_gem.gemspec");
const RUBY = "ruby";

describe("inspectGemspec", () => {
  it("returns name and version from gemspec", () => {
    const info = inspectGemspec(RUBY, GEMSPEC_PATH);
    expect(info.name).toBe("test_gem");
    expect(info.version).toBe("0.1.0");
  });

  it("throws for a nonexistent gemspec", () => {
    expect(() =>
      inspectGemspec(RUBY, path.join(os.tmpdir(), "nonexistent.gemspec")),
    ).toThrow();
  });
});

describe("buildGem", () => {
  it("builds the gem into a temporary directory", () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `release-gems-gem-test-${process.pid}-`),
    );
    try {
      const result = buildGem(RUBY, GEMSPEC_PATH, tmpDir);
      expect(result.name).toBe("test_gem");
      expect(result.version).toBe("0.1.0");
      expect(result.platform).toBe("ruby");
      expect(result.path).toBe(path.join(tmpDir, "test_gem-0.1.0.gem"));
      expect(fs.existsSync(result.path)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("throws for a nonexistent gemspec", () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `release-gems-gem-test-${process.pid}-`),
    );
    try {
      expect(() =>
        buildGem(RUBY, path.join(os.tmpdir(), "nonexistent.gemspec"), tmpDir),
      ).toThrow();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
