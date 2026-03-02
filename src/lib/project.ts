import * as fs from "node:fs";
import * as path from "node:path";
import type { Config, GemConfig } from "./config";
import { type GemInfo, inspectGemspec } from "./gem";
import type { TagInfo } from "./tag";

export interface TargetGem {
  gemConfig: GemConfig;
  dir: string;
  gemspecPath: string;
  gemspecRelPath: string;
  info: GemInfo;
}

function resolveGemspec(
  workspace: string,
  gemConfig: GemConfig,
): { dir: string; gemspecPath: string; gemspecRelPath: string } {
  const dir = path.join(workspace, gemConfig.directory ?? ".");

  if (gemConfig.gemspec) {
    const gemspecPath = path.join(dir, gemConfig.gemspec);
    return { dir, gemspecPath, gemspecRelPath: gemConfig.gemspec };
  }

  const entries = fs.readdirSync(dir);
  const gemspecs = entries.filter((f) => f.endsWith(".gemspec"));

  if (gemspecs.length === 0) {
    throw new Error(`No .gemspec files found in ${dir}`);
  }
  if (gemspecs.length > 1) {
    throw new Error(
      `Multiple .gemspec files found in ${dir}: ${gemspecs.join(", ")}`,
    );
  }

  const gemspecRelPath = gemspecs[0];
  const gemspecPath = path.join(dir, gemspecRelPath);
  return { dir, gemspecPath, gemspecRelPath };
}

export function resolveGemCandidates(
  workspace: string,
  config: Config,
  ruby: string,
): TargetGem[] {
  // Explicit empty array means "build nothing"; absent key means auto-detect.
  const gemConfigs: GemConfig[] =
    config.gems !== undefined ? config.gems : [{}];

  const candidates: TargetGem[] = [];
  for (const gemConfig of gemConfigs) {
    const { dir, gemspecPath, gemspecRelPath } = resolveGemspec(
      workspace,
      gemConfig,
    );
    const info = inspectGemspec(ruby, gemspecPath);
    candidates.push({ gemConfig, dir, gemspecPath, gemspecRelPath, info });
  }
  return candidates;
}

export function selectTargets(
  candidates: TargetGem[],
  tagInfo: TagInfo | null,
): TargetGem[] {
  if (tagInfo === null) {
    return candidates;
  }

  let targets: TargetGem[];
  if (tagInfo.kind === "per-gem") {
    const matched = candidates.filter((t) => t.info.name === tagInfo.gemName);
    if (matched.length === 0) {
      throw new Error(
        `No gem named "${tagInfo.gemName}" found for per-gem tag`,
      );
    }
    targets = matched;
  } else {
    targets = candidates;
  }

  for (const target of targets) {
    if (target.info.version !== tagInfo.version) {
      throw new Error(
        `Version mismatch for gem "${target.info.name}": gemspec has "${target.info.version}" but tag specifies "${tagInfo.version}"`,
      );
    }
  }

  return targets;
}
