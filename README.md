# StarForge EDU — Staff Workspace

The staff and teacher web application for the StarForge tenant API. It uses the
same warm editorial design language as the leadership console, while exposing
only staff-native permissions and branch/department scope.

## What is connected

- Opaque HttpOnly browser sessions with CSRF protection. No bearer credential is
  stored in `localStorage`, `sessionStorage`, or application state.
- Backend-authoritative admission through `/api/v1/org/app-status/`: teacher and
  staff principals are accepted; CEO, owner, director, head-of-department,
  manager, admin, student, and parent accounts are rejected.
- 33 permission-aware workspaces and 118 real API collections covering every
  current staff permission family: teaching, people, CRM, work, finance,
  operations, compliance, access, reporting, and more.
- Create, edit, and delete controls appear only when both the OpenAPI contract
  and the current account's effective write permission allow them. The backend
  remains authoritative for scope and validation.
- Same-origin `/api` and `/ws` proxying for Vite, Netlify, and the production
  Nginx image. This avoids CORS-only deployments and keeps cookie auth reliable.

The API catalogue is checked against the backend's generated OpenAPI snapshot:

```bash
npm run contract:check
```

When the sibling `starforge_edu` backend changes, refresh the snapshot and check
the catalogue:

```bash
npm run contract:sync
npm run contract:check
```

## Local connected development

```bash
npm ci
npm run dev
```

`.env.development` sends browser requests to same-origin `/api`; Vite proxies
them to the configured HTTPS tenant backend. To use a different verified
backend, set `VITE_API_PROXY_TARGET` in an uncommitted `.env.development.local`.

For ngrok, start the app and tunnel port 5173:

```bash
npm run tunnel
ngrok http 5173
```

All rotating `*.ngrok-free.app` hostnames are accepted by Vite, so a new tunnel
does not require a source change.

## Netlify

`netlify.toml` builds `dist`, proxies `/api/*` before the SPA fallback, keeps the
browser/API session same-origin, and adds private-app security and cache headers.
The production build rejects any `VITE_API_BASE_URL`, preventing an accidental
cross-origin deployment.

## Container deployment

The Nginx image requires one verified HTTPS upstream:

```bash
API_UPSTREAM=https://tenant-api.example.com docker compose up --build
```

The app is then available at `http://127.0.0.1:8080`. The container runs as an
unprivileged user with a read-only filesystem and proxies both REST and
WebSocket traffic.

## Validation

```bash
npm run check
```

This runs lint, unit tests, the API catalogue check, and the production build.

The `server/` directory remains only as a legacy isolated prototype. Production,
Netlify, ngrok, and normal development all use the Django tenant API contract.
