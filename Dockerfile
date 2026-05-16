# Build + run the cvmake web editor. Build context = repo root.
FROM node:20.11.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Chromium runtime deps for Puppeteer (PDF export).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxkbcommon0 libxrandr2 wget \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user for the runtime stage (C5).
RUN groupadd --gid 1001 nodejs \
 && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nodejs

FROM base AS build
WORKDIR /app
# This image is the public demo deploy. NEXT_PUBLIC_* vars are inlined into
# the client bundle by `next build`, so the flag MUST be set BEFORE the build
# — otherwise client components (EditorShell, TopBar) bake in demo=false
# while the server (page.tsx) reads demo=true at runtime: a split-brain bug.
ENV NEXT_PUBLIC_DEMO_MODE=true
# H3 (security): origin checked against this in the API CSRF guard
# (apps/web/lib/request-guards.ts). Set to the public demo origin so
# cross-origin POSTs to /api/save|upload|export are refused.
ENV NEXT_PUBLIC_APP_ORIGIN=https://editor.cvmake.codevena.dev
# Puppeteer Chromium cache goes to the nodejs home dir so the non-root user
# can reach it in the run stage without a separate chown pass on /root.
ENV PUPPETEER_CACHE_DIR=/home/nodejs/.cache/puppeteer
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages
# C2 fix: narrow data/ copy — only include example CV YAMLs and safe photos.
# Personal cv.*.yaml and markus.{jpg,webp} are excluded by .dockerignore.
COPY data/cvs/example.*.yaml ./data/cvs/
COPY data/cvs/photos/ ./data/cvs/photos/
# H5 fix: copy only docs/screenshots/ — the symlink
#   apps/web/public/template-thumbnails -> ../../../docs/screenshots
# needs this directory to resolve at build+runtime.  The rest of docs/
# (superpowers/, plans/, template-review-*.md) must not ship.
COPY docs/screenshots/ ./docs/screenshots/
COPY public ./public
RUN pnpm install --frozen-lockfile
# Puppeteer's bundled Chromium download for the build/runtime image.
# PUPPETEER_CACHE_DIR above routes the download into the nodejs home dir.
RUN pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome
RUN pnpm build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production
# Also set at runtime so the server-side read in page.tsx matches the
# build-time-inlined client value.
ENV NEXT_PUBLIC_DEMO_MODE=true
ENV NEXT_PUBLIC_APP_ORIGIN=https://editor.cvmake.codevena.dev
# Point Puppeteer at the pre-downloaded Chromium under the nodejs user home.
ENV PUPPETEER_CACHE_DIR=/home/nodejs/.cache/puppeteer

# TODO(H4): replace broad workspace copy with `pnpm deploy --prod` once
# pnpm deploy is reliably compatible with this workspace layout.  For now we
# copy the full build output and accept the dev-dep surface area in exchange
# for a simpler, working image.
COPY --from=build /app ./
# Copy the pre-downloaded Chromium cache to the nodejs user home dir.
COPY --from=build /home/nodejs/.cache/puppeteer /home/nodejs/.cache/puppeteer

# Drop to non-root user (C5).
RUN chown -R nodejs:nodejs /app \
 && chown -R nodejs:nodejs /home/nodejs/.cache/puppeteer

USER nodejs

EXPOSE 3000

# M2: health-check so Coolify/Docker can detect a hung Next.js / Puppeteer process.
# wget is installed in the base stage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["pnpm", "--filter", "@codevena/cvmake-web", "start"]
