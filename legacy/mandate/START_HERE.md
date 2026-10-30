# Start here — Claude → Empathia live web edition

This is **a prompt package**, not a finished deployed web product. The build must be carried out in Claude Code or a Claude environment with real filesystem, terminal, test and browser/deployment tools. A plain conversational Claude chat without code execution can plan and draft, but cannot independently verify deployment or production readiness.

## Steps

1. Extract this ZIP and retain the two original HTML files. **Do not upload confidential secrets, actual customer data, internal credentials, or legal/investor materials to an unauthorized project.**
2. Create a Claude Code project/repository and attach or copy the two original files into a `legacy/source/` folder, unchanged.
3. Send `MASTER_PROMPT.md` as the governing instruction; tell Claude to use `SOURCE_AUDIT.json` to cross-check actual input files.
4. Require real file edits and command outputs, then use `PHASED_EXECUTION_PROMPTS.md` in order, beginning with Prompt 00. The master prompt is the full product design; stages are the execution work orders.
5. At each stage require `docs/BUILD_STATUS.md`, old→new parity ledger, screenshots, passing tests, build outputs, and remaining blockers.
6. Review staging before publishing. Never deploy with real credentials pasted into chat; provide secrets through authorized hosting/platform settings.
7. Set up domain/hosting accounts, identity provider and email/integration permissions only when the app reaches the relevant milestone.

## Critical source observation

The **uploaded live edition is not a real SaaS backend**: it is an investor-hosted demonstration with synthetic records and in-browser storage/role switching. Hosting it on a static server can make it accessible on the web, but the separate full-stack build is necessary to provide real users, persistence, forms, secure workflows and operational integrations.

## Recommended first release order

1. A visually excellent, actually hosted public website with validated lead forms.
2. A safe, synthetic, high-parity investor demo (no confidential code/production access).
3. A real authenticated persisted project/commissioning/Assurance vertical slice.
4. Gradual remaining module migration and verified connector integrations.

This reduces launch risk while preserving the complete platform vision.

## Success and non-success

Success is runnable source, schema migrations, real API calls, repeatable tests, actual browser screenshots and accurate feature-parity reporting. **A pretty AI screenshot, static landing page, synthetic backend 'success' message, generated architecture diagram or unexecuted deployment command does not count as a finished production website.**
