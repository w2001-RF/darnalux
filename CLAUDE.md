# DarnaLux Project Memory for Claude Code

## Project Purpose
DarnaLux is a single-organization concierge operations platform. It manages DarnaLux's properties, owners, reservations, guests, field operations, finance, documents, marketing, and reporting. Do not design the MVP as a multi-tenant SaaS.

## Non-Negotiable Architecture
- Preserve the existing monorepo and its technologies. Do not migrate the Web app to Next.js.
- Web: React + TypeScript + Vite + React Router, shipped as a static SPA. It must work on GitHub Pages and remain deployable to Vercel without a functional rewrite.
- Mobile: Expo + React Native + TypeScript, planned for a later phase.
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions).
- Shared domain/business rules belong in `packages/core`; keep it framework- and platform-independent. It must not import React, React Native, browser/DOM APIs, Vite, Expo, or Supabase clients/UI.
- Intended dependency direction: Web/Mobile/Edge adapters -> `@darnalux/core`; do not create circular dependencies or duplicate business rules in clients.
- Keep UI components free of business logic and direct SQL. Put data access behind focused services/repositories as the application grows.
- Keep GitHub Pages SPA support intact: retain `BrowserRouter`, Vite's relative base configuration, and `apps/web/public/404.html` plus its path restoration script in `apps/web/index.html`.

## Product and Security Rules
- Organization is DarnaLux only. Initial roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `TEAM_MEMBER`, `OWNER`.
- Centralize frontend authorization in `@darnalux/core`; frontend checks are UX only. PostgreSQL RLS is the real security boundary.
- Never authorize from user-editable `user_metadata`.
- Never expose Supabase `service_role`, third-party credentials, or server secrets to Web/Mobile. Browser config may contain only public Supabase URL and anon/publishable key.
- Keep sensitive documents private and use least-privilege access.
- New accounts must not receive elevated roles automatically. Role assignment must be explicitly authorized and protected against self-escalation.
- Use SECURITY DEFINER functions only when required for RLS recursion/privilege boundaries; pin `search_path`, restrict EXECUTE grants, and review function owner and body.
- Never claim an external integration is connected unless a real, authorized integration exists. Use explicit interfaces/mocks when needed.
- No fake production data. Demo data must be explicitly labeled and separated from live data.

## Current Repository State (verified 2026-09-30)
- Workspace: `apps/*` and `packages/*`, managed by pnpm; package manager pinned as `pnpm@10.15.0`.
- Root scripts: `pnpm dev:web`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Web package: `apps/web`, Vite config uses `base: './'` and root env directory (`envDir: '../../'`). Supabase browser client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Shared package: `packages/core`, package name `@darnalux/core`. Its build must emit both JS and declaration files; its tsconfig overrides inherited `noEmit` with `noEmit: false`.
- Supabase CLI structure: `supabase/config.toml`, `supabase/migrations/`, `supabase/functions/`, `supabase/seed/`.
- Phase 1 local files include auth/profile/role/permission types and helpers, React auth context/pages, a migration for `profiles`, `roles`, `permissions`, `user_roles`, `role_permissions`, seed mappings, and RLS policies. Inspect current files before relying on these details.
- Supabase project was explicitly identified as `darnalux` (`fxonkqheleesdzanfdau`, `eu-west-1`) and linked in local Supabase CLI state at one point. This alone does NOT prove the current remote schema matches local migrations or that the migration was applied.
- A remote security-advisor command previously returned no issues, but that is not a full schema/RLS/auth audit. Do not represent the remote database as fully validated without fresh evidence.
- A database password was exposed in a prior conversation. Never repeat, commit, or store it. Confirm it has been rotated before any future credential-dependent work. Obtain secrets only from the user directly in their terminal/approved secret manager; never ask them to paste secrets into chat.

## Phase Discipline
Work in explicit phases; implement only the phase the user authorizes. Current planned sequence:
1. Foundation/tooling
2. Auth, users, profiles, roles, permissions, RLS
3. Owners
4. Properties
5. Reservations
6. Calendar
7. Tasks
8. Guests/check-in/check-out
9. Finance
10. Documents
11. Owner portal
12. Dashboard/analytics
13. Marketing
14. OTA adapters
15. Notifications
16. Mobile
17. Offline
18. Production hardening

Before a phase: inspect the current repository, instructions, dependencies, tests, and owning code path. Do not recreate existing work or begin later-phase features. For database changes, add a new timestamped migration; never rewrite a migration that may already have been applied.

## Dependency and Infrastructure Policy
- Root `.npmrc` configures the Orange npm proxy: `https://repos.tech.orange/artifactory/api/npm/npmproxy/`. Keep dependency resolution on approved Orange infrastructure; do not silently fall back to public npm/PyPI/Maven/Docker registries.
- Do not add/update dependencies unless required. Use the workspace's existing package manager and lockfile.
- Do not run `pnpm approve-builds` automatically. Review the package/build-script requirement and ask for approval before enabling scripts.
- Preserve the current static Vite deployment and GitHub Pages workflow. Do not add SSR, a production Node server, API routes, or server actions.

## Supabase Safety
- Treat remote database operations as read-only unless the user explicitly requests a specific write/deployment action.
- Never run `supabase db push`, `supabase migration up`, `supabase db reset`, `supabase start`, or destructive SQL as part of an audit.
- For remote audits, verify the linked ref before querying. Never guess or link another project.
- Distinguish local migration files from remote applied state. A local migration does not mean it has been deployed.
- Avoid dumping personal/auth data. Prefer targeted catalog/metadata queries; redact sensitive values from output.

## Validation Commands
Run relevant checks after changes; report failures and environment blockers plainly:

```powershell
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

For Web development: `pnpm dev:web`. Root scripts currently use recursive pnpm commands; do not assume Turbo is driving them just because `turbo.json` exists.

Supabase local DB validation may require Docker. Do not start local Supabase when the user has specified remote-only validation.

## Implementation Quality
- TypeScript strict mode; avoid `any`.
- Prefer small, focused changes and existing project patterns.
- Preserve public APIs and unrelated/user changes. Never reset/revert user work without explicit authorization.
- Add focused tests for pure core rules, especially authorization, calculations, and state transitions.
- Keep comments short and only for behavior that is not obvious from code.
- Do not create documentation files unless requested. This `CLAUDE.md` exists because the user explicitly requested Claude Code memory.
- Final reports should state implemented scope, files changed, executed checks/results, and anything not verified.
