# Implementation Tasks

## Lib: config.ts
- [x] `parseConfig(content)` — parse YAML into `Config`, validate structure, apply defaults
- [x] `loadConfig(configPath)` — read file from disk, return `null` if absent, call `parseConfig`

## Lib: tag.ts
- [x] `parseTag(ref)` — parse `refs/tags/v*`, `refs/tags/{name}/v*`, and `refs/heads/*`

## Lib: hook.ts
- [x] `runHook(command, cwd, env)` — spawn `$SHELL -c <command>`, inject env vars, throw on non-zero exit

## Lib: artifact.ts
- [x] `uploadGemArtifact(jobId, gemName, gemPath, attestationPath, retentionDays?)` — upload via `@actions/artifact`
- [x] `downloadGemArtifacts()` — list `release-gems-*` artifacts for current run and download all
- [x] `collectGemFiles(downloadDirs)` — scan artifact dirs for `.gem` files, throw on duplicate filename

## Lib: project.ts
- [x] `resolveGemCandidates(workspace, config, ruby)` — resolve gemspecs from config (absent key = auto-detect, `[]` = nothing)
- [x] `selectTargets(candidates, tagInfo)` — filter by per-gem tag or keep all; validate versions on tag pushes

## Lib: release.ts
- [x] `Release.getOrCreate(...)` — get existing release by tag (reuse draft, mark published if already live) or create new draft
- [x] `Release#uploadAssets(gemFiles)` — upload `.gem` and `.sigstore.json` per gem, skip existing assets
- [x] `Release#publish()` — finalize release (set `draft: false`)

## Lib: registry.ts
- [x] `exchangeOidcToken()` — exchange GitHub OIDC token for RubyGems.org short-lived API key
- [x] `pushToRegistry(registry, gemPath, attestationPath)` — invoke `gem push --attestation`, treat HTTP 409 as success

## Action: pack.ts
- [x] Read config / auto-detect gemspec
- [x] Determine target gems (all vs per-gem tag)
- [x] Validate gem versions against tag on tag pushes
- [x] Run hooks and build gems (global prepack → per-gem loop → global postpack)
- [x] Invoke Ruby script, parse JSON result
- [x] Generate Sigstore attestation with `@actions/attest`
- [x] Upload artifacts

## Action: publish.ts
- [x] Read config from filesystem or fetch from tag commit via REST API
- [x] Download all `release-gems-*` artifacts; fail on duplicate `.gem` filenames
- [x] Create or reuse draft GitHub release
- [x] Upload `.gem` + `.sigstore.json` as release assets (skip duplicates)
- [x] Publish (finalize) the release
- [x] Exchange OIDC token once per registry; push all gems

## Tests
- [x] `config.ts` — parseConfig: valid YAML, missing fields, invalid structure
- [x] `tag.ts` — parseTag: unified tag, per-gem tag, branch, edge cases
- [x] `hook.ts` — runHook: skip null, success, non-zero exit throws, env injection
- [x] `artifact.ts` — unit tests with mocked `@actions/artifact`
- [x] `registry.ts` — unit tests with mocked subprocess / HTTP
- [x] `pack.ts` — branch push, per-gem tag, unified tag, version mismatch, hooks
