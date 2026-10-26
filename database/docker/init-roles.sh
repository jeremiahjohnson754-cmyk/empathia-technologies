#!/bin/sh
# Container-only database initialisation (docker-compose.yml): the schema owner and the runtime role, as scripts/db.mjs creates them
# for the local cluster. The runtime role cannot bypass row-level security.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE empathia_owner LOGIN PASSWORD '${EMPATHIA_OWNER_PASSWORD}';
CREATE ROLE empathia_app LOGIN PASSWORD '${EMPATHIA_APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE DATABASE empathia OWNER empathia_owner;
REVOKE ALL ON DATABASE empathia FROM PUBLIC;
GRANT CONNECT ON DATABASE empathia TO empathia_app;
SQL
