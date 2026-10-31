# Empathia — Render staging image (one image, two services: the API and the enterprise web app).
# Build on your own machine (no GitHub needed), push to a PRIVATE registry, deploy by digest. See docs/operations/RENDER_STAGING.md.
#   docker build --platform=linux/amd64 -f deploy/render/Dockerfile --build-arg RELEASE_SHA=$(git rev-parse HEAD) -t <registry>/empathia:<sha> .
# Status: NOT_RUN in the build sandbox (no container runtime there). The assembler step it relies on was verified locally.
#
# Build stage: install the pinned devDependencies, run the full build with every gate (type checks, OpenAPI and diagram checks, dist
# hygiene). Runtime stage: only the assembled runtime tree (deploy/render/assemble-runtime.mjs) — compiled JavaScript, migrations, the
# web app's static build; no TypeScript source, tests, docs, Founder Studio, demonstrators, .local or secrets.
FROM --platform=linux/amd64 node:22.22.0-bookworm-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
# Reproducibility: commit a pnpm-lock.yaml (pnpm install --lockfile-only on a connected machine) and this uses it frozen.
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    else echo "WARNING: no pnpm-lock.yaml — direct dependencies are pinned in package.json, transitive ones are not locked"; pnpm install --no-frozen-lockfile; fi
ARG RELEASE_SHA
RUN test -n "$RELEASE_SHA" || (echo "build with --build-arg RELEASE_SHA=\$(git rev-parse HEAD)" && exit 1)
ENV RELEASE_SHA=$RELEASE_SHA
RUN node scripts/build.mjs && node deploy/render/assemble-runtime.mjs --out=/out

FROM --platform=linux/amd64 node:22.22.0-bookworm-slim AS runtime
ARG RELEASE_SHA
ENV NODE_ENV=production RELEASE_SHA=$RELEASE_SHA HOST=0.0.0.0 WEB_HOST=0.0.0.0 OBJECT_STORE_DIR=/data/objects
WORKDIR /app
COPY --from=build /out /app
RUN useradd --create-home --uid 10001 empathia && mkdir -p /app/.local /data/objects && chown -R empathia /app/.local /data/objects
USER 10001
# Render sets PORT; the API reads PORT, the web server reads WEB_PORT or PORT. One image, two start commands:
#   API: node services/enterprise-api/dist/src/main.js          pre-deploy: node services/enterprise-api/dist/src/db/migrate.js
#   web: node apps/enterprise-web/server/serve.mjs
CMD ["node", "services/enterprise-api/dist/src/main.js"]
