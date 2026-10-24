# Kirimmobil.com

Website informasi dan operasional pengiriman kendaraan antarkota dan antarpulau, dengan tarif, jadwal, dokumentasi publik, dan CMS khusus staf.

## Run & Operate

- `pnpm --filter @workspace/kirimmobil run dev` — run the website (managed web workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (managed API workflow)
- `pnpm run typecheck` — typecheck all workspace packages
- `pnpm run build` — typecheck and build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — apply schema changes to the development database

The Replit-managed PostgreSQL database and Clerk authentication are provisioned for the project. Do not paste database or Clerk credentials into source files. Set `KIRIMMOBIL_OWNER_EMAIL` to the owner's primary Clerk account email before using the staff CMS; that account is assigned the initial owner role when it first opens the staff area.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kirimmobil/src/App.tsx` — public and staff routes, page components, and generated API hooks
- `artifacts/kirimmobil/src/index.css` — global styles and site theme
- `artifacts/kirimmobil/public/` — logos, icons, and static media
- `artifacts/api-server/src/routes/website.ts` — public rates, schedules, gallery, content, and contact API
- `artifacts/api-server/src/routes/admin.ts` — staff CMS endpoints
- `lib/db/src/schema/` — PostgreSQL schema
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- Public API responses only include content that is explicitly published and approved.
- The rate estimator does not invent prices; unavailable routes return a request-a-quote message.
- Staff access is protected by Clerk and a database-backed role; the configured owner email bootstraps the first owner record.
- Public uploads and private staff files use separate object-storage access policies.

## Product

Visitors can review published shipping rates and schedules, request route estimates, read service and document guidance, view approved delivery documentation, and find official contact details. Staff manage this information through the authenticated CMS.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- A newly initialized database has no published business data, so the public site correctly shows empty states until staff add and publish confirmed rates, schedules, and content.
- Do not add invented rates, contact details, routes, testimonials, or delivery records.
- Re-run the managed API and web workflows after changing their environment configuration.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
