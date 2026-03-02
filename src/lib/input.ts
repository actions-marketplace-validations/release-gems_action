import * as core from "@actions/core";
import type * as z from "zod";

function getInput<T extends z.ZodTypeAny>(name: string, schema: T) {
  const value = core.getInput(name);
  return schema.safeParse(value === "" ? undefined : value);
}

export function getInputs<T extends Record<string, z.ZodTypeAny>>(
  schemata: T,
): { [K in keyof T]: z.infer<T[K]> } {
  const values: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [name, schema] of Object.entries(schemata)) {
    const result = getInput(name, schema);
    if (result.success) {
      values[name] = result.data;
    } else {
      for (const issue of result.error.issues) {
        errors.push(`${name}: ${issue.message}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid inputs:\n${errors.join("\n")}`);
  }

  return values as { [K in keyof T]: z.infer<T[K]> };
}
