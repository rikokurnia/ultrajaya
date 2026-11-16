# UltraOps application

Read [PROJECT_CONTRACT](docs/PROJECT_CONTRACT.md), [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) and [Agent 1 handoff](docs/handoffs/agent-1.md) before implementing another module.

```bash
npm ci
cp .env.example .env.local
# Fill SESSION_SECRET (32+ characters) and DEMO_PASSWORD (12+ characters).
npm run seed
npm run dev
```

All ten demo accounts use `<role lowercase>@ultraops.local` and DEMO_PASSWORD. `admin@ultraops.local` manages users. `auditor@ultraops.local` can inspect all module placeholders read-only. Existing workspace `.env.local` contains development credentials and is intentionally ignored. Never commit it.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Development component patterns: `/dev/components`. Business routes are honest module placeholders awaiting Agents 2–5. Search, notifications and recovery email are not connected.
