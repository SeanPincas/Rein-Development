import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

import { describe, expect, it, beforeEach } from "vitest";

import {
  connectWithFallback,
  discoverMetadata,
  decompressResponse,
  extractMetadata,
  fetchBounded,
  isUnsafeAddress,
  issueMetadataToken,
  verifyMetadataToken,
  type MetadataFetchResponse,
  type MetadataTransport,
  type ResolvedAddress,
} from "./metadata";

describe("metadata discovery safety helpers", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test-signing-secret";
  });

  it("blocks loopback, private, link-local, reserved, and documentation addresses", () => {
    expect(isUnsafeAddress("127.0.0.1")).toBe(true);
    expect(isUnsafeAddress("10.0.0.8")).toBe(true);
    expect(isUnsafeAddress("169.254.169.254")).toBe(true);
    expect(isUnsafeAddress("192.168.1.2")).toBe(true);
    expect(isUnsafeAddress("::1")).toBe(true);
    expect(isUnsafeAddress("2001:db8::1")).toBe(true);
    expect(isUnsafeAddress("8.8.8.8")).toBe(false);
  });

  it("parses safe title and description text", () => {
    expect(
      extractMetadata(`
        <title>  Rein &amp; Tools </title>
        <script>document.title = 'ignore me'</script>
        <meta name="description" content="A &lt;safe&gt; developer library">
        <link rel="stylesheet" href="/style.css">
        <link rel="shortcut icon" href="/favicon.png">
      `),
    ).toEqual({
      title: "Rein & Tools",
      description: "A developer library",
    });
  });

  it("returns editable suggestions from the page alone and never fetches favicons", async () => {
    const calls: string[] = [];
    const fixture = async (url: URL): Promise<MetadataFetchResponse> => {
      calls.push(url.toString());
      return {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: Buffer.from('<title>Rein</title><meta name="description" content="Save tools"><link rel="icon" href="/favicon.png">'),
        finalUrl: "https://public.example/docs",
      };
    };

    const result = await discoverMetadata("user_123", "https://public.example/docs", fixture);

    expect(result.title).toBe("Rein");
    expect(result.description).toBe("Save tools");
    expect(result.iconStatus).toBe("fallback");
    expect(result.iconUrl).toBeNull();
    expect(calls).toEqual(["https://public.example/docs"]);
    expect(verifyMetadataToken(result.metadataToken, "user_123", result.sourceUrl)).toEqual({ iconUrl: null, iconStatus: "fallback" });
  });

  it("falls back when a page has no usable metadata or icon", async () => {
    const result = await discoverMetadata("user_123", "https://public.example/empty", async (url) => ({
      status: 200,
      headers: { "content-type": "text/html" },
      body: Buffer.from("<html><body>No metadata</body></html>"),
      finalUrl: url.toString(),
    }));

    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.iconUrl).toBeNull();
    expect(result.iconStatus).toBe("fallback");
  });

  it("rejects tokens for another user, URL, expiry, or tampered payload", () => {
    const token = issueMetadataToken("user_123", "https://public.example/", {
      finalUrl: "https://public.example/",
      title: "Example",
      description: null,
      iconUrl: "https://public.example/favicon.png",
      iconStatus: "ready",
    }, 100);

    expect(verifyMetadataToken(token, "other", "https://public.example/", 101)).toBeNull();
    expect(verifyMetadataToken(token, "user_123", "https://other.example/", 101)).toBeNull();
    expect(verifyMetadataToken(token, "user_123", "https://public.example/", 701)).toBeNull();
    expect(verifyMetadataToken(`${token}x`, "user_123", "https://public.example/", 101)).toBeNull();
  });

  it("revalidates each redirect and caps the redirect chain", async () => {
    const calls: string[] = [];
    const transport: MetadataTransport = {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async ({ url }) => {
        calls.push(url.toString());
        if (url.pathname === "/start") return { status: 302, headers: { location: "/middle" } as Record<string, string>, body: Buffer.alloc(0) };
        if (url.pathname === "/middle") return { status: 301, headers: { location: "https://public.example/final" } as Record<string, string>, body: Buffer.alloc(0) };
        return { status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<title>Final</title>" ) };
      },
    };

    const result = await fetchBounded(new URL("https://public.example/start"), { maxBytes: 1000, accept: "text/html" }, transport);
    expect(result.finalUrl).toBe("https://public.example/final");
    expect(calls).toEqual([
      "https://public.example/start",
      "https://public.example/middle",
      "https://public.example/final",
    ]);

    const loopTransport: MetadataTransport = {
      resolve: transport.resolve,
      request: async ({ url }) => ({ status: 302, headers: { location: url.toString() }, body: Buffer.alloc(0) }),
    };
    await expect(fetchBounded(new URL("https://public.example/loop"), { maxBytes: 1000, accept: "text/html" }, loopTransport)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("rejects decompressed responses that exceed the bound", async () => {
    const compressed = gzipSync(Buffer.alloc(20_000, "a"));
    await expect(decompressResponse(compressed, "gzip", 1024)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("does not connect when DNS returns a private address and surfaces timeout failures", async () => {
    let requests = 0;
    const privateTransport: MetadataTransport = {
      resolve: async () => { throw new Error("unsafe address"); },
      request: async () => { requests += 1; return { status: 200, headers: {}, body: Buffer.alloc(0) }; },
    };
    await expect(fetchBounded(new URL("https://public.example/"), { maxBytes: 1000, accept: "text/html" }, privateTransport)).rejects.toThrow("unsafe address");
    expect(requests).toBe(0);

    const timeoutTransport: MetadataTransport = {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async () => { throw new Error("fixture timeout"); },
    };
    await expect(fetchBounded(new URL("https://public.example/"), { maxBytes: 1000, accept: "text/html" }, timeoutTransport)).rejects.toThrow("fixture timeout");
  });
});

describe("metadata lookup resilience", () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "test-signing-secret";
  });

  it("returns empty suggestions for bot walls and non-HTML pages with a single request", async () => {
    const calls: string[] = [];
    const walled = await discoverMetadata("user_123", "https://walled.example/docs", async (url) => {
      calls.push(url.pathname);
      return { status: 403, headers: { "content-type": "text/html" }, body: Buffer.from("<title>Just a moment...</title>"), finalUrl: url.toString() };
    });
    expect(walled.title).toBeNull();
    expect(walled.iconStatus).toBe("fallback");
    expect(calls).toEqual(["/docs"]);

    const bare = await discoverMetadata("user_123", "https://json.example/api", async (url) => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: Buffer.from("{}"),
      finalUrl: url.toString(),
    }));
    expect(bare.description).toBeNull();
    expect(bare.iconUrl).toBeNull();
  });

  it("reads unquoted attributes and ignores look-alike attribute names", () => {
    expect(extractMetadata('<title>X</title><meta data-name="description" content="no"><meta name=description content=Fast>')).toEqual({
      title: "X",
      description: "Fast",
    });
  });

  it("tries IPv4 first and moves to the next address only on connection failures", async () => {
    const addresses: ResolvedAddress[] = [
      { address: "2606:4700::1", family: 6 },
      { address: "93.184.216.34", family: 4 },
      { address: "93.184.216.35", family: 4 },
    ];
    const deadline = Date.now() + 5_000;
    const errno = (code: string) => Object.assign(new Error(code), { code });

    const tried: string[] = [];
    const value = await connectWithFallback(addresses, async ({ address }) => {
      tried.push(address);
      if (address === "93.184.216.34") throw errno("ECONNREFUSED");
      return "ok";
    }, deadline);
    expect(value).toBe("ok");
    expect(tried).toEqual(["93.184.216.34", "93.184.216.35"]);

    let tlsAttempts = 0;
    await expect(connectWithFallback(addresses, async () => {
      tlsAttempts += 1;
      throw errno("CERT_HAS_EXPIRED");
    }, deadline)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(tlsAttempts).toBe(1);

    let attempts = 0;
    await expect(connectWithFallback(addresses, async () => {
      attempts += 1;
      throw errno("ENETUNREACH");
    }, deadline)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(attempts).toBe(3);
  });
});
