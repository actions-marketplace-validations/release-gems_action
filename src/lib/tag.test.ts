import { describe, expect, it } from "vitest";
import { parseTag } from "./tag";

describe("parseTag", () => {
  describe("unified tags", () => {
    it("parses refs/tags/v1.2.3", () => {
      expect(parseTag("refs/tags/v1.2.3")).toEqual({
        kind: "unified",
        tagName: "v1.2.3",
        version: "1.2.3",
      });
    });

    it("parses refs/tags/v0.0.1", () => {
      expect(parseTag("refs/tags/v0.0.1")).toEqual({
        kind: "unified",
        tagName: "v0.0.1",
        version: "0.0.1",
      });
    });

    it("parses refs/tags/v10.20.30", () => {
      expect(parseTag("refs/tags/v10.20.30")).toEqual({
        kind: "unified",
        tagName: "v10.20.30",
        version: "10.20.30",
      });
    });

    it("parses refs/tags/v1.0.0.alpha1", () => {
      expect(parseTag("refs/tags/v1.0.0.alpha1")).toEqual({
        kind: "unified",
        tagName: "v1.0.0.alpha1",
        version: "1.0.0.alpha1",
      });
    });
  });

  describe("per-gem tags", () => {
    it("parses refs/tags/my-gem/v1.0.0", () => {
      expect(parseTag("refs/tags/my-gem/v1.0.0")).toEqual({
        kind: "per-gem",
        tagName: "my-gem/v1.0.0",
        gemName: "my-gem",
        version: "1.0.0",
      });
    });

    it("parses refs/tags/foo-bar/v2.3.4", () => {
      expect(parseTag("refs/tags/foo-bar/v2.3.4")).toEqual({
        kind: "per-gem",
        tagName: "foo-bar/v2.3.4",
        gemName: "foo-bar",
        version: "2.3.4",
      });
    });

    it("parses refs/tags/some_gem/v0.1.0", () => {
      expect(parseTag("refs/tags/some_gem/v0.1.0")).toEqual({
        kind: "per-gem",
        tagName: "some_gem/v0.1.0",
        gemName: "some_gem",
        version: "0.1.0",
      });
    });
  });

  describe("branch refs", () => {
    it("parses refs/heads/master as branch", () => {
      expect(parseTag("refs/heads/master")).toEqual(null);
    });

    it("parses refs/heads/main as branch", () => {
      expect(parseTag("refs/heads/main")).toEqual(null);
    });

    it("parses refs/heads/feature/branch as branch", () => {
      expect(parseTag("refs/heads/feature/branch")).toEqual(null);
    });

    it("parses refs/heads/release/v1.0 as branch", () => {
      expect(parseTag("refs/heads/release/v1.0")).toEqual(null);
    });
  });

  describe("edge cases / unrecognized refs fall back to branch", () => {
    it("treats an empty string as branch", () => {
      expect(parseTag("")).toEqual(null);
    });

    it("treats refs/pull/1/head as branch", () => {
      expect(parseTag("refs/pull/1/head")).toEqual(null);
    });

    it("treats refs/tags/ (no version) as branch", () => {
      expect(parseTag("refs/tags/")).toEqual(null);
    });

    it("treats a bare tag name without refs/tags/ prefix as branch", () => {
      expect(parseTag("v1.2.3")).toEqual(null);
    });

    it("treats refs/tags/no-version-prefix as branch", () => {
      expect(parseTag("refs/tags/no-version-prefix")).toEqual(null);
    });
  });
});
