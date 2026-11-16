<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UltraOps project entry point

All application code and commands belong in `project/`. Preserve `mynotes/` and its visual references.
Before changing the application, read `project/docs/PROJECT_CONTRACT.md`, `project/docs/DESIGN_SYSTEM.md` and `project/docs/handoffs/agent-1.md`. Respect module ownership and coordinate shared-contract/migration changes through Agent 6.
For all web browsing, use the gstack `/browse` skill. Never use `mcp__claude-in-chrome__*`. Invoke tools through native tool calls, not XML in chat.
