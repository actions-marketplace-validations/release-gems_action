import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { attestProvenance } from "@actions/attest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as z from "zod";
import { uploadGemArtifact } from "./lib/artifact";
import { loadConfigLocal } from "./lib/config";
import { type GemBuildResult, buildGem } from "./lib/gem";
import { runHook } from "./lib/hook";
import { getInputs } from "./lib/input";
import {
  type TargetGem,
  resolveGemCandidates,
  selectTargets,
} from "./lib/project";
import { parseTag } from "./lib/tag";

function sanitizeJobId(job: string): string {
  return job.replace(/[^a-zA-Z0-9-]/g, "-");
}

type BuildResult = GemBuildResult & { provenancePath: string };

async function build(
  target: TargetGem,
  ruby: string,
  token: string,
): Promise<BuildResult> {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "release-gems-"));
  const hookEnv = {
    RELEASE_GEMS_GEM_NAME: target.info.name,
    RELEASE_GEMS_GEM_VERSION: target.info.version,
    RELEASE_GEMS_GEMSPEC_PATH: target.gemspecRelPath,
  };

  await core.group(`Run prebuild hook for ${target.info.name}`, async () =>
    runHook(target.gemConfig.hooks?.prebuild, target.dir, hookEnv),
  );

  const result = await core.group(`Pack gem ${target.info.name}`, async () => {
    return buildGem(ruby, target.gemspecPath, outDir);
  });

  const provenancePath = await core.group(
    `Attest provenance for ${target.info.name}`,
    async () => {
      const sha256 = createHash("sha256")
        .update(fs.readFileSync(result.path))
        .digest("hex");
      const attestation = await attestProvenance({
        subjects: [{ name: path.basename(result.path), digest: { sha256 } }],
        token,
      });

      const provenancePath = `${result.path}.sigstore.json`;
      fs.writeFileSync(provenancePath, JSON.stringify(attestation.bundle));

      return provenancePath;
    },
  );

  await core.group(`Run postbuild hook for ${target.info.name}`, async () =>
    runHook(target.gemConfig.hooks?.postbuild, target.dir, hookEnv),
  );

  return { ...result, provenancePath };
}

async function run(): Promise<void> {
  const {
    "github-token": token,
    job: jobId,
    "retention-days": retentionDays,
    ruby,
  } = getInputs({
    "github-token": z.string(),
    job: z.string().default("default").transform(sanitizeJobId),
    "retention-days": z.number().optional(),
    ruby: z.string().default("ruby"),
  });

  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const config = await loadConfigLocal(workspace);
  const tagInfo = parseTag(github.context.ref);

  const targets = selectTargets(
    resolveGemCandidates(workspace, config, ruby),
    tagInfo,
  );

  const buildResults = await core.group("Build gems", async () => {
    await core.group("Run global prebuild hook", async () =>
      runHook(config.hooks?.prebuild, workspace),
    );

    const results: BuildResult[] = [];
    for (const target of targets) {
      const result = await core.group(
        `Build ${target.gemspecRelPath}`,
        async () => build(target, ruby, token),
      );
      results.push(result);
    }

    await core.group("Run global postbuild hook", async () =>
      runHook(config.hooks?.postbuild, workspace),
    );

    return results;
  });

  for (const result of buildResults) {
    const directory = path.dirname(result.path);

    await core.group(`Upload artifacts for ${result.name}`, async () =>
      uploadGemArtifact({
        jobId,
        gemName: result.name,
        directory,
        index: {
          gem: {
            filename: path.relative(directory, result.path),
          },
          attestations: [
            {
              filename: path.relative(directory, result.provenancePath),
              mediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
            },
          ],
        },
        retentionDays,
      }),
    );
  }
}

export const completed = run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
