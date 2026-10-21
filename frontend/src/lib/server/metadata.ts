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
const MAX_ICON_BYTES = 512 * 1024;
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_ICON_CANDIDATES = 8;
const LOOKUP_TIMEOUT_MS = 1_000;
const TOTAL_TIMEOUT_MS = 5_000;
const TOKEN_TTL_SECONDS = 10 * 60;
const ICON_CACHE_TTL_MS = 60 * 60 * 1000;
const ICON_CACHE_MAX_ENTRIES = 256;

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

  const result = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => setTimeout(() => reject(ApiError.serviceUnavailable()), LOOKUP_TIMEOUT_MS)),
  ]);
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

async function requestResolved(options: RequestOptions, addresses: ResolvedAddress[]): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  const remaining = Math.max(1, Math.min(TOTAL_TIMEOUT_MS, options.deadline - Date.now()));
  const address = addresses[0];
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

export async function fetchBounded(
  url: URL,
  options: { maxBytes: number; accept: string },
  transport: MetadataTransport = defaultTransport,
): Promise<MetadataFetchResponse> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
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
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']{1,2048})["']`, "iu"));
  return match ? decodeHtml(match[1]) : null;
}

export function extractMetadata(html: string): { title: string | null; description: string | null; icons: string[] } {
  const safeHtml = html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<noscript\b[\s\S]*?<\/noscript\s*>/giu, " ");
  const title = cleanText(safeHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu)?.[1]);
  let description: string | null = null;
  for (const tag of safeHtml.match(/<meta\b[^>]*>/giu) ?? []) {
    const name = readAttribute(tag, "name")?.toLowerCase();
    if (name === "description") description = cleanText(readAttribute(tag, "content") ?? undefined);
  }
  const icons: string[] = [];
  for (const tag of safeHtml.match(/<link\b[^>]*>/giu) ?? []) {
    const rel = (readAttribute(tag, "rel") ?? "").toLowerCase().split(/\s+/u);
    const href = readAttribute(tag, "href");
    if (href && rel.some((value) => value === "icon" || value === "shortcut" || value === "apple-touch-icon" || value === "mask-icon")) icons.push(href);
    if (icons.length >= MAX_ICON_CANDIDATES) break;
  }
  return { title, description, icons };
}

type MetadataFetcher = (url: URL, options: { maxBytes: number; accept: string }) => Promise<MetadataFetchResponse>;

type CachedIcon = { iconUrl: string; expiresAt: number };
const iconCache = new Map<string, CachedIcon>();

function cachedIcon(origin: string): string | null {
  const cached = iconCache.get(origin);
  if (!cached || cached.expiresAt <= Date.now()) {
    iconCache.delete(origin);
    return null;
  }
  return cached.iconUrl;
}

function rememberIcon(origin: string, iconUrl: string): void {
  if (iconCache.size >= ICON_CACHE_MAX_ENTRIES && !iconCache.has(origin)) {
    const oldest = iconCache.keys().next().value;
    if (oldest) iconCache.delete(oldest);
  }
  iconCache.set(origin, { iconUrl, expiresAt: Date.now() + ICON_CACHE_TTL_MS });
}

async function findIcon(baseUrl: URL, candidates: string[], fetcher: MetadataFetcher): Promise<{ iconUrl: string | null; status: MetadataStatus }> {
  const cached = cachedIcon(baseUrl.origin);
  const urls = [...(cached ? [cached] : []), ...candidates, "/favicon.ico"].slice(0, MAX_ICON_CANDIDATES + 1);
  for (const candidate of urls) {
    let icon: URL;
    try { icon = new URL(candidate, baseUrl); } catch { continue; }
    if (icon.protocol !== "http:" && icon.protocol !== "https:") continue;
    try {
      const response = await fetcher(icon, { maxBytes: MAX_ICON_BYTES, accept: "image/*" });
      const contentType = response.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
      if (response.status >= 200 && response.status < 300 && contentType?.startsWith("image/") && contentType !== "image/svg+xml") {
        rememberIcon(baseUrl.origin, response.finalUrl);
        return { iconUrl: response.finalUrl, status: "ready" };
      }
    } catch { /* try the next bounded candidate */ }
  }
  return { iconUrl: null, status: "fallback" };
}

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
  if (response.status < 200 || response.status >= 300 || (contentType !== "text/html" && contentType !== "application/xhtml+xml")) {
    const result = { finalUrl: response.finalUrl, title: null, description: null, iconUrl: null, iconStatus: "unavailable" as const };
    return { sourceUrl: normalized.url, ...result, metadataToken: issueMetadataToken(userId, normalized.url, result) };
  }
  const parsed = extractMetadata(response.body.toString("utf8"));
  const icon = await findIcon(new URL(response.finalUrl), parsed.icons, fetcher);
  const result = { finalUrl: response.finalUrl, title: parsed.title, description: parsed.description, iconUrl: icon.iconUrl, iconStatus: icon.status };
  return { sourceUrl: normalized.url, ...result, metadataToken: issueMetadataToken(userId, normalized.url, result) };
}

export function metadataFingerprint(input: string): string { return createHash("sha256").update(input).digest("hex"); }
