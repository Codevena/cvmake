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

FROM base AS build
WORKDIR /app
# This image is the public demo deploy. NEXT_PUBLIC_* vars are inlined into
# the client bundle by `next build`, so the flag MUST be set BEFORE the build
# — otherwise client components (EditorShell, TopBar) bake in demo=false
# while the server (page.tsx) reads demo=true at runtime: a split-brain bug.
ENV NEXT_PUBLIC_DEMO_MODE=true
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages
COPY data ./data
# apps/web/public/ has git-tracked symlinks pointing OUT of apps/web:
#   public/template-thumbnails -> ../../../docs/screenshots  (12 template PNGs)
#   public/photos              -> ../../../public/photos     (uploaded photos)
#   public/cv/photos           -> ../../../../data/cvs/photos (example photos — data/ already copied)
# Without docs/ and public/ in the image those symlinks dangle and every
# thumbnail/photo 404s. Copy the symlink targets so they resolve.
COPY docs ./docs
COPY public ./public
RUN pnpm install --frozen-lockfile
# Puppeteer's bundled Chromium download for the build/runtime image.
RUN pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome
RUN pnpm build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production
# Also set at runtime so the server-side read in page.tsx matches the
# build-time-inlined client value.
ENV NEXT_PUBLIC_DEMO_MODE=true
COPY --from=build /app ./
COPY --from=build /root/.cache/puppeteer /root/.cache/puppeteer
EXPOSE 3000
CMD ["pnpm", "--filter", "@codevena/cvmake-web", "start"]
