# The hosted recovery drill (point-in-time recovery on Render): runbook, cost, deletion

Founder, 17 Nov 2026, 14:06: "I'd approve a controlled test after the permission-recovery process is documented and the additional
database's cost and deletion procedure are established. A second billed database is reasonable for a short, deliberate recovery
test, but it must be isolated and deleted after the evidence is captured. No production data should be overwritten." And: "the
8.6-second recovery result is a local workstation result. It doesn't include provisioning a database on Render, redirecting the
API, redeploying, and proving the complete application works after a hosted failure. That's the next level of evidence."

**Status: not run.** This document is the two preconditions. The drill starts only when the founder says go after reading it.

| Precondition | State |
|---|---|
| The permission-recovery process is documented | `docs/operations/DATABASE_PRIVILEGES.md` (17 Nov). Built, tested and rehearsed; not yet deployed |
| The additional database's cost and deletion procedure are established | this document |
| The release that carries the fail-safe start has passed its full regression | in progress on `a05fdcb` (17 Nov) |

## What it proves that the workstation drill could not

1. Render creates a database instance from its continuous backup, at a chosen time.
2. A service is pointed at it and deploys.
3. The whole application works on it: the deployment check, the edge check and the two-browser check, through public addresses.
4. Whether a point-in-time recovery keeps privileges (expected, since it is a physical copy; **not known until this runs**). If it
   does not, the service will answer `unhealthy`, and the repair is exercised in the platform's shell for the first time.
5. Real times: from the click to the instance being available, and from there to the first good answer.

## Isolation

Nothing existing is changed. The staging database `empathia-demo-db-l04n` is only read by the platform's recovery; the staging API
`empathia-demo-api-l04n` keeps running on it and is not redirected. Production is not involved at all. The drill uses two
resources of its own, both deleted at the end:

| Resource | Made by | Plan |
|---|---|---|
| `empathia-demo-db-drill`: the recovered database | the founder, on the staging database's **Recovery** page (*Restore Database*, a time, *Copy Existing Settings*) | the source's: `0.1c-256mb`, 1 GB |
| `empathia-demo-api-drill`: a second API, reading its database from that instance | a Blueprint of its own (`deploy/render/demo-drill.render.yaml`, to be written before the drill and checked by the validator), synced by the founder | `0.5c-512mb` |

## Cost

Render's list prices, read on 17 Nov 2026: the database plan is $6.00 a month plus $0.30 per GB of storage a month; the web service
plan is $7.00 a month; both are charged by the second while they exist. The recovery page does not state what a recovery instance
costs; with *Copy Existing Settings* it has the source's plan and storage. **The founder reads the figure the dashboard shows
before clicking, and that figure is the one that counts.**

| If the two exist for | Database | Web service | Together, about |
|---|---|---|---|
| 2 hours (the plan) | $0.02 | $0.02 | **$0.04** |
| 24 hours (forgotten for a day) | $0.21 | $0.23 | **$0.44** |
| a month (never deleted) | $6.30 | $7.00 | **$13.30** |

Nothing else is created. No plan is changed on anything that exists.

## Deletion

Both resources are deleted by the founder in the dashboard (there is no tool here that can delete either): the service's
**Settings → Delete Web Service**, then the database's **Settings → Delete Database**. Deleting the recovered instance deletes its
data and its own backups; the staging database and its backups are untouched. Afterwards, from here: both names are absent from
the workspace's lists of services and databases, and the staging API still answers on the same release. The drill is not reported
as finished until that check has been made and recorded.

A limit to set before starting: **if the drill has not finished within three hours of the recovery being triggered, the founder
deletes both resources anyway** and the drill is reported as stopped, with what was captured.

## The steps

| | Who | What |
|---|---|---|
| 1 | here | `recovery-drill.mjs mark`: a marker in a sandbox of its own, through the staging API. Wait at least eleven minutes (a recovery cannot be asked for within ten minutes of now). `mark-after`: a second marker |
| 2 | the founder | *Restore Database* to a time between the two markers, named `empathia-demo-db-drill`, *Copy Existing Settings*. The time of the click is the start of the clock |
| 3 | here | read the instance's state until it is available: the first measured time |
| 4 | the founder | sync the drill Blueprint: the second API deploys, reading its database from the recovered instance |
| 5 | here | the second API's `/health`: `ok`, or `unhealthy`. If unhealthy: the founder runs the repair in that service's shell (`DATABASE_PRIVILEGES.md`); that is recorded as a finding and a measured step |
| 6 | here | on the second API: the deployment check, the edge check, the two-browser check against a build of the demo that points at it (served here under the site's address, as before); `recovery-drill.mjs check`: the first marker present, the second absent |
| 7 | here | the staging API: still healthy, same release, still holding the second marker |
| 8 | the founder | delete the second API, then the recovered database |
| 9 | here | confirm both are gone; record the times, the loss boundary, the cost shown by the dashboard, and every finding |

## What will be reported

Recovery point objective as exercised (the chosen time against the two markers), recovery time by step, whether privileges
survived, every check's result, what the platform charged, and that both resources no longer exist. Anything not run is reported
as not run.
