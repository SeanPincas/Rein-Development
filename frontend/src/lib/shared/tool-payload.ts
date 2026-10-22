/**
 * Request bodies for POST /api/tools and PATCH /api/tools/:id (docs/API_CONTRACT.md).
 * Icons travel only as a Simple Icons slug: never SVG markup or image URLs.
 */
import type { CategoryIconKey } from "./icon-library";
import type { LibraryTool } from "./library-types";

export type ToolCategoryInput = { id: string } | { create: { name: string; iconKey: CategoryIconKey } };

export type CreateToolPayload = {
  name: string;
  url: string;
  description: string;
  category: ToolCategoryInput;
  metadataToken?: string;
  iconSlug?: string;
};

/** `iconSlug: null` (fallback) is omitted; the server then uses hostname/letter. */
export function buildCreateToolPayload(input: {
  name: string;
  url: string;
  description: string;
  category: ToolCategoryInput;
  metadataToken?: string;
  iconSlug: string | null;
}): CreateToolPayload {
  return {
    name: input.name,
    url: input.url,
    description: input.description,
    category: input.category,
    ...(input.metadataToken ? { metadataToken: input.metadataToken } : {}),
    ...(input.iconSlug ? { iconSlug: input.iconSlug } : {}),
  };
}

export type UpdateToolPayload = {
  version: number;
  url?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  /** A slug to select, or null to clear back to the fallback. */
  iconSlug?: string | null;
  metadataToken?: string;
};

/**
 * Only the fields that changed, plus the version precondition; null when nothing
 * changed. The server clears the icon when the URL changes without an `iconSlug`
 * in the same request, so a kept icon is re-sent alongside a URL change.
 */
export function buildToolUpdatePayload(
  original: Pick<LibraryTool, "url" | "name" | "description" | "categoryId" | "iconSlug" | "version">,
  next: {
    url: string;
    name: string;
    description: string;
    categoryId?: string;
    iconSlug: string | null;
    metadataToken?: string;
  },
): UpdateToolPayload | null {
  const changes: Omit<UpdateToolPayload, "version"> = {};
  const urlChanged = next.url !== original.url;
  if (urlChanged) changes.url = next.url;
  if (next.name !== original.name) changes.name = next.name;
  if (next.description !== original.description) changes.description = next.description;
  if (next.categoryId && next.categoryId !== original.categoryId) changes.categoryId = next.categoryId;
  if (next.iconSlug !== (original.iconSlug ?? null) || (urlChanged && next.iconSlug)) changes.iconSlug = next.iconSlug;
  if (!Object.keys(changes).length) return null;
  if (urlChanged && next.metadataToken) changes.metadataToken = next.metadataToken;
  return { ...changes, version: original.version };
}
