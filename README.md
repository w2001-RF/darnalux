# DarnaLux

Production-oriented monorepo for the DarnaLux concierge platform.

## Current foundation
- Web: React + Vite + TypeScript
- First deployment: GitHub Pages
- Future Web deployment: Vercel
- Mobile: Expo/React Native
- Backend: Supabase
- Shared business logic: `@darnalux/core`
- CI/CD: GitHub Actions

## Run locally
```bash
corepack enable
pnpm install
pnpm dev:web
```

Build the static web app:
```bash
pnpm --filter @darnalux/web build
```

The root `/` is a responsive DarnaLux landing page. `/app` contains the initial authenticated-area visual shell used as the dashboard foundation.

## Next implementation layers
1. Add Supabase migrations and RLS.
2. Add Supabase client/auth provider.
3. Replace demo dashboard data with repository/use-case calls from `@darnalux/core`.
4. Implement mobile screens consuming the same core package.
5. Add Edge Functions for privileged integrations/webhooks.
6. Add Vercel production deployment while retaining the same static build compatibility.
