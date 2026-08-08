# StarForge EDU — Staff Workspace

This frontend is production-oriented by default. It connects to the tenant
Django API in [starforge_edu](https://github.com/MythicalCosmic/starforge_edu),
uses its OTP + JWT authentication flow, and hides every resource a staff role
cannot open.

## Production setup

```bash
npm install
copy .env.example .env
npm run build
```

Set `VITE_API_BASE_URL` only when the SPA is served from a different origin
than the tenant backend. Requests use `/api/v1/` and must go to a configured
tenant domain (the backend resolves tenant context from the host).

Staff sign in with their work phone number or email and the one-time code sent
by the backend. No demo records are used unless mock mode is explicitly set.

## Role-aware workspaces

The client mirrors the backend role matrix and receives the signed-in user from
`/api/v1/users/me/`. Staff can see only the pages their role can access:

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
