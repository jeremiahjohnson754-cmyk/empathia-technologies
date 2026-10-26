/**
 * Data the studio build generates from records (scripts/build-data.mjs). Imported into the bundle so the studio also works when
 * opened straight from disk. Nothing in these files is typed by hand.
 */
import filmsJson from '../generated/films.json';
import mediaJson from '../generated/media.json';
import docsJson from '../generated/docs.json';
import sourceJson from '../generated/source.json';
import releasesJson from '../generated/releases.json';
import buildJson from '../generated/build.json';
import diagramsJson from '../generated/diagrams.json';
import vaultJson from '../generated/vault.json';

export interface Film {
  key: string; title: string; series: string; about: string; file: string;
  found: boolean; path?: string; width?: number; height?: number; durationS?: number; bytes?: number; sha256?: string;
  videoCodec?: string; audioCodec?: string; rightsStatus: string; ledgerAssetId?: string | null; distribution: string;
}
export interface MediaRow { title: string; kind: string; role: string; path: string; width: number | null; height: number | null; durationS: number | null; bytes: number; sha256: string; rightsStatus: string; probe: string }
export interface Doc { id: string; title: string; group: string; path: string; classification: string; sha256: string; html: string; words: number }
export interface SourceFile { id: string; title: string; path: string; language: string; sha256: string; lines: number; why: string; content: string }
export interface Release { package: string; entries: number; mismatches: number; immutable: boolean; editions: Record<string, string> }
export interface Diagram { id: string; title: string; about: string; source: string; svg: string; mermaid: string }
export interface VaultRecord { id: string; title: string; classification: string; path: string; about: string; status: string }

export const FILMS_DATA = filmsJson as unknown as Film[];
export const MEDIA = mediaJson as unknown as { summary: Record<string, number>; videos: MediaRow[]; audioCount: number; manifestPath: string };
export const DOCS = docsJson as unknown as Doc[];
export const SOURCES = sourceJson as unknown as SourceFile[];
export const RELEASES = releasesJson as unknown as { checkedAt: string; result: string; packages: Release[]; archives: Array<{ archive: string; match: boolean }> };
export const BUILD = buildJson as unknown as { builtAt: string; commit: string; founderEdition: { file: string; sha256: string; sourceCommit: string; branch: string; bytes: number } | null; engine: string };
export const DIAGRAMS = diagramsJson as unknown as Diagram[];
export const VAULT = vaultJson as unknown as VaultRecord[];
