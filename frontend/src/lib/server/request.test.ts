import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ApiError } from "./api-error";
import {
  assertSameOrigin,
  parseJsonRequest,
  validateReturnPath,
} from "./request";

const payloadSchema = z.object({ name: z.string().min(1) }).strict();

describe("parseJsonRequest", () => {
  it("parses a valid JSON request", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Rein" }),
    });

    await expect(parseJsonRequest(request, payloadSchema)).resolves.toEqual({
      name: "Rein",
    });
  });

  it("rejects a non-JSON content type", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    });

    await expect(parseJsonRequest(request, payloadSchema)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    await expect(parseJsonRequest(request, payloadSchema)).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it("maps schema failures to field errors", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "", unknown: true }),
    });

    await expect(parseJsonRequest(request, payloadSchema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 422,
      fields: {
        name: expect.any(Array),
        _root: expect.any(Array),
      },
    } satisfies Partial<ApiError>);
  });

  it("enforces the configured byte limit", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Rein" }),
    });

    await expect(
      parseJsonRequest(request, payloadSchema, { maxBytes: 2 }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });
  });
});

describe("assertSameOrigin", () => {
  it("accepts reads without an Origin header", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://rein.example/api/library"),
        "https://rein.example",
      ),
    ).not.toThrow();
  });

  it("accepts a same-origin mutation", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://rein.example/api/tools", {
          method: "POST",
          headers: { origin: "https://rein.example" },
        }),
        "https://rein.example",
      ),
    ).not.toThrow();
  });

  it.each([undefined, "https://attacker.example", "not a URL"])(
    "rejects a mutation with origin %s",
    (origin) => {
      const headers = origin ? { origin } : undefined;
      expect(() =>
        assertSameOrigin(
          new Request("https://rein.example/api/tools", {
            method: "DELETE",
            headers,
          }),
          "https://rein.example",
        ),
      ).toThrowError(expect.objectContaining({ code: "ORIGIN_FORBIDDEN" }));
    },
  );
});

describe("validateReturnPath", () => {
  it.each([
    ["/library?category=icons#saved", "/library?category=icons#saved"],
    ["https://rein.example/settings", "/settings"],
    [null, "/"],
  ])("accepts a local destination", (value, expected) => {
    expect(validateReturnPath(value, "https://rein.example")).toBe(expected);
  });

  it.each([
    "https://attacker.example/steal",
    "//attacker.example/steal",
    "/\\attacker.example/steal",
  ])("rejects unsafe destination %s", (value) => {
    expect(() =>
      validateReturnPath(value, "https://rein.example"),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REQUEST" }));
  });
});
