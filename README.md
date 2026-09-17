# invoice-frontend

Frontend for **Duluin Invoice** (PRD Phase 1). Next.js (App Router) + React 19 +
Tailwind v4. PWA-ready from day one (PRD §3).

## Auth — follows Launchpad

This app has **no login form**. `middleware.ts` guards `/dashboard/*`: when the
shared SSO `app_token` cookie is missing it redirects to the Launchpad hub —

```
${NEXT_PUBLIC_LAUNCHPAD_URL}/auth/signin?account_type=duluin_invoice&redirect=<this app>
```

Launchpad handles sign-in, sets `app_token` on the shared `.duluin.*` cookie
domain, and redirects back. On return:

1. `middleware.ts` now sees the cookie and lets the request through.
2. `components/auth/AuthInitializer` calls `GET /api/v1/me` on invoice-service
   (`services/apiClient` attaches `Authorization: Bearer <app_token>` +
   `X-Account-Type: duluin_invoice` + `X-Company-ID`).
3. The resolved identity (roles, permissions) hydrates `store/useAuthStore`.
4. `components/auth/PermissionGate` gates UI by the fixed roles (PRD §13):
   `Invoice Owner` / `Invoice Admin` / `Invoice Viewer`.

`/auth/logout` clears the SSO cookies across domain variants, calls
`{AUTH_API_URL}/users/logout`, and returns to the Launchpad sign-in page.

> The user needs a `duluin_invoice` account in SSO (seeded by
> `DuluinInvoiceSeeder` in the SSO repo) — otherwise Launchpad routes them to its
> connect/verify flow instead of back here.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev                  # http://localhost:3010
```

Local stack (same as `acc-frontend` / `acc-master-service`):

| Piece | Local URL |
|-------|-----------|
| SSO | `http://sso.test` (laragon vhost) |
| API gateway (`gateway_v3`) | `http://localhost:9996` |
| Launchpad hub | `http://localhost:3000` |
| invoice-service | `http://localhost:8090` |
| this app | `http://localhost:3010` |

API calls go **through the gateway** — `NEXT_PUBLIC_INVOICE_API_URL=http://localhost:9996/api/proxy/v1/invoice`.
For that to route, add `SERVICE_INVOICE=http://localhost:8090` to `gateway_v3/.env`
(the gateway auto-registers the proxy on boot). The gateway rewrites
`…/proxy/v1/invoice/<path>` → `invoice-service:/api/v1/<path>`, so `services/*`
call `/me`, `/partners` (no `/v1`). Set `NEXT_PUBLIC_INVOICE_API_URL=http://localhost:8090/api/v1`
to bypass the gateway.

Keep `NEXT_PUBLIC_COOKIE_DOMAIN` blank locally — `localhost` shares cookies by
hostname regardless of port, so Launchpad on `:3000` still shares the session.
Launchpad needs the `duluin_invoice` tile (`feat/invoice-workspace-entry` branch)
+ `NEXT_PUBLIC_APP_URL_INVOICE=http://localhost:3010` in its `.env`.

## Env

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_INVOICE_API_URL` | invoice-service, through the gateway (`…/proxy/v1/invoice`) |
| `NEXT_PUBLIC_LAUNCHPAD_URL` | hub used for sign-in redirect (`http://localhost:3000`) |
| `NEXT_PUBLIC_AUTH_API_URL` | SSO base URL, logout only (`http://sso.test/api`) |
| `NEXT_PUBLIC_X_ACCOUNT_TYPE` | `duluin_invoice` |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | shared SSO cookie domain (`.duluin.id`), blank on localhost |
| `NEXT_PUBLIC_SITE_URL` | public URL, fallback for the post-login redirect |

## Next (out of scope for the skeleton)

Onboarding, invoice templates, sales/purchase flows, public link viewer, reports —
see the PRD. Add screens under `app/dashboard/*` and API calls via
`services/*` using the shared `apiClient`.
