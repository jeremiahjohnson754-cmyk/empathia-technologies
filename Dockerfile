# Empathia production starter — one image for the Node processes (API, integration worker, web server).
# NOT_RUN in the build environment (no container runtime there). Expected to work on a machine with Docker and registry access.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
# a connected machine resolves the pinned devDependencies; the offline bootstrap is only for the founder's build sandbox
RUN pnpm install --no-frozen-lockfile && node scripts/build.mjs

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=development
COPY --from=build /app /app
RUN useradd --create-home --uid 10001 empathia && mkdir -p /app/.local /data/objects && chown -R empathia /app/.local /data/objects
USER 10001
EXPOSE 4100 4200
CMD ["node", "services/enterprise-api/dist/src/main.js"]
