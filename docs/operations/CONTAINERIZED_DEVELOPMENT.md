# Containerized development

**Status: files exist and are statically validated; nothing has been built or run in containers.** The build environment has the Docker
CLI and Compose v5.5.1 but no Docker daemon and no image registry access, so image builds and `docker compose up` are **NOT_RUN**.
`docker compose config --quiet` (with placeholder values) passes, which checks syntax, interpolation and references only.

| File | Purpose |
|---|---|
| `docker-compose.yml` | postgres (16-alpine, roles from `database/docker/init-roles.sh`), api (seeds then serves on 4100), worker (integration worker), web (4200), intelligence (4300), optional `minio` under profile `s3` |
| `Dockerfile` | one Node 22 image for API, worker and web server: `pnpm install` then `node scripts/build.mjs`; runs as uid 10001 |
| `services/intelligence-python/Dockerfile` | Python 3.13 slim with pinned `requirements.txt`; runs as uid 10002 |
| `database/docker/init-roles.sh` | creates `empathia_owner` and the runtime role `empathia_app` (NOBYPASSRLS) and the database |
| `.env.example` | every variable; copy to `.env` and replace each `CHANGE_ME` |

```bash
cp .env.example .env        # set every CHANGE_ME; JWT_SECRET ≥ 32 random bytes
docker compose up --build   # NOT_RUN here
docker compose --profile s3 up minio   # optional; the API does not use S3 yet (S3ObjectStore is CONTRACT_ONLY)
```

All ports are published on 127.0.0.1 only. Known points to check on first real run: the `minio` image is `latest` and must be pinned to a
dated release tag; the API container seeds on every start (the seed is idempotent); the `web` container's CSP allows the API at
`http://127.0.0.1:4100`, which is correct only for a browser on the same host.
