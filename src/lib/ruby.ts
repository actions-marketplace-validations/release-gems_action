import * as childProcess from "node:child_process";
import { z } from "zod";

export function runRuby<T extends z.ZodTypeAny>({
  ruby,
  cwd,
  args,
  script,
  schema,
}: {
  ruby: string;
  cwd: string;
  script: string;
  args: string[];
  schema: T;
}): z.infer<T> {
  const wrapped_script = `\
require 'json'
def write_result(payload) = IO.new(3).write JSON.generate(payload)
begin
  func = lambda do
${script}
end
  write_result data: func.call
rescue => e
  write_result error: "#{e.class}: #{e.message}"
end
`;

  const result = childProcess.spawnSync(ruby, ["-", ...args], {
    cwd,
    input: wrapped_script,
    stdio: ["pipe", "inherit", "inherit", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(`Ruby exited with status ${result.status}`);
  }

  const envelope = z
    .union([z.object({ data: schema }), z.object({ error: z.string() })])
    .parse(JSON.parse(result.output[3]!.toString()));

  if ("error" in envelope) {
    throw new Error(envelope.error);
  }
  return envelope.data;
}
