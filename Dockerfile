# Debian (glibc) throughout, not Alpine: Playwright's Chromium needs glibc, and the
# builder must match the runtime so native modules copied into the standalone
# output are built for the same libc.

# Stage 1: deps + build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read at container
# start — .dockerignore excludes .env*, so they must arrive as build args (docker-compose's
# build.args) rather than an env file baked into the image.
ARG NEXT_PUBLIC_NODE_ENV=production
ARG NEXT_PUBLIC_INVOICE_API_URL
ARG NEXT_PUBLIC_AUTH_API_URL
ARG NEXT_PUBLIC_LAUNCHPAD_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_X_ACCOUNT_TYPE=duluin_invoice
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ENV NEXT_PUBLIC_NODE_ENV=$NEXT_PUBLIC_NODE_ENV \
    NEXT_PUBLIC_INVOICE_API_URL=$NEXT_PUBLIC_INVOICE_API_URL \
    NEXT_PUBLIC_AUTH_API_URL=$NEXT_PUBLIC_AUTH_API_URL \
    NEXT_PUBLIC_LAUNCHPAD_URL=$NEXT_PUBLIC_LAUNCHPAD_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_X_ACCOUNT_TYPE=$NEXT_PUBLIC_X_ACCOUNT_TYPE \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN

RUN npm run build

# Stage 2: runtime (standalone output + headless Chromium for server-side PDF export)
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010
# Bind all interfaces: the PDF renderer opens this same server at 127.0.0.1:$PORT,
# but Docker sets HOSTNAME to the container id, which would make Next bind only to
# that address.
ENV HOSTNAME=0.0.0.0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Install Chromium (+ the system libraries/fonts it needs) using the Playwright that
# ships INSIDE the standalone output, so the browser build always matches the
# library version. Must run as root, before dropping privileges.
RUN node ./node_modules/playwright-core/cli.js install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* \
    && chmod -R a+rX /ms-playwright

USER node
EXPOSE 3010

# PDF export tuning (all optional):
#   PDF_MAX_CONCURRENCY   simultaneous renders, default 2 (~300-600MB RAM each —
#                         give the container >= 1GB, more if you raise this)
#   PDF_QUEUE_TIMEOUT_MS  how long an extra request waits before a 503, default 20000
#   PDF_RENDER_TIMEOUT_MS per-render limit, default 30000
#   INVOICE_API_INTERNAL_URL  server-side base URL of invoice-service when the
#                         browser-facing NEXT_PUBLIC_INVOICE_API_URL isn't
#                         reachable from inside the container
CMD ["node", "server.js"]
