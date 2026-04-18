# Supabase + Discord Integration Design

**Date:** 2026-04-18  
**Status:** Approved

## Overview

Wire the BRACKET platform to a live Supabase backend. Replace all hardcoded mock data with real database reads/writes. Add Discord OAuth authentication. Enable real-time match updates via Supabase Realtime WebSockets. Migrate from the client-side screen-state machine to proper Next.js App Router routes for scalability.

---

## 1. Routing & App Structure

Replace `app/page.tsx` screen-state machine with real Next.js App Router routes.

```
app/
  page.tsx                        → redirect: authed → /dashboard, unauthed → /login
  login/page.tsx                  → LoginPage (server component, public)
  auth/callback/route.ts          → Discord OAuth code exchange → session → redirect /dashboard
  (app)/
    layout.tsx                    → shared layout: Sidebar + DashboardLayout (auth-gated)
    dashboard/page.tsx            → throwdowns grid (server component)
    throwdown/[id]/page.tsx       → bracket + live matches (server shell + client realtime)
    archive/page.tsx              → match archive (server component)
    admin/page.tsx                → match management (server, is_admin-gated)
  middleware.ts                   → session refresh + auth redirect on every request
```

`<Sidebar>` and `<DashboardLayout>` become the `(app)/layout.tsx` shared wrapper. All internal navigation uses `next/link` / `useRouter` — no more `setScreen` prop drilling.

---

## 2. Supabase Client Setup

Three client entry points:

| File | Context | Usage |
|---|---|---|
| `lib/supabase/server.ts` | Server components, route handlers | `createServerClient()` with Next.js `cookies()` |
| `lib/supabase/client.ts` | Client components, realtime hooks | `createBrowserClient()` singleton |
| `lib/supabase/middleware.ts` | `middleware.ts` root | `createServerClient()` with cookie read/write for session refresh |

**Required environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://gqfxtzpecclnfuklqljb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
```

**Package additions:**
```
@supabase/supabase-js
@supabase/ssr
```

---

## 3. Discord OAuth Authentication

**Flow:**
1. Login page renders a "Continue with Discord" button (client component)
2. Button calls `supabase.auth.signInWithOAuth({ provider: 'discord', redirectTo: '/auth/callback' })`
3. User authorizes on Discord → Supabase exchanges token → issues JWT session
4. `app/auth/callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)`, sets session cookies, redirects to `/dashboard`
5. Supabase trigger `on_auth_user_created` → `handle_new_user()` auto-creates a `profiles` row on first login — no manual upsert needed

**Middleware** (`middleware.ts` at project root):
- Runs on every request
- Refreshes session cookie if expired
- Redirects unauthenticated users to `/login` for all `(app)` routes
- Redirects non-admin users away from `/admin` (checks `profiles.is_admin`)

**Discord app details:**
- Application ID: `1477720385427607665`
- Redirect URL configured in Supabase: `https://gqfxtzpecclnfuklqljb.supabase.co/auth/v1/callback`

---

## 4. Data Fetching

### Schema mapping

| UI concept | Supabase table | Key fields |
|---|---|---|
| Tournament event | `throwdowns` | `id`, `title`, `status`, `ends_at` |
| Match | `matches` | `id`, `throwdown_id`, `round`, `position`, `submission_a_id`, `submission_b_id`, `winner_id` |
| Barista entry | `submissions` | `id`, `throwdown_id`, `profile_id`, `image_url` |
| User | `profiles` | `id`, `discord_id`, `username`, `avatar_url`, `is_admin` |

### Server-fetched data (per route)

| Route | Query |
|---|---|
| `/dashboard` | `throwdowns` ordered by `created_at desc` |
| `/throwdown/[id]` | `matches` for that `throwdown_id`, initial snapshot |
| `/archive` | `matches` where `winner_id IS NOT NULL`, joined `submissions → profiles` |
| `/admin` | `matches` for selected throwdown, joined `submissions` |

Server components pass initial data as props to client components. No loading state on first paint.

---

## 5. Realtime Updates

Client components subscribe to Supabase Realtime on mount and unsubscribe on unmount.

**Channel pattern:**
```ts
supabase
  .channel(`throwdown-${id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'matches',
    filter: `throwdown_id=eq.${id}`
  }, handler)
  .subscribe()
```

**Realtime client components:**

- `<LiveMatchCard>` — subscribes to `matches` with `winner_id IS NULL` for a throwdown; updates elapsed time and status in real time
- `<BracketView>` — subscribes to all match changes for a throwdown; re-renders bracket tree when `round`, `position`, or `winner_id` changes

Transport: WebSockets via Supabase Realtime. No polling.

---

## 6. Admin Match Management

Access gated by `profiles.is_admin = true`, enforced in middleware.

### Random pairing

1. Fetch all `submissions` for the selected throwdown
2. Validate count is even — block "Generate Matches" button and show error if not
3. Shuffle submissions using Fisher-Yates with `crypto.getRandomValues()` (cryptographically secure)
4. Pair sequentially: `[0,1]`, `[2,3]`, …
5. Auto-assign `round = 1` (or next round if matches already exist), `position = 1…n/2`
6. Bulk insert all pairs into `matches` in a single Supabase call

### Admin capabilities

- View all matches for a throwdown, grouped by round
- Generate random pairings (even-count enforced)
- Edit a match: swap a submission or record a winner (`winner_id`)
- Delete a match

Setting `winner_id` on a match is the trigger that realtime subscribers pick up — bracket and live cards update instantly across all connected clients.

---

## Out of Scope

- Throwdown creation/management (handled outside this app or via Supabase dashboard)
- Mobile push notifications
- Submission upload (image upload flow for baristas)
- Pagination on archive (future)
