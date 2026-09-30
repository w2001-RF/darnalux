# DarnaLux Mobile
Expo (SDK 54) + React Native + TypeScript app using `expo-router`. It shares domain and authorization rules from `@darnalux/core` and talks to the same Supabase project as the Web app.

Current scope (Phase 1 foundation): email/password sign-in, persisted session, role-aware home, profile and sign-out. Business modules arrive in later phases.

## Setup
1. Copy `.env.example` to `.env` in this folder and set the public Supabase URL and anon key. Never use the `service_role` key.
2. From the repo root: `pnpm install`, then `pnpm dev:mobile` (builds `@darnalux/core` first).
3. Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

## Checks
`pnpm --filter @darnalux/mobile typecheck`
