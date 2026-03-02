import { spawn } from "node:child_process";

export interface HookEnv {
  RELEASE_GEMS_GEM_NAME?: string;
  RELEASE_GEMS_GEM_VERSION?: string;
  RELEASE_GEMS_GEMSPEC_PATH?: string;
}

/**
 * Run a hook command via the system shell ($SHELL).
 * A null/undefined command is silently skipped.
 * Non-zero exit code throws an error, aborting the job.
 *
 * @param command  Shell command string, or null/undefined to skip.
 * @param cwd      Working directory for the subprocess.
 * @param env      Additional environment variables to inject.
 */
export async function runHook(
  command: string | null | undefined,
  cwd: string,
  env?: HookEnv,
): Promise<void> {
  if (command == null) {
    return;
  }

  const shell = process.env.SHELL ?? "/bin/sh";

  return new Promise<void>((resolve, reject) => {
    const child = spawn(shell, ["-c", command], {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Hook exited with code ${code}: ${command}`));
      }
    });
  });
}
