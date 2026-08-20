# NYSC Staff E-Training Portal — Frontend

The web frontend for the National Youth Service Corps staff training portal.
Staff take courses, sit proctored assessments and download certificates;
administrators build the courses, enrol staff and monitor progress.

This repository is **frontend only**. All data lives in a separate Django
backend, which is maintained by someone else — see
[docs/operations.md](docs/operations.md) for which backend is which.

- **Framework** — Next.js 16.2.6 (App Router), React 19.2.4, TypeScript
- **Styling** — Tailwind CSS
- **Hosting** — Vercel
- **Backend** — Django REST Framework on Railway

## Running it locally

You need **Node 20+** (developed on 24) and **pnpm**.

```bash
pnpm install
cp .env.example .env.local     # then edit it, see below
pnpm dev                       # http://localhost:3000
```

### Environment

One variable, and the app refuses to start without it:

```
NEXT_PUBLIC_API_BASE_URL=https://web-test-1393.up.railway.app
```

There is deliberately no default. The only sensible fallback would be
production, and a test build quietly reading and writing the live database is
far worse than a build that will not start. `.env.example` lists the current
backends.

> **Logging in locally requires the backend to allow your address.** Login now
> goes straight from the browser to the backend, so `http://localhost:3000`
> must be in the backend's CORS allowlist. If login fails with "Failed to
> fetch", that is why — ask the backend developer to add it.

### Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build — run before pushing anything substantial |
| `pnpm start` | Serves the production build locally |
| `pnpm lint` | ESLint. The project is expected to lint clean |

Type-check with `npx tsc --noEmit`. Both that and `pnpm lint` should pass
before any commit.

> `pnpm gen:types` still points at a retired backend URL and should not be
> trusted until it is updated.

## Where things live

```
app/
  (auth)/          login, register, forgot-password, admin-login
  admin/           the administrator portal
  staff/           the learner portal
  api/             server-side proxy routes to the Django backend
  components/      shared UI
  lib/             data fetching, auth, types, formatting
proxy.ts           route guard (Next 16's renamed middleware)
public/            images, manuals, static assets
docs/              architecture and operations notes
```

`app/lib` is worth knowing:

| File | Purpose |
|---|---|
| `portal-api.ts` | Backend URL, shared types, response unwrapping |
| `api-proxy.ts` | Server-side proxy: attaches tokens, refreshes them |
| `auth-client.ts` | Browser-direct login (bypasses the proxy — see architecture) |
| `data-cache.ts` | Client-side GET cache |
| `staff-learning.ts` | Courses, enrolments, progress, assessments |

## Deploying

Vercel deploys automatically when `main` is pushed. There are **two projects**,
each pointing at a different backend — see
[docs/operations.md](docs/operations.md) before touching either.

## Read next

- [docs/architecture.md](docs/architecture.md) — the data model and why the
  auth layer is shaped the way it is. Read this before changing anything
  around courses, progress or login.
- [docs/operations.md](docs/operations.md) — environments, domains, and the
  known issues you will otherwise rediscover the hard way.
