import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/server/api-error";
import { verifyMetadataToken } from "@/lib/server/metadata";
import type {
  CreateCategoryInput,
  CreateToolInput,
  UpdateCategoryInput,
  UpdateToolInput,
} from "@/lib/validation/library";

type DatabaseError = { code?: string; message?: string; details?: string };
type CategoryRow = {
  id: string;
  name: string;
  icon_key: string;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
};
type ToolRow = {
  id: string;
  category_id: string;
  name: string;
  url: string;
  hostname: string;
  description: string;
  icon_url: string | null;
  icon_status: "ready" | "fallback" | "unavailable";
  is_favorite: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

export type LibraryResponse = {
  categories: Array<ReturnType<typeof toCategory> & {
    toolCount: number;
    tools: ReturnType<typeof toTool>[];
  }>;
  meta: { categoryCount: number; toolCount: number };
};

const categoryColumns =
  "id,name,icon_key,sort_order,version,created_at,updated_at";
const toolColumns =
  "id,category_id,name,url,hostname,description,icon_url,icon_status,is_favorite,version,created_at,updated_at";

export function toCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    iconKey: row.icon_key,
    sortOrder: row.sort_order,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTool(row: ToolRow) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    url: row.url,
    hostname: row.hostname,
    description: row.description,
    iconUrl: row.icon_url,
    iconStatus: row.icon_status,
    isFavorite: row.is_favorite,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDatabaseError(error: DatabaseError): ApiError {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505" && text.includes("categories_user_normalized_name")) {
    return ApiError.duplicateCategory();
  }
  if (error.code === "23505" && text.includes("tools_user_normalized_url")) {
    return ApiError.duplicateToolUrl();
  }
  if (["23503", "23514", "22023"].includes(error.code ?? "")) {
    return ApiError.validation({ _root: ["The submitted values are invalid."] });
  }
  return ApiError.serviceUnavailable();
}

export async function getLibrary(
  database: SupabaseClient,
): Promise<LibraryResponse> {
  const { data, error } = await database.rpc("get_library");
  if (error) throw mapDatabaseError(error);
  return data as LibraryResponse;
}

async function missingOrStale(
  database: SupabaseClient,
  table: "categories" | "tools",
  id: string,
  resource: string,
): Promise<never> {
  const { data, error } = await database
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw mapDatabaseError(error);
  throw data ? ApiError.staleVersion() : ApiError.notFound(resource);
}

export async function createCategory(
  database: SupabaseClient,
  input: CreateCategoryInput,
) {
  const { data, error } = await database
    .from("categories")
    .insert({ name: input.name, icon_key: input.iconKey })
    .select(categoryColumns)
    .single();
  if (error) throw mapDatabaseError(error);
  return toCategory(data as CategoryRow);
}

export async function updateCategory(
  database: SupabaseClient,
  id: string,
  input: UpdateCategoryInput,
) {
  const changes = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.iconKey === undefined ? {} : { icon_key: input.iconKey }),
  };
  const { data, error } = await database
    .from("categories")
    .update(changes)
    .eq("id", id)
    .eq("version", input.version)
    .select(categoryColumns)
    .maybeSingle();
  if (error) throw mapDatabaseError(error);
  if (!data) return missingOrStale(database, "categories", id, "Category");
  return toCategory(data as CategoryRow);
}

export async function reorderCategories(
  database: SupabaseClient,
  items: Array<{ id: string; sortOrder: number }>,
) {
  const { data, error } = await database.rpc("reorder_categories", {
    p_items: items.map((item) => ({ id: item.id, sort_order: item.sortOrder })),
  });
  if (error) throw mapDatabaseError(error);
  return { updatedCount: Number(data) };
}

export async function deleteCategory(
  database: SupabaseClient,
  id: string,
  version: number,
  reassignTo?: string,
) {
  const { data, error } = await database.rpc(
    "delete_category_with_reassignment",
    { p_category_id: id, p_version: version, p_reassign_to: reassignTo ?? null },
  );
  if (error) throw mapDatabaseError(error);
  const result = data as { status: string; reassigned_count?: number };
  if (result.status === "not_found") throw ApiError.notFound("Category");
  if (result.status === "stale_version") throw ApiError.staleVersion();
  if (result.status === "category_not_empty") throw ApiError.categoryNotEmpty();
  if (result.status === "invalid_destination") {
    throw ApiError.validation({ reassignTo: ["Choose another owned category."] });
  }
  return { reassignedCount: result.reassigned_count ?? 0 };
}

export async function createTool(
  database: SupabaseClient,
  input: CreateToolInput,
  userId: string,
) {
  const metadata = input.metadataToken
    ? verifyMetadataToken(input.metadataToken, userId, input.url.url)
    : null;
  const toolValues = {
    name: input.name,
    url: input.url.url,
    normalized_url: input.url.normalizedUrl,
    hostname: input.url.hostname,
    description: input.description,
    icon_url: metadata?.iconStatus === "ready" ? metadata.iconUrl : null,
    icon_status: metadata?.iconStatus ?? "fallback",
  };

  if ("create" in input.category) {
    const { data, error } = await database.rpc("create_tool_with_category", {
      p_category_name: input.category.create.name,
      p_category_icon_key: input.category.create.iconKey,
      p_name: toolValues.name,
      p_url: toolValues.url,
      p_normalized_url: toolValues.normalized_url,
      p_hostname: toolValues.hostname,
      p_description: toolValues.description,
      p_icon_url: toolValues.icon_url,
      p_icon_status: toolValues.icon_status,
    });
    if (error) throw mapDatabaseError(error);
    const result = data as { category: CategoryRow; tool: ToolRow };
    return {
      tool: toTool(result.tool),
      category: toCategory(result.category),
      categoryCreated: true,
    };
  }

  const { data, error } = await database
    .from("tools")
    .insert({ ...toolValues, category_id: input.category.id })
    .select(toolColumns)
    .single();
  if (error) throw mapDatabaseError(error);
  return { tool: toTool(data as ToolRow), categoryCreated: false };
}

export async function updateTool(
  database: SupabaseClient,
  id: string,
  input: UpdateToolInput,
  userId: string,
) {
  const metadata = input.url && input.metadataToken
    ? verifyMetadataToken(input.metadataToken, userId, input.url.url)
    : null;
  const changes = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.isFavorite === undefined ? {} : { is_favorite: input.isFavorite }),
    ...(input.categoryId === undefined ? {} : { category_id: input.categoryId }),
    ...(input.url === undefined
      ? {}
      : {
          url: input.url.url,
          normalized_url: input.url.normalizedUrl,
          hostname: input.url.hostname,
          icon_url: metadata?.iconStatus === "ready" ? metadata.iconUrl : null,
          icon_status: metadata?.iconStatus ?? "fallback",
        }),
  };
  const { data, error } = await database
    .from("tools")
    .update(changes)
    .eq("id", id)
    .eq("version", input.version)
    .select(toolColumns)
    .maybeSingle();
  if (error) throw mapDatabaseError(error);
  if (!data) return missingOrStale(database, "tools", id, "Tool");
  return toTool(data as ToolRow);
}

export async function deleteTool(
  database: SupabaseClient,
  id: string,
  version: number,
) {
  const { data, error } = await database
    .from("tools")
    .delete()
    .eq("id", id)
    .eq("version", version)
    .select("id")
    .maybeSingle();
  if (error) throw mapDatabaseError(error);
  if (!data) return missingOrStale(database, "tools", id, "Tool");
}
