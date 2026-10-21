import { z } from "zod";

const requiredValue = z.string().trim().min(1, "A value is required.");

const applicationOrigin = z
  .string()
  .trim()
  .url("Must be a valid absolute URL.")
  .transform((value, context) => {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      context.addIssue({
        code: "custom",
        message: "Must be an HTTP(S) origin without a path, query, or fragment.",
      });
      return z.NEVER;
    }

    return url.origin;
  });

export const serverEnvironmentSchema = z
  .object({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requiredValue,
    CLERK_SECRET_KEY: requiredValue,
    APP_ORIGIN: applicationOrigin,
    NEXT_PUBLIC_SUPABASE_URL: z
      .string()
      .trim()
      .url("Must be a valid absolute URL."),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredValue,
  })
  .readonly();

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class EnvironmentConfigurationError extends Error {
  readonly issues: Record<string, string[]>;

  constructor(issues: Record<string, string[]>) {
    const keys = Object.keys(issues).sort();
    super(
      `Invalid server environment configuration: ${keys.join(", ")}. ` +
        "Check frontend/.env.local against frontend/.env.example.",
    );
    this.name = "EnvironmentConfigurationError";
    this.issues = issues;
  }
}

export function parseServerEnvironment(
  input: Record<string, string | undefined>,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  const issues: Record<string, string[]> = {};

  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "environment";
    issues[key] ??= [];
    issues[key].push(issue.message);
  }

  throw new EnvironmentConfigurationError(issues);
}
