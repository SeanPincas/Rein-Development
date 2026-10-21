import { z } from "zod";

import { categoryIconKeys } from "@/lib/shared/icon-library";

const textLength = (value: string) => Array.from(value).length;
const boundedText = (label: string, maximum: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine((value) => textLength(value) >= 1, `${label} is required.`)
    .refine(
      (value) => textLength(value) <= maximum,
      `${label} must be ${maximum} characters or fewer.`,
    );

export const categoryIconKeySchema = z.enum(categoryIconKeys);
export const categoryNameSchema = boundedText("Category name", 50).transform(
  (value) => value.replace(/\s+/gu, " "),
);
export const toolNameSchema = boundedText("Tool name", 100);
export const toolDescriptionSchema = boundedText("Description", 280);
export const versionSchema = z.number().int().positive();
export const idSchema = z.uuid();
export const metadataTokenSchema = z.string().trim().min(1).max(4096);

export type NormalizedToolUrl = {
  url: string;
  normalizedUrl: string;
  hostname: string;
};

export function normalizeToolUrl(input: string): NormalizedToolUrl {
  const url = input.trim();
  if (!url || textLength(url) > 2048) {
    throw new Error("Tool URL must contain 1–2048 characters.");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Tool URL must be an absolute HTTP or HTTPS URL.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "Tool URL must use HTTP or HTTPS and cannot contain credentials.",
    );
  }

  const normalized = new URL(parsed.toString());
  normalized.hostname = normalized.hostname.toLowerCase();

  return {
    url,
    normalizedUrl: normalized.toString(),
    hostname: normalized.hostname,
  };
}

const toolUrlSchema = z.string().transform((value, context) => {
  try {
    return normalizeToolUrl(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Tool URL is invalid.",
    });
    return z.NEVER;
  }
});

export const createCategorySchema = z
  .object({ name: categoryNameSchema, iconKey: categoryIconKeySchema })
  .strict();

export const updateCategorySchema = z
  .object({
    name: categoryNameSchema.optional(),
    iconKey: categoryIconKeySchema.optional(),
    version: versionSchema,
  })
  .strict()
  .refine((value) => value.name !== undefined || value.iconKey !== undefined, {
    message: "Provide a category field to update.",
  });

export const createToolSchema = z
  .object({
    name: toolNameSchema,
    url: toolUrlSchema,
    description: toolDescriptionSchema,
    metadataToken: metadataTokenSchema.optional(),
    category: z.union([
      z.object({ id: idSchema }).strict(),
      z.object({ create: createCategorySchema }).strict(),
    ]),
  })
  .strict();

export const updateToolSchema = z
  .object({
    name: toolNameSchema.optional(),
    url: toolUrlSchema.optional(),
    description: toolDescriptionSchema.optional(),
    isFavorite: z.boolean().optional(),
    metadataToken: metadataTokenSchema.optional(),
    categoryId: idSchema.optional(),
    version: versionSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.url !== undefined ||
      value.description !== undefined ||
      value.isFavorite !== undefined ||
      value.categoryId !== undefined,
    { message: "Provide a tool field to update." },
  );

export const deleteToolQuerySchema = z
  .object({ version: z.coerce.number().int().positive() })
  .strict();

export const deleteCategoryQuerySchema = z
  .object({
    version: z.coerce.number().int().positive(),
    reassignTo: idSchema.optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateToolInput = z.infer<typeof createToolSchema>;
export type UpdateToolInput = z.infer<typeof updateToolSchema>;
