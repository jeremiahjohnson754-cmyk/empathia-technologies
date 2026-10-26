# Empathia IP and software provenance vault

> This dossier organizes evidence for review by qualified counsel. It does not establish ownership, copyright registration, patentability or freedom to operate.

Classification: **RESTRICTED_IP** (founder and counsel; need-to-know). Not part of any investor, customer or public package. It contains personal data (git author names and e-mail addresses).

## Contents

| Path | What it holds | How it is produced |
|---|---|---|
| `AI_ASSISTANCE_RECORD.md` | What was generated with AI assistance (Claude), under whose direction, what the repositories evidence and what they cannot | written from the git histories |
| `CLASSIFICATION.md`, `CLASSIFICATION.csv` | Every monorepo area, release package, edition and media set in one of PUBLIC / INVESTOR_DISCLOSABLE / CONFIDENTIAL_TECHNICAL / INTERNAL_ONLY / RESTRICTED_IP / THIRD_PARTY_LICENSED | generated from `scripts/classification.json` |
| `source-manifest/SOURCE_MANIFEST.json`, `SOURCE_MANIFEST_SUMMARY.md` | Every git-tracked monorepo file at HEAD: path, bytes, SHA-256 of the committed content, git blob id, last commit, classification | generated |
| `source-manifest/GIT_HISTORY.json` | Full commit logs (hash, author, dates, subject, co-author and session trailers, files changed) and tags of the monorepo and the demonstrator repository; author/date summaries of the V1.4 line, the Onboard repository and the media-rights repository | generated (read-only `git log`) |
| `sbom/empathia-sbom.cdx.json` | CycloneDX 1.5 SBOM of what is actually used: bundled JavaScript, Python service and prototype dependencies (with transitive requirements), database and runtimes, development tooling | generated |
| `sbom/PYTHON_IMPORTS.json` | Every module imported by the repository's Python files, and where | generated |
| `licenses/THIRD_PARTY_LICENSES.md` | Licences and obligations by scope | written from the SBOM |
| `licenses/texts/`, `licenses/LICENSE_TEXT_INDEX.json` | Licence texts found on disk next to each component (with hashes); NOT_FOUND listed | generated (copied) |
| `licenses/REDISTRIBUTION_RESTRICTIONS.md` | What may not leave the founder's control: software, frozen releases, historical copies, media (rights ledger state), names, personal data | written |
| `chain-of-title/CHAIN_OF_TITLE_CHECKLIST.md` | 16 chain-of-title items with evidence, gaps and status; ownership ambiguities flagged | written |
| `invention-disclosures/` | Five factual invention-disclosure records (attorney-review material; no novelty or patentability opinion) | written from the code and git history |
| `release-history/RELEASE_LINEAGE.md`, `.json` | Frozen releases with edition hashes, tags, archive hashes, distribution status; 2.5.4 development build; historical copies by id and hash | generated |
| `release-history/FROZEN_CHECK_VAULT.json` | Raw result of the frozen-release integrity check run for this vault | `scripts/verify/verify-frozen.py` |
| `VAULT_INDEX.json` | Every vault file with bytes and SHA-256, and a tree hash | generated last |

## Regenerate

```sh
python3 -I provenance/scripts/build_vault.py          # manifest, git histories, SBOM, licence texts, classification
python3 -I scripts/verify/verify-frozen.py /home/claude/Empathia_V25 provenance/release-history/FROZEN_CHECK_VAULT.json
python3 -I provenance/scripts/release_lineage.py      # release lineage from the check, the tags and the 2.5.4 record
python3 -I provenance/scripts/index_vault.py          # VAULT_INDEX.json (run last)
```

The scripts only read the repositories (`git ls-tree`, `cat-file`, `log`, `for-each-ref`) and the release folders; they write only inside `provenance/`. `.local/` (database cluster, credentials, secrets) is never read.

## What a reviewer should read first

1. `chain-of-title/CHAIN_OF_TITLE_CHECKLIST.md` — the five flagged ambiguities at the end.
2. `AI_ASSISTANCE_RECORD.md`.
3. `licenses/REDISTRIBUTION_RESTRICTIONS.md`.
4. `invention-disclosures/README.md`.

## Not established by this vault

Ownership of any work; copyright subsistence or registration; patentability or novelty; trademark availability; freedom to operate; the rights in any third-party media; the absence of employer or client claims. Each is marked for counsel or for the founder to supply.
