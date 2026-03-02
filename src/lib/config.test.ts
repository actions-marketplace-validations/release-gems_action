import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfigLocal, parseConfig } from "./config";

describe("parseConfig", () => {
  it("parses a full valid config", () => {
    const yaml = `
gems:
  - directory: foo
    gemspec: foo.gemspec
    hooks:
      prebuild: bundle exec rake generate
      postbuild: echo done
  - directory: bar
    gemspec: bar.gemspec
hooks:
  prebuild: global pre
  postbuild: global post
registries:
  - host: rubygems.org
  - host: gems.example.com
`;
    const config = parseConfig(yaml);
    expect(config).toEqual({
      gems: [
        {
          directory: "foo",
          gemspec: "foo.gemspec",
          hooks: {
            prebuild: "bundle exec rake generate",
            postbuild: "echo done",
          },
        },
        {
          directory: "bar",
          gemspec: "bar.gemspec",
        },
      ],
      hooks: { prebuild: "global pre", postbuild: "global post" },
      registries: [{ host: "rubygems.org" }, { host: "gems.example.com" }],
    });
  });

  it("parses a config with only gems", () => {
    const yaml = `
gems:
  - directory: foo
`;
    const config = parseConfig(yaml);
    expect(config).toEqual({
      gems: [{ directory: "foo" }],
      registries: [{ host: "rubygems.org" }],
    });
    expect(config.hooks).toBeUndefined();
  });

  it("throws on empty content", () => {
    expect(() => parseConfig("")).toThrow("Invalid config file");
  });

  it("throws on null YAML content", () => {
    expect(() => parseConfig("null")).toThrow("Invalid config file");
  });

  it("applies default registries when not specified", () => {
    const config = parseConfig("gems:\n  - directory: foo\n");
    expect(config.registries).toEqual([{ host: "rubygems.org" }]);
  });

  it("parses a gem with only required fields", () => {
    const yaml = `
gems:
  - {}
`;
    const config = parseConfig(yaml);
    expect(config.gems).toEqual([{}]);
  });

  it("parses hooks with only prebuild", () => {
    const yaml = `
hooks:
  prebuild: run something
`;
    const config = parseConfig(yaml);
    expect(config.hooks).toEqual({ prebuild: "run something" });
    expect(config.hooks?.postbuild).toBeUndefined();
  });

  it("throws when top-level value is not an object", () => {
    expect(() => parseConfig("- item1\n- item2\n")).toThrow();
    expect(() => parseConfig("just a string\n")).toThrow();
    expect(() => parseConfig("42\n")).toThrow();
  });

  it("throws when gems is not an array", () => {
    expect(() => parseConfig("gems: not-an-array\n")).toThrow(/gems/);
  });

  it("throws when a gem entry is not an object", () => {
    expect(() => parseConfig("gems:\n  - just-a-string\n")).toThrow(
      /gems\[0\]/,
    );
  });

  it("throws when gem directory is not a string", () => {
    expect(() => parseConfig("gems:\n  - directory: 123\n")).toThrow(
      /directory/,
    );
  });

  it("throws when gem hooks is not an object", () => {
    expect(() => parseConfig("gems:\n  - hooks: bad\n")).toThrow(/hooks/);
  });

  it("throws when gem hooks.prebuild is not a string", () => {
    expect(() =>
      parseConfig("gems:\n  - hooks:\n      prebuild: 42\n"),
    ).toThrow(/prebuild/);
  });

  it("throws when global hooks is not an object", () => {
    expect(() => parseConfig("hooks: bad\n")).toThrow(/hooks/);
  });

  it("throws when registries is not an array", () => {
    expect(() => parseConfig("registries: not-an-array\n")).toThrow(
      /registries/,
    );
  });

  it("throws when a registry entry is not an object", () => {
    expect(() => parseConfig("registries:\n  - just-a-string\n")).toThrow(
      /registries\[0\]/,
    );
  });

  it("throws when registry host is missing", () => {
    expect(() => parseConfig("registries:\n  - name: foo\n")).toThrow(/host/);
  });

  it("throws when registry host is not a string", () => {
    expect(() => parseConfig("registries:\n  - host: 123\n")).toThrow(/host/);
  });

  it("accepts valid registry hosts", () => {
    expect(() =>
      parseConfig("registries:\n  - host: rubygems.org\n"),
    ).not.toThrow();
    expect(() =>
      parseConfig("registries:\n  - host: gems.example.com\n"),
    ).not.toThrow();
    expect(() =>
      parseConfig("registries:\n  - host: my-registry.io\n"),
    ).not.toThrow();
    expect(() => parseConfig("registries:\n  - host: a.bc\n")).not.toThrow();
    // Single-label names are allowed (e.g. internal registries)
    expect(() =>
      parseConfig("registries:\n  - host: localhost\n"),
    ).not.toThrow();
    expect(() =>
      parseConfig("registries:\n  - host: myregistry\n"),
    ).not.toThrow();
  });

  it("throws when registry host is not a valid hostname", () => {
    // IP address — TLD must be alphabetic
    expect(() => parseConfig("registries:\n  - host: 127.0.0.1\n")).toThrow(
      /host/,
    );
    // Underscores are not allowed in DNS labels
    expect(() => parseConfig("registries:\n  - host: bad_host.com\n")).toThrow(
      /host/,
    );
    // Labels must not start with a hyphen
    expect(() => parseConfig("registries:\n  - host: -bad.com\n")).toThrow(
      /host/,
    );
    // Labels must not end with a hyphen
    expect(() => parseConfig("registries:\n  - host: bad-.com\n")).toThrow(
      /host/,
    );
  });
});

describe("loadConfigLocal", () => {
  it("returns Config for an existing file", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-gems-test-"));
    try {
      fs.mkdirSync(path.join(tmpDir, ".github"));
      fs.writeFileSync(
        path.join(tmpDir, ".github", "release-gems.yaml"),
        `gems:
  - directory: foo
hooks:
  prebuild: echo hi
registries:
  - host: rubygems.org
`,
        "utf8",
      );
      const config = await loadConfigLocal(tmpDir);
      expect(config).toEqual({
        gems: [{ directory: "foo" }],
        hooks: { prebuild: "echo hi" },
        registries: [{ host: "rubygems.org" }],
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it("returns DEFAULT_CONFIG when config file is absent", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-gems-test-"));
    try {
      const config = await loadConfigLocal(tmpDir);
      expect(config).toEqual({ registries: [{ host: "rubygems.org" }] });
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it("throws for an empty config file", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-gems-test-"));
    try {
      fs.mkdirSync(path.join(tmpDir, ".github"));
      fs.writeFileSync(
        path.join(tmpDir, ".github", "release-gems.yaml"),
        "",
        "utf8",
      );
      await expect(loadConfigLocal(tmpDir)).rejects.toThrow(
        "Invalid config file",
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });
});
