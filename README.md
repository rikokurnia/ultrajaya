# ultrajaya

Ultrajaya ERP frontend lives in **project/**. Original design/workflow references are in **mynotes/**. The retired SQLite implementation is preserved in **archive/sqlite/** and excluded from deployment.

```bash
cd project
npm ci
# Configure SESSION_SECRET using .env.example.
npm run dev
```

[Application setup and role accounts](project/README.md) · [Backend handoff](project/docs/BACKEND_HANDOFF.md) · [Deployment handoff](project/docs/handoffs/final-frontend.md)
