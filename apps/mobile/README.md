# DarnaLux Mobile
Expo (SDK 54) + React Native + TypeScript app using `expo-router`. It shares domain and authorization rules from `@darnalux/core` and talks to the same Supabase project as the Web app.

Current scope: the admin interface of the Web app on a phone, with the same roles and rules. The landing page is not part of the app.
- Bottom tabs: dashboard, reservations, tasks and requests (estimates, quotes, contact messages with e-mail and WhatsApp replies from templates), plus a "More" menu built from the shared role-aware menu in `@darnalux/core`.
- Screens reached from the menu: properties, owners, guests, calendar, check-in review, finance, marketing, notifications, support and profile.
- Not available on mobile yet (shown as "Disponible sur la version web"): documents, reports, import, contracts, verification settings, users, roles and audit.
- Data access comes from `@darnalux/data`, shared with the Web app; each app passes its own Supabase client to `configureData`. Business rules come from `@darnalux/core`.

## Setup
1. Copy `.env.example` to `.env` in this folder and set the public Supabase URL and anon key. Never use the `service_role` key.
2. From the repo root: `pnpm install`, then `pnpm dev:mobile` (builds `@darnalux/core` first).
3. Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

## Checks
`pnpm --filter @darnalux/mobile typecheck`

## Android 16 and later
- Build targets: React Native 0.81 compiles and targets API 36 (Android 16) by default; `minSdk` stays at 24, so older devices keep working.
- Edge-to-edge: Android 16 always draws behind the system bars and the opt-out is gone. Screens use `src/components/Screen.tsx`, which applies the status bar, navigation bar and cutout insets. Do not add screens that bypass it.
- Keyboard: edge-to-edge no longer resizes the window, so forms wrap their content in `KeyboardAvoidingView` with `padding` on every platform.
- Large screens: on displays of 600dp or more, Android 16 ignores orientation and resizability restrictions for apps targeting API 36. The app therefore allows any orientation and caps content width (`MAX_CONTENT_WIDTH`).
- Back gesture: predictive back is explicitly off (`predictiveBackGestureEnabled: false`) until it is tested on a device or emulator.
- Android 17 and later: when Expo and React Native support a newer API level, bump the compile and target SDK (via `expo-build-properties`) and re-check the behavior changes.

To test on Android 16, create an emulator from the `system-images;android-36;google_apis;x86_64` image, plus a tablet or resizable one to check large screens.
