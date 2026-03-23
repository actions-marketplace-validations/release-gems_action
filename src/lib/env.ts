const BLOCKED_PATTERNS = [/^INPUT_/, /^GITHUB_TOKEN$/, /^ACTIONS_/];

export const cleanEnv = (
  original: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(original).filter(
      ([k]) => !BLOCKED_PATTERNS.some((r) => r.test(k)),
    ),
  );
