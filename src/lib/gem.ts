import * as path from "node:path";
import { z } from "zod";
import { runRuby } from "./ruby";

const GemInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
});
export type GemInfo = z.infer<typeof GemInfoSchema>;

export function inspectGemspec(ruby: string, gemspecPath: string): GemInfo {
  const script = `\
require 'rubygems'
spec = Gem::Specification.load(ARGV[0]) or fail "Cannot load gemspec: #{ARGV[0]}"
return {name: spec.name, version: spec.version.to_s}
`;

  const absGemspecPath = path.resolve(gemspecPath);
  try {
    return runRuby({
      ruby,
      cwd: path.dirname(absGemspecPath),
      script,
      args: [absGemspecPath],
      schema: GemInfoSchema,
    });
  } catch (err) {
    throw new Error(`failed to inspect ${gemspecPath}`, { cause: err });
  }
}

const GemBuildResultSchema = z.object({
  path: z.string(),
  name: z.string(),
  version: z.string(),
  platform: z.string(),
});
export type GemBuildResult = z.infer<typeof GemBuildResultSchema>;

export function buildGem(
  ruby: string,
  gemspecPath: string,
  outDir: string,
): GemBuildResult {
  const script = `\
require 'rubygems'
require 'rubygems/package'
spec = Gem::Specification.load(ARGV[0]) or fail "Cannot load gemspec: #{ARGV[0]}"
gem_path = File.join(ARGV[1], spec.file_name)
Gem::Package.build(spec, false, false, gem_path)
return {path: gem_path, name: spec.name, version: spec.version.to_s, platform: spec.platform.to_s}
`;

  const absGemspecPath = path.resolve(gemspecPath);
  try {
    return runRuby({
      ruby,
      cwd: path.dirname(absGemspecPath),
      script,
      args: [absGemspecPath, path.resolve(outDir)],
      schema: GemBuildResultSchema,
    });
  } catch (err) {
    throw new Error(`failed to build gem from ${gemspecPath}`, { cause: err });
  }
}
