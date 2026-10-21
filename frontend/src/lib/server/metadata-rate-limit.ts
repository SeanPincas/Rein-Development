import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/server/api-error";

type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

export function requestClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || real || "unknown";
  return candidate.slice(0, 128);
}

export async function consumeMetadataRateLimit(
  database: SupabaseClient,
  request: Request,
): Promise<void> {
  const { data, error } = await database.rpc("consume_metadata_rate_limit", {
    p_ip: requestClientAddress(request),
  });
  if (error) throw ApiError.serviceUnavailable();

  const result = data as RateLimitResult | null;
  if (!result?.allowed) throw ApiError.rateLimited(result?.retryAfterSeconds ?? 60);
}
