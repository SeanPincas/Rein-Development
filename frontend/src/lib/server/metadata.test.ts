import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

import { describe, expect, it, beforeEach } from "vitest";

import {
  discoverMetadata,
  decompressResponse,
  extractMetadata,
  fetchBounded,
  isUnsafeAddress,
  issueMetadataToken,
  verifyMetadataToken,
  type MetadataFetchResponse,
  type MetadataTransport,
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

  it("parses safe text and only icon link candidates", () => {
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
      icons: ["/favicon.png"],
    });
  });

  it("returns editable suggestions and a ready icon through a bounded fixture transport", async () => {
    const calls: string[] = [];
    const fixture = async (url: URL): Promise<MetadataFetchResponse> => {
      calls.push(url.toString());
      if (url.pathname === "/favicon.png") {
        return { status: 200, headers: { "content-type": "image/png" }, body: Buffer.from("png"), finalUrl: url.toString() };
      }
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
    expect(result.iconStatus).toBe("ready");
    expect(result.iconUrl).toBe("https://public.example/favicon.png");
    expect(calls).toEqual(["https://public.example/docs", "https://public.example/favicon.png"]);
    expect(verifyMetadataToken(result.metadataToken, "user_123", result.sourceUrl)?.iconUrl).toBe(result.iconUrl);
  });

  it("accepts an SVG favicon declared by the site", async () => {
    const fixture = async (url: URL): Promise<MetadataFetchResponse> => {
      if (url.pathname === "/favicon.svg") {
        return { status: 200, headers: { "content-type": "image/svg+xml" }, body: Buffer.from("<svg />"), finalUrl: url.toString() };
      }
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from('<link rel="icon" type="image/svg+xml" href="/favicon.svg">'),
        finalUrl: url.toString(),
      };
    };

    const result = await discoverMetadata("user_123", "https://svg.example/", fixture);

    expect(result.iconStatus).toBe("ready");
    expect(result.iconUrl).toBe("https://svg.example/favicon.svg");
  });

  it("tries common favicon paths when the page does not declare an icon", async () => {
    const calls: string[] = [];
    const fixture = async (url: URL): Promise<MetadataFetchResponse> => {
      calls.push(url.pathname);
      if (url.pathname === "/favicon.png") {
        return { status: 200, headers: { "content-type": "image/png" }, body: Buffer.from("png"), finalUrl: url.toString() };
      }
      if (url.pathname !== "/docs") {
        return { status: 404, headers: { "content-type": "text/plain" }, body: Buffer.from("missing"), finalUrl: url.toString() };
      }
      return { status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<title>Docs</title>"), finalUrl: url.toString() };
    };

    const result = await discoverMetadata("user_123", "https://common-icons.example/docs", fixture);

    expect(result.iconStatus).toBe("ready");
    expect(result.iconUrl).toBe("https://common-icons.example/favicon.png");
    expect(calls).toEqual(["/docs", "/favicon.ico", "/favicon.png"]);
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
