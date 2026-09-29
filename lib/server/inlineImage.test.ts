import { afterEach, describe, expect, it, vi } from "vitest";

import { inlineRemoteImage } from "./inlineImage";

function mockFetch(impl: (url: string) => Promise<Response> | Response) {
  vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve(impl(url))));
}

afterEach(() => vi.unstubAllGlobals());

describe("inlineRemoteImage", () => {
  it("passes through data:/blob: URIs untouched, without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(inlineRemoteImage("data:image/png;base64,AAAA")).resolves.toBe("data:image/png;base64,AAAA");
    await expect(inlineRemoteImage("blob:http://x/1")).resolves.toBe("blob:http://x/1");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("empty/missing/non-http values are refused without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(inlineRemoteImage(undefined)).resolves.toBeUndefined();
    await expect(inlineRemoteImage("")).resolves.toBeUndefined();
    await expect(inlineRemoteImage("javascript:alert(1)")).resolves.toBeUndefined();
    await expect(inlineRemoteImage("file:///etc/passwd")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches an http(s) image and inlines it as a data: URI", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    mockFetch(() => new Response(bytes, { status: 200, headers: { "content-type": "image/png" } }));
    const out = await inlineRemoteImage("https://s3.example.com/logo.png");
    expect(out).toBe(`data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
  });

  it("refuses a non-2xx response", async () => {
    mockFetch(() => new Response("", { status: 404 }));
    await expect(inlineRemoteImage("https://s3.example.com/missing.png")).resolves.toBeUndefined();
  });

  it("refuses a non-image content type", async () => {
    mockFetch(() => new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(inlineRemoteImage("https://s3.example.com/not-an-image")).resolves.toBeUndefined();
  });

  it("refuses an oversized image", async () => {
    mockFetch(() => new Response(new Uint8Array(6_000_000), { status: 200, headers: { "content-type": "image/png" } }));
    await expect(inlineRemoteImage("https://s3.example.com/huge.png")).resolves.toBeUndefined();
  });

  it("degrades gracefully when the fetch throws (unreachable host, timeout, …)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network down"))));
    await expect(inlineRemoteImage("https://s3.example.com/logo.png")).resolves.toBeUndefined();
  });
});
