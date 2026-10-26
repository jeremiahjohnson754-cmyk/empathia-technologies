# Disaster recovery

**No recovery objectives have been agreed and no recovery has been tested beyond the local backup drill.** The figures below are proposed
targets for the owner to accept or change; they are not claims about the current system.

| Scenario | Proposed target | What exists | Gap |
|---|---|---|---|
| Database loss | RPO ≤ 5 min (PITR), RTO ≤ 4 h | logical dump/restore drill PASS locally (`BACKUP_AND_RESTORE.md`) | managed PITR, cross-region replica, timed restore of a realistic size |
| Evidence object loss | RPO 0 for stored evidence, RTO ≤ 4 h | content-addressed files; hash re-check on read detects loss/corruption | versioned, object-locked, replicated bucket (S3 adapter not implemented) |
| Region outage | RTO ≤ 24 h | stateless API and workers; images reproducible from source | second-region deployment plan, DNS failover |
| Secret compromise | rotate within 1 h | person disable / membership removal effective immediately; secret rotation by restart | secrets manager, OIDC |
| Corrupt deployment | rollback ≤ 30 min | — | image digests, previous release retained, forward-only migrations |

Principles: restore beside, never over; verify RLS, triggers and row counts after any restore (the drill script does this); append-only
records are never "repaired" by editing — corrections are new records; nothing is deleted during an incident (evidence preservation).
Run a recovery exercise per quarter once an environment exists.
