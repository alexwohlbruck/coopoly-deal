FROM oven/bun:1 AS base

# -- Build frontend --
FROM base AS frontend-build
WORKDIR /app/client
COPY client/package.json client/bun.lock* ./
RUN bun install --frozen-lockfile
COPY client/ ./
RUN bun run build

# -- Build server --
FROM base AS server-build
WORKDIR /app/server
COPY server/package.json server/bun.lock* ./
RUN bun install --frozen-lockfile --production
COPY server/ ./

# -- Final image --
FROM base
WORKDIR /app

COPY --from=server-build /app/server ./
COPY --from=frontend-build /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "src/index.ts"]
