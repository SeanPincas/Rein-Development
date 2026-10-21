import type { CategoryIconKey } from "@/lib/shared/icon-library";

/** Client-side shapes of GET /api/library (see docs/API_CONTRACT.md). */
export type LibraryTool = {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  hostname: string;
  description: string;
  iconUrl: string | null;
  iconStatus: "ready" | "fallback" | "unavailable";
  isFavorite: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type LibraryCategory = {
  id: string;
  name: string;
  iconKey: CategoryIconKey;
  toolCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  tools: LibraryTool[];
};

export type LibrarySnapshot = {
  categories: LibraryCategory[];
  meta: { categoryCount: number; toolCount: number };
};
