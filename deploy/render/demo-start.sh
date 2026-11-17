#!/bin/sh
# The demonstration API's start command (deploy/render/demo.render.yaml): the whole preparation, in order, on every start, then the API.
# A file, not a one-line `sh -c "… && …"`: Render did not pass a quoted compound command to the shell intact (17 Nov 2026, first deploy:
# "sh: 1: node … main.js: not found"). Each step must succeed for the next to run; the API replaces this shell.
set -e
node services/enterprise-api/dist/src/db/bootstrap.js --roles    # the runtime roles; gate V-1: refuses if the owner cannot create roles
node services/enterprise-api/dist/src/db/migrate.js              # migrations in file order, each recorded with its SHA-256
node services/enterprise-api/dist/src/db/demo.js enable          # sandboxes on, with the role catalogue
exec node services/enterprise-api/dist/src/main.js
