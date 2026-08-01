# StarForge EDU

## Working local stack

```bash
npm install
npm run setup:local
npm run dev:local
```

Open `http://localhost:5173`. The frontend is configured for the Fastify +
Prisma API bundled in `server/`; it does not use browser-only demo state.

For a containerised run instead:

```bash
docker compose up --build
```

Open `http://localhost:8080`.

All demo accounts use password `demo1234`:

- `nigora.karimova` — teacher
- `sabrina.mamatova` — cashier
- `timur.usmanov` — security officer
- `nilufar.rakhimova` — registrar

Set `VITE_DATA_SOURCE=mock` only for isolated visual work. The default local
development and production builds use the real local API.
