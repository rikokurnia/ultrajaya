<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UltraOps foundation

Read docs/PROJECT_CONTRACT.md, docs/DESIGN_SYSTEM.md and docs/handoffs/agent-1.md before editing. Follow their route, permission, fixture and migration ownership boundaries. Application commands run in this directory (`project/`). Original references are in ../mynotes/layout-images/.

## Current deployed architecture

Read docs/BACKEND_HANDOFF.md and docs/handoffs/final-frontend.md first. The application is database-independent and uses five roles with cycle/duty assignments. The previous SQLite implementation is archived outside this application under ../archive/sqlite/ and excluded from deployment. Do not restore historical seed/migration commands or old roles into the active frontend.
