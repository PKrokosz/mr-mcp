FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS build
RUN corepack enable
COPY package.json pnpm-lock.yaml tsconfig.json vitest.config.ts eslint.config.js manifest.json ./
COPY src ./src
COPY tests ./tests
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM base AS runtime
RUN corepack enable
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/manifest.json ./manifest.json
EXPOSE 8765
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8765/healthz || exit 1
CMD ["node", "dist/server.js"]
