/**
 * The role catalogue (the demonstrator's persona policy, V25_PERSONAS, unchanged) — policy, not synthetic data. Loaded by the synthetic
 * seed in development and by the operator bootstrap (db/bootstrap.ts) in production. Idempotent: ON CONFLICT updates label, authorities
 * and description, so a policy change in the source reaches the database on the next load.
 */
import PERSONAS from '@empathia/domain-data/data/V25_PERSONAS.json' with { type: 'json' };
import type { PgConnection } from './pg.js';

const P = PERSONAS as unknown as Record<string, { label: string; authority: string[]; home: string }>;

export async function loadPolicy(owner: PgConnection): Promise<number> {
  await owner.query("INSERT INTO app.role (key, label, authorities, description) VALUES ('founder', 'Founder', ARRAY['founder.workspace'], 'The founder’s private workspace (Founder Studio). Carries no enterprise authority: it reads no customer records.') ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, authorities = EXCLUDED.authorities, description = EXCLUDED.description");
  for (const [key, v] of Object.entries(P)) await owner.query('INSERT INTO app.role (key, label, authorities, description) VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, authorities = EXCLUDED.authorities, description = EXCLUDED.description', [key, v.label, v.authority, v.home]);
  return Object.keys(P).length + 1;
}
