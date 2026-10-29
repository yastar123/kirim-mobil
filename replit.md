# Kirimmobil.com

Website informasi dan operasional pengiriman kendaraan antarkota dan antarpulau, dengan tarif, jadwal, dokumentasi publik, dan CMS khusus staf.

## Run & Operate

- `pnpm --filter @workspace/kirimmobil run dev` — run the website (managed web workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (managed API workflow)
- `pnpm run typecheck` — typecheck all workspace packages
- `pnpm run build` — typecheck and build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — apply schema changes to the development database

The Replit-managed PostgreSQL database is provisioned for the project; `DATABASE_URL` is supplied by Replit and must not be copied into `.env` or source code. The CMS uses one admin account. Store `KIRIMMOBIL_ADMIN_EMAIL` and `KIRIMMOBIL_ADMIN_PASSWORD` in Replit Secrets; the password must be at least 12 characters. `SESSION_SECRET` signs the HttpOnly admin cookie. Do not create or share a default password.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kirimmobil/src/App.tsx` — public and admin routes, page components, and generated API hooks
- `artifacts/kirimmobil/src/index.css` — global styles and site theme
- `artifacts/kirimmobil/public/` — logos, icons, and static media
- `artifacts/api-server/src/routes/website.ts` — public rates, schedules, gallery, content, and contact API
- `artifacts/api-server/src/routes/admin.ts` — admin CMS endpoints
- `lib/db/src/schema/` — PostgreSQL schema
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- Public API responses only include content that is explicitly published and approved.
- The rate estimator does not invent prices; unavailable routes return a request-a-quote message.
- Admin access uses one Replit-Secrets-configured email/password and an expiring signed HttpOnly cookie; the admin has access to every CMS module.
- Public uploads and private staff files use separate object-storage access policies.

## Product

Visitors can review published shipping rates and schedules, request route estimates, read service and document guidance, view approved delivery documentation, and find official contact details. The single admin manages this information through the authenticated CMS.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- A newly initialized database has no published business data, so the public site correctly shows empty states until staff add and publish confirmed rates, schedules, and content.
- Do not add invented rates, contact details, routes, testimonials, or delivery records.
- Re-run the managed API and web workflows after changing their environment configuration.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
