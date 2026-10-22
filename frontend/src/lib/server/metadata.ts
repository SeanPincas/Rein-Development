import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIPv4, isIPv6 } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

import { ApiError } from "@/lib/server/api-error";
import { normalizeToolUrl, type NormalizedToolUrl } from "@/lib/validation/library";

const MAX_HTML_BYTES = 1024 * 1024;
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const LOOKUP_TIMEOUT_MS = 1_000;
/** Cap for one page fetch, redirects included. */
const TOTAL_TIMEOUT_MS = 5_000;
const MAX_ADDRESS_ATTEMPTS = 3;
/** Connection-level failures worth retrying on the next resolved address. */
const RETRYABLE_CONNECT_ERRORS = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EADDRNOTAVAIL",
  "EAFNOSUPPORT",
  "ETIMEDOUT",
]);
const TOKEN_TTL_SECONDS = 10 * 60;

/**
 * Kept for the API/DB contract only. Icons now come from Simple Icons on the
 * client (src/lib/shared/brand-icon-match.ts); the lookup never fetches favicons,
 * so results always carry `iconUrl: null, iconStatus: "fallback"`.
 */
export type MetadataStatus = "ready" | "fallback" | "unavailable";

export type MetadataResult = {
  sourceUrl: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  iconStatus: MetadataStatus;
  metadataToken: string;
};

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type MetadataFetchResponse = {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  finalUrl: string;
};

type RequestOptions = {
  url: URL;
  maxBytes: number;
  accept: string;
  deadline: number;
};

function isPrivateIpv4(value: string): boolean {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || a === 172 && b >= 16 && b <= 31 ||
    a === 192 && (b === 0 || b === 168) || a === 198 && (b === 18 || b === 19) ||
    a >= 224;
}

function isPrivateIpv6(value: string): boolean {
  const normalized = value.toLowerCase().split("%", 1)[0];
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice(7));
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") || normalized.startsWith("2001:2:");
}

export function isUnsafeAddress(address: string): boolean {
  if (isIPv4(address)) return isPrivateIpv4(address);
  if (isIPv6(address)) return isPrivateIpv6(address);
  return true;
}

function validatePort(url: URL): void {
  if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) {
    throw ApiError.unsafeUrl();
  }
}

async function resolvePublicAddresses(hostname: string, deadline: number): Promise<ResolvedAddress[]> {
  if (Date.now() >= deadline) throw ApiError.serviceUnavailable();
  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isUnsafeAddress(hostname)) throw ApiError.unsafeUrl();
    return [{ address: hostname, family: isIPv4(hostname) ? 4 : 6 }];
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }).catch(() => {
      // ENOTFOUND / EAI_AGAIN (typo'd or offline host) is not a server fault.
      throw ApiError.serviceUnavailable();
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(ApiError.serviceUnavailable()), Math.min(LOOKUP_TIMEOUT_MS, deadline - Date.now()));
    }),
  ]).finally(() => clearTimeout(timer));
  const addresses = result.map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }));
  if (!addresses.length || addresses.some((entry) => isUnsafeAddress(entry.address))) throw ApiError.unsafeUrl();
  return addresses;
}

function parseHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(",") : value ?? ""]));
}

export async function decompressResponse(body: Buffer, encoding: string | undefined, maxBytes: number): Promise<Buffer> {
  const value = (encoding ?? "").toLowerCase().trim();
  if (!value || value === "identity") {
    if (body.byteLength > maxBytes) throw ApiError.invalidRequest("The remote response is too large.");
    return body;
  }
  const stream = value === "gzip" || value === "x-gzip"
    ? createGunzip()
    : value === "deflate"
      ? createInflate()
      : value === "br"
        ? createBrotliDecompress()
        : null;
  if (!stream) throw ApiError.invalidRequest("The remote response uses an unsupported encoding.");
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    stream.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > maxBytes) {
        failed = true;
        const error = ApiError.invalidRequest("The remote response is too large.");
        stream.destroy();
        reject(error);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    stream.on("error", (error) => { if (!failed) reject(error); });
    stream.on("end", () => { if (!failed) resolve(Buffer.concat(chunks)); });
    stream.end(body);
  });
}

/** IPv4 first (stable): hosts without IPv6 routes, e.g. many Docker networks, fail fast otherwise. */
export function orderAddresses(addresses: ResolvedAddress[]): ResolvedAddress[] {
  return [...addresses].sort((a, b) => (a.family === 4 ? 0 : 1) - (b.family === 4 ? 0 : 1));
}

/**
 * Tries up to MAX_ADDRESS_ATTEMPTS resolved addresses, moving on only for
 * connection-level failures. Any other non-ApiError (TLS, protocol…) and an
 * exhausted list surface as SERVICE_UNAVAILABLE rather than a 500.
 */
export async function connectWithFallback<T>(
  addresses: ResolvedAddress[],
  attempt: (address: ResolvedAddress) => Promise<T>,
  deadline: number,
): Promise<T> {
  for (const address of orderAddresses(addresses).slice(0, MAX_ADDRESS_ATTEMPTS)) {
    if (Date.now() >= deadline) break;
    try {
      return await attempt(address);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (!RETRYABLE_CONNECT_ERRORS.has((error as NodeJS.ErrnoException)?.code ?? "")) throw ApiError.serviceUnavailable();
    }
  }
  throw ApiError.serviceUnavailable();
}

async function requestResolved(options: RequestOptions, addresses: ResolvedAddress[]): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  return connectWithFallback(addresses, (address) => requestAddress(options, address), options.deadline);
}

async function requestAddress(options: RequestOptions, address: ResolvedAddress): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  const remaining = Math.max(1, Math.min(TOTAL_TIMEOUT_MS, options.deadline - Date.now()));
  const requestFactory = options.url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    let settled = false;
    const totalTimer = setTimeout(() => { req.destroy(); fail(ApiError.serviceUnavailable()); }, remaining);
    const finish = () => clearTimeout(totalTimer);
    const fail = (error: unknown) => { if (!settled) { settled = true; finish(); reject(error); } };
    const req = requestFactory({
      protocol: options.url.protocol,
      hostname: options.url.hostname,
      port: options.url.port || undefined,
      path: `${options.url.pathname}${options.url.search}`,
      method: "GET",
      headers: { Accept: options.accept, "Accept-Encoding": "gzip, deflate, br", "User-Agent": "ReinMetadata/1.0" },
      timeout: remaining,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      servername: options.url.hostname,
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.byteLength;
        if (size > MAX_COMPRESSED_BYTES) {
          req.destroy();
          fail(ApiError.invalidRequest("The remote response is too large."));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      response.on("end", async () => {
        if (settled) return;
        try {
          const body = await decompressResponse(Buffer.concat(chunks), response.headers["content-encoding"] as string | undefined, options.maxBytes);
          settled = true;
          finish();
          resolve({ status: response.statusCode ?? 0, headers: parseHeaders(response.headers), body });
        } catch (error) { fail(error); }
      });
      response.on("error", fail);
    });
    req.on("timeout", () => { req.destroy(); fail(ApiError.serviceUnavailable()); });
    req.on("error", fail);
    req.end();
  });
}

function redirectTarget(response: MetadataFetchResponse, current: URL): URL | null {
  if (![301, 302, 303, 307, 308].includes(response.status)) return null;
  const location = response.headers.location;
  if (!location) throw ApiError.serviceUnavailable();
  try { return new URL(location, current); } catch { throw ApiError.serviceUnavailable(); }
}

export type MetadataTransport = {
  resolve: (hostname: string, deadline: number) => Promise<ResolvedAddress[]>;
  request: (options: RequestOptions, addresses: ResolvedAddress[]) => Promise<{ status: number; headers: Record<string, string>; body: Buffer }>;
};

const defaultTransport: MetadataTransport = { resolve: resolvePublicAddresses, request: requestResolved };

export type FetchOptions = {
  maxBytes: number;
  accept: string;
  /** Absolute epoch-ms deadline; never extended past TOTAL_TIMEOUT_MS from now. */
  deadline?: number;
};

export async function fetchBounded(
  url: URL,
  options: FetchOptions,
  transport: MetadataTransport = defaultTransport,
): Promise<MetadataFetchResponse> {
  const deadline = Math.min(options.deadline ?? Number.POSITIVE_INFINITY, Date.now() + TOTAL_TIMEOUT_MS);
  let current = new URL(url);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!["http:", "https:"].includes(current.protocol) || current.username || current.password) throw ApiError.unsafeUrl();
    validatePort(current);
    const addresses = await transport.resolve(current.hostname, deadline);
    const response = await transport.request({ url: current, ...options, deadline }, addresses);
    const next = redirectTarget({ ...response, finalUrl: current.toString() }, current);
    if (!next) return { ...response, finalUrl: current.toString() };
    current = next;
  }
  throw ApiError.serviceUnavailable();
}

function decodeHtml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#\d+;/giu, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " " };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = Number(entity.slice(2, -1));
    return Number.isSafeInteger(code) ? String.fromCodePoint(code) : entity;
  });
}

function cleanText(value: string | undefined): string | null {
  if (!value) return null;
  const text = decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/gu, " ").trim());
  return text ? text.slice(0, 280) : null;
}

function readAttribute(tag: string, name: string): string | null {
  // Whole attribute name (not `data-rel`), value double-, single- or un-quoted.
  const match = tag.match(new RegExp(`[\\s"'/]${name}\\s*=\\s*(?:"([^"]{0,2048})"|'([^']{0,2048})'|([^\\s"'=<>\`]{1,2048}))`, "iu"));
  const value = match ? match[1] ?? match[2] ?? match[3] : undefined;
  return value ? decodeHtml(value) : null;
}

export function extractMetadata(html: string): { title: string | null; description: string | null } {
  const safeHtml = html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<noscript\b[\s\S]*?<\/noscript\s*>/giu, " ");
  const title = cleanText(safeHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu)?.[1]);
  let description: string | null = null;
  for (const tag of safeHtml.match(/<meta\b[^>]*>/giu) ?? []) {
    const name = readAttribute(tag, "name")?.toLowerCase();
    if (name === "description") description = cleanText(readAttribute(tag, "content") ?? undefined);
  }
  return { title, description };
}

type MetadataFetcher = (url: URL, options: FetchOptions) => Promise<MetadataFetchResponse>;

function tokenSecret(): string {
  const secret = process.env.METADATA_TOKEN_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) throw ApiError.serviceUnavailable();
  return secret;
}

function sign(value: string): string { return createHmac("sha256", tokenSecret()).update(value).digest("base64url"); }

export function issueMetadataToken(userId: string, sourceUrl: string, result: Pick<MetadataResult, "finalUrl" | "title" | "description" | "iconUrl" | "iconStatus">, now = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, url: sourceUrl, ...result, exp: now + TOKEN_TTL_SECONDS }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyMetadataToken(token: string, userId: string, sourceUrl: string, now = Math.floor(Date.now() / 1000)): Pick<MetadataResult, "iconUrl" | "iconStatus"> | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; url?: string; exp?: number; iconUrl?: string | null; iconStatus?: MetadataStatus };
    if (data.sub !== userId || data.url !== sourceUrl || !data.exp || data.exp < now || !["ready", "fallback", "unavailable"].includes(data.iconStatus ?? "")) return null;
    return { iconUrl: data.iconUrl ?? null, iconStatus: data.iconStatus as MetadataStatus };
  } catch { return null; }
}

export async function discoverMetadata(userId: string, inputUrl: string, fetcher: MetadataFetcher = fetchBounded): Promise<MetadataResult> {
  let normalized: NormalizedToolUrl;
  try { normalized = normalizeToolUrl(inputUrl); } catch { throw ApiError.unsafeUrl(); }
  const source = new URL(normalized.url);
  validatePort(source);
  const response = await fetcher(source, { maxBytes: MAX_HTML_BYTES, accept: "text/html,application/xhtml+xml" });
  const contentType = response.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
  const isHtml = response.status >= 200 && response.status < 300 && (contentType === "text/html" || contentType === "application/xhtml+xml");
  const parsed = isHtml ? extractMetadata(response.body.toString("utf8")) : { title: null, description: null };
  const result = { finalUrl: response.finalUrl, ...parsed, iconUrl: null, iconStatus: "fallback" as const };
  return { sourceUrl: normalized.url, ...result, metadataToken: issueMetadataToken(userId, normalized.url, result) };
}

export function metadataFingerprint(input: string): string { return createHash("sha256").update(input).digest("hex"); }
