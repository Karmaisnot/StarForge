# StarForge EDU backend

The Staff frontend and this Fastify + Prisma service are now one local stack.
The browser uses `/api`, Vite proxies it to port `4000`, and the API persists
all demo workspaces in SQLite instead of falling back to client mocks.

## Run locally

From the repository root:

```bash
npm run setup:local   # generates Prisma client, applies migrations, seeds SQLite
npm run dev:local     # Fastify on :4000 and Vite on :5173
```

Then open `http://localhost:5173` and sign in with password `demo1234`:

- `nigora.karimova` — teacher
- `sabrina.mamatova` — cashier (finance workspace)
- `timur.usmanov` — security officer (access-code scanner)
- `nilufar.rakhimova` — registrar (academic workspace)

The server's local configuration is in `server/.env`; copy `.env.example` if
it is missing. The local SQLite file is `server/prisma/dev.db`.

## Container run

```bash
docker compose up --build
```

Open `http://localhost:8080`. Compose starts the SPA, Fastify API and a
persistent SQLite volume. Set `STARFORGE_JWT_SECRET` before exposing it beyond
local development.

## API modules

- Core account, cohorts, attendance, cards, tasks, AI, print, surveys,
  management messages, notifications, materials, dashboard and navigation
  use typed Prisma models.
- Work, finance, people, academic and operations have validated, tenant-scoped
  persisted workspace endpoints. Writes such as requests, cash collection,
  publishing and rule acknowledgements survive reloads and restarts.
- Security scans validate a real student code and append an immutable
  `AccessScan` audit event.

Every authenticated route receives an identity and tenant context from a JWT;
role-sensitive endpoints enforce their allowed roles on the server as well as
in the interface.
