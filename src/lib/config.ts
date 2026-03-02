import * as fs from "node:fs";
import * as path from "node:path";
import type * as github from "@actions/github";
import * as yaml from "js-yaml";
import { z } from "zod";

// DNS label: starts and ends with alphanumeric, hyphens allowed in the middle.
// Accepts a single label (e.g. "localhost") or a multi-label name where the TLD
// is all alphabetic (2–63 chars).
const HOST_REGEX =
  /^(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/;

const HookConfigSchema = z.object({
  prebuild: z.string().optional(),
  postbuild: z.string().optional(),
});
export type HookConfig = z.infer<typeof HookConfigSchema>;

const GemConfigSchema = z.object({
  directory: z.string().optional(),
  gemspec: z.string().optional(),
  hooks: HookConfigSchema.optional(),
});
export type GemConfig = z.infer<typeof GemConfigSchema>;

const RegistryConfigSchema = z.object({
  host: z.string().regex(HOST_REGEX, "Must be a valid hostname or domain name"),
});
export type RegistryConfig = z.infer<typeof RegistryConfigSchema>;

const DEFAULT_REGISTRIES: Array<RegistryConfig> = [{ host: "rubygems.org" }];

const ConfigSchema = z.object({
  gems: z.array(GemConfigSchema).optional(),
  hooks: HookConfigSchema.optional(),
  registries: z.array(RegistryConfigSchema).default(DEFAULT_REGISTRIES),
});
export type Config = z.infer<typeof ConfigSchema>;

const DEFAULT_CONFIG: Config = ConfigSchema.parse({});

function formatZodPath(path: (string | number)[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    return acc === "" ? segment : `${acc}.${segment}`;
  }, "");
}

export function parseConfig(content: string): Config {
  const result = ConfigSchema.safeParse(yaml.load(content));
  if (result.success) {
    return result.data;
  }
  const messages = result.error.issues.map((issue) => {
    const path = formatZodPath(issue.path);
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  throw new Error(`Invalid config file: ${messages.join("; ")}`);
}

function isENOENT(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === "ENOENT";
}

export async function loadConfigLocal(workspace: string): Promise<Config> {
  // We have a working tree
  const configPath = path.join(workspace, ".github", "release-gems.yaml");
  return fs.promises
    .readFile(configPath, { encoding: "utf-8" })
    .then(parseConfig, (err: unknown) => {
      if (isENOENT(err)) return DEFAULT_CONFIG;
      throw err;
    });
}

export async function loadConfig(
  workspace: string,
  context: typeof github.context,
  octokit: ReturnType<typeof github.getOctokit>,
): Promise<Config> {
  if (fs.existsSync(path.join(workspace, ".github"))) {
    return loadConfigLocal(workspace);
  }

  // Try to fetch from GitHub API at the commit
  try {
    const response = await octokit.rest.repos.getContent({
      ...context.repo,
      ref: context.sha,
      path: ".github/release-gems.yaml",
    });

    const data = response.data;
    if (!Array.isArray(data) && data.type === "file" && data.content) {
      const decoded = Buffer.from(data.content, "base64").toString("utf8");
      return parseConfig(decoded);
    }
    throw new Error(
      "Something went wrong when fetching .github/release-gems.yaml",
    );
  } catch (err) {
    if ((err as { status?: number }).status === 404) return DEFAULT_CONFIG;
    throw err;
  }
}
