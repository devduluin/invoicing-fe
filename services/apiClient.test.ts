import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

/** Minimal browser stand-ins: the interceptor reads/writes document.cookie and
 *  navigates via window.location.href. */
function installBrowser(initialToken: string) {
  // an active company is part of a normal signed-in session (requests without one are not sent)
  const jar = new Map<string, string>([["app_token", initialToken], ["company_id", "c1"]]);
  vi.stubGlobal("document", {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(v: string) {
      const [pair] = v.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    },
  });
  const location = { pathname: "/dashboard", protocol: "http:", hostname: "localhost", href: "" };
  vi.stubGlobal("window", { location });
  return { jar, location };
}

type Reply = { status: number; data?: unknown; headers?: Record<string, string> };
type Handler = (cfg: InternalAxiosRequestConfig) => Reply;

async function loadClient(handler: Handler) {
  vi.resetModules();
  const { default: api } = await import("./apiClient");
  const calls: { url: string; auth?: string }[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push({ url: config.url ?? "", auth: config.headers.get("Authorization") as string | undefined });
    const r = handler(config);
    const response = { data: r.data ?? {}, status: r.status, statusText: "", headers: r.headers ?? {}, config };
    if (r.status >= 200 && r.status < 300) return response;
    const err = Object.assign(new Error(`HTTP ${r.status}`), {
      isAxiosError: true,
      config,
      response,
      code: undefined,
    });
    throw err;
  };
  api.defaults.adapter = adapter;
  return { api, calls };
}

describe("apiClient session handling", () => {
  let env: ReturnType<typeof installBrowser>;
  beforeEach(() => {
    env = installBrowser("tok-1");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a 401 that /me disproves is retried, not logged out", async () => {
    let first = true;
    const { api, calls } = await loadClient((cfg) => {
      if (cfg.url === "/me") return { status: 200 };
      if (cfg.url === "/things" && first) {
        first = false;
        return { status: 401 };
      }
      return { status: 200, data: { ok: true } };
    });
    const res = await api.get("/things");
    expect(res.data).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual(["/things", "/me", "/things"]);
    expect(env.location.href).toBe("");
  });

  it("logs out when the probe confirms the session is dead", async () => {
    const { api } = await loadClient(() => ({ status: 401 }));
    await expect(api.get("/things")).rejects.toBeTruthy();
    expect(env.location.href).toBe("/auth/logout");
  });

  it("does not log out when the session can't be verified (probe 5xx)", async () => {
    const { api } = await loadClient((cfg) =>
      cfg.url === "/me" ? { status: 500 } : { status: 401 },
    );
    await expect(api.get("/things")).rejects.toBeTruthy();
    expect(env.location.href).toBe("");
  });

  it("many concurrent 401s share ONE session probe", async () => {
    let bad = 3;
    const { api, calls } = await loadClient((cfg) => {
      if (cfg.url === "/me") return { status: 200 };
      if (bad > 0) {
        bad--;
        return { status: 401 };
      }
      return { status: 200 };
    });
    await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);
    expect(calls.filter((c) => c.url === "/me")).toHaveLength(1);
    expect(env.location.href).toBe("");
  });

  it("a 401 for a token that was replaced meanwhile just resends with the new token", async () => {
    const { api, calls } = await loadClient((cfg) => {
      if (cfg.url === "/a" && calls.length === 1) {
        env.jar.set("app_token", "tok-2"); // e.g. reissued by a sibling request
        return { status: 401 };
      }
      return { status: 200 };
    });
    await api.get("/a");
    expect(calls.map((c) => c.auth)).toEqual(["Bearer tok-1", "Bearer tok-2"]);
    expect(calls.some((c) => c.url === "/me")).toBe(false);
  });

  it("retries a transient 503 sso_unavailable without logging out", async () => {
    let n = 0;
    const { api, calls } = await loadClient(() =>
      ++n < 2 ? { status: 503, data: { error_code: "sso_unavailable" } } : { status: 200 },
    );
    await api.get("/things");
    expect(calls).toHaveLength(2);
    expect(env.location.href).toBe("");
  });

  it("a plain 403 (permission denied) neither retries nor logs out", async () => {
    const { api, calls } = await loadClient(() => ({ status: 403, data: { message: "no" } }));
    await expect(api.get("/things")).rejects.toBeTruthy();
    expect(calls).toHaveLength(1);
    expect(env.location.href).toBe("");
  });

  it("adopts a reissued token from the response header", async () => {
    const { api } = await loadClient(() => ({ status: 200, headers: { "x-reissued-token": "tok-new" } }));
    await api.get("/things");
    expect(env.jar.get("app_token")).toBe("tok-new");
    expect(env.jar.get("APP_TOKEN")).toBe("tok-new");
  });
});

describe("apiClient company context", () => {
  it("does not send a company-scoped request when no company is active, but identity calls still work", async () => {
    const { jar } = installBrowser("t");
    jar.delete("company_id");
    const { api, calls } = await loadClient(() => ({ status: 200 }));
    await expect(api.get("/sales-invoices/summary")).rejects.toThrow(/No active company/);
    await api.get("/me");
    expect(calls.map((c) => c.url)).toEqual(["/me"]);
  });
});
