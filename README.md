# ultrajaya

Next.js application: **`project/`**. Original analyst notes and visual references: `mynotes/`.

Start with the [current foundation design revision](project/docs/handoffs/foundation-design-revision.md), [Agent 1 handoff](project/docs/handoffs/agent-1.md), [project contract](project/docs/PROJECT_CONTRACT.md) and [design system](project/docs/DESIGN_SYSTEM.md). These define the frozen routes, ownership, permission boundaries, shared IDs, persistence and integration rules for Agents 2–6.

```bash
cd project
npm ci
# Configure .env.local using .env.example before seeding.
npm run seed
npm run dev
```
