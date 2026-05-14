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
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages
COPY data ./data
RUN pnpm install --frozen-lockfile
# Puppeteer's bundled Chromium download for the build/runtime image.
RUN pnpm --filter @codevena/cvmake-core exec puppeteer browsers install chrome
RUN pnpm build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
COPY --from=build /root/.cache/puppeteer /root/.cache/puppeteer
EXPOSE 3000
CMD ["pnpm", "--filter", "@codevena/cvmake-web", "start"]
