# Ultrajaya ERP

Next.js frontend for Revenue (Pendapatan), Expenditure (Pengeluaran), Production (Produksi), and Payroll (Penggajian). The backend team owns Supabase, real authentication, authorization enforcement, and durable business persistence.

## Run locally

```bash
cd project
npm ci
cp .env.example .env.local
# Set SESSION_SECRET to a random string with at least 32 characters.
npm run dev
```

No database, migrations, seed command, or Supabase credentials are required. Existing `.env.local` may be kept; database-related variables are unused.

## Access

The login screen lists five frontend role identities. All use `Ultrajaya2026!`:

| Role | Email |
| --- | --- |
| System Admin | admin@ultrajaya.local |
| Operations Staff | operations@ultrajaya.local |
| Finance Staff | finance@ultrajaya.local |
| HR & Payroll Staff | hr@ultrajaya.local |
| Manager / Approver | manager@ultrajaya.local |

The dashboard and topbar can switch between these identities. This is frontend role preview, not production authentication. Settings changes are stored only in that browser. Cycle edits currently stay in React state and reset on reload. Do not enter real employee, banking, customer or commercial data.

Business access is explicit by role + cycle + duty. System Admin receives administration only. QC, individual salaries and full bank details are separately assigned. See [backend handoff](docs/BACKEND_HANDOFF.md) before connecting real services.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Deployment

Vercel project: `rikokurnias-projects/ultrajaya`. Root Directory: `project`. Framework: Next.js. Node: 26.x. Build: `npm run build`. Set a unique `SESSION_SECRET` in Production and Preview. No DATABASE_PATH or Supabase key is used by this release. Never expose a Supabase service-role key to the frontend.

The repository root contains the original workflow and image references in `mynotes/`; the earlier SQLite implementation is preserved under `archive/sqlite/` and excluded from deployment. Its migrations and scripts are historical, not part of this application.

[Backend connection contract](docs/BACKEND_HANDOFF.md) · [Deployment handoff](docs/handoffs/final-frontend.md)
