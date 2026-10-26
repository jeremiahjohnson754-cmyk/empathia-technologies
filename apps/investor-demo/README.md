# apps/investor-demo — the Investor Experience (reference, not a copy)

The Investor Experience is the **frozen 2.5.3 rc3 investor package**. It is not rebuilt or copied here: the bytes stay where they were
frozen, and this folder records which bytes they are, so an investor package can never silently drift from the reviewed one.

| Item | Path (founder workspace) | SHA-256 |
|---|---|---|
| Package | `Empathia_V25/Empathia_Investor_Release_253_rc3/` (562 checksummed files, immutable attribute set) | per-file in `Release_Manifest/SHA256SUMS.txt` |
| Live web edition | `Live_Web_Edition/Empathia-Living-Campus-V2.5.3-live.html` | `9d6e53ef9f5a4e797b3be16c08f041b7c0c0766abbadb5186296ac925a09f2f1` |
| Offline investor edition | `Offline_Investor_Edition/Empathia-Living-Campus-V2.5.3-offline.html` | `ecbde0bba17eafc9e5bcf98b57d15fbbb2378bac66d017c7a402194e78307756` |

Unchanged as of the latest check: `releases/immutable-references/` (re-run `python3 -I scripts/verify/verify-frozen.py <Empathia_V25> out.json`).

**What it contains and does not:** a polished, simplified experience of the product on synthetic data. No source vault, no engineering-only
controls, no restricted technical evidence. It is a front-end demonstration of authorization, not production security.

**Films:** none may be added to an investor package today — the investor-safe media set is empty (`media/sets/README.md`).

**Distribution: NOT AUTHORIZED.** The external page-API security assessment remains NOT VERIFIED — EXTERNAL TEST REQUIRED, and the
owner's conditions are open. Only the founder can authorize external distribution.
