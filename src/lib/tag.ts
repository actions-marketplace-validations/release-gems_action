export type TagInfo =
  | { kind: "unified"; tagName: string; version: string }
  | { kind: "per-gem"; tagName: string; gemName: string; version: string };

/**
 * Parse a git ref string into TagInfo.
 *
 * - refs/tags/v1.2.3        → unified tag, version "1.2.3"
 * - refs/tags/my-gem/v1.0.0 → per-gem tag, gemName "my-gem", version "1.0.0"
 * - anything else           → null
 */
export function parseTag(ref: string): TagInfo | null {
  // Unified tag: refs/tags/v{version} where version contains no slash
  const unifiedMatch = ref.match(/^refs\/tags\/v([^/]+)$/);
  if (unifiedMatch) {
    const version = unifiedMatch[1];
    return { kind: "unified", tagName: `v${version}`, version };
  }

  // Per-gem tag: refs/tags/{name}/v{version}
  const perGemMatch = ref.match(/^refs\/tags\/(.+)\/v([^/]+)$/);
  if (perGemMatch) {
    const gemName = perGemMatch[1];
    const version = perGemMatch[2];
    return {
      kind: "per-gem",
      tagName: `${gemName}/v${version}`,
      gemName,
      version,
    };
  }

  return null;
}
