# StarForge EDU — Staff Workspace

This frontend uses the bundled Fastify/Prisma staff API by default. It signs
staff in with `POST /api/auth/login` using username and password, and hides
every resource a staff role cannot open.

## Production setup

```bash
npm install
copy .env.example .env
npm run build
```

The production container proxies `/api` to the staff API. For local work, run
`npm run dev:local`; it starts Fastify on port 4000 and Vite on port 5173.

Staff sign in with their username and password. No demo records are used unless
mock mode is explicitly set.

## Role-aware workspaces

The client reads the signed-in staff profile from the API and shows only the
pages appropriate to the signed-in role:

- Teachers: students, groups, schedule, attendance, academics, assignments, and content.
- Cashiers and accountants: finance and payments; accountants also see reports.
- Librarians: students, groups, and content.
- Security, IT, registrars, support, and audit staff receive their permitted directory, attendance, audit, and reporting workspaces.

Managers, directors, heads of department, CEOs, owners, and other management
accounts are intentionally excluded from this staff product.

Every live workspace uses the backend's actual REST resource endpoint and
offers create/edit/delete only when the role matrix grants write access. The
dashboard derives its counts and interactive trend from the same resources, so
it does not invent analytic values when data is absent.

## Local compatibility stack

The bundled Fastify/Prisma server remains available for isolated local work:

```bash
npm run setup:local
npm run dev:local
```

`dev:local` explicitly switches the frontend to that server. It is not the
production default.

## Visual test data

Mock data is isolated to an explicit opt-in and must not be deployed:

```bash
VITE_DATA_SOURCE=mock npm run dev
```
