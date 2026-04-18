# Supabase + Discord Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the BRACKET platform to a live Supabase backend with Discord OAuth, real-time match updates, and proper Next.js App Router routing, replacing all hardcoded mock data.

**Architecture:** Migrate from the client-side screen-state machine to Next.js App Router routes with server components fetching initial data and client components subscribing to Supabase Realtime WebSockets. Auth is handled via `@supabase/ssr` cookie-based sessions with Discord OAuth through Supabase Auth.

**Tech Stack:** `@supabase/supabase-js`, `@supabase/ssr`, `next-themes` (already installed), Next.js 16 App Router, Supabase Realtime WebSockets, `crypto.getRandomValues()` for secure shuffle.

**Spec:** `docs/superpowers/specs/2026-04-18-supabase-discord-integration-design.md`

---

## File Map

**Create:**
- `lib/supabase/types.ts` — TypeScript interfaces matching the Supabase schema
- `lib/supabase/client.ts` — browser Supabase client (client components + realtime)
- `lib/supabase/server.ts` — server Supabase client (server components + route handlers)
- `lib/supabase/middleware.ts` — middleware Supabase client (session refresh)
- `middleware.ts` — root Next.js middleware (session refresh + auth guards)
- `components/providers/theme-provider.tsx` — next-themes ThemeProvider wrapper
- `app/login/page.tsx` — login page route (server shell)
- `app/auth/callback/route.ts` — Discord OAuth code exchange route handler
- `app/(app)/layout.tsx` — shared authenticated layout (server, auth-gated)
- `app/(app)/dashboard/page.tsx` — throwdowns grid (server component)
- `app/(app)/throwdown/[id]/page.tsx` — bracket page (server shell + client realtime)
- `app/(app)/archive/page.tsx` — match archive (server component)
- `app/(app)/admin/page.tsx` — admin match management (server, is_admin-gated)
- `hooks/use-realtime-matches.ts` — Supabase Realtime subscription hook

**Modify:**
- `app/layout.tsx` — add ThemeProvider
- `app/page.tsx` — replace screen-state machine with auth redirect
- `components/screens/login-page.tsx` — wire real Discord OAuth, use next-themes
- `components/screens/sidebar.tsx` — use next/link + usePathname, next-themes, real sign-out
- `components/screens/dashboard-home.tsx` — accept real throwdowns data as props
- `components/screens/bracket-view.tsx` — accept real rounds data as prop
- `components/screens/past-matches-view.tsx` — accept real matches data as props
- `components/screens/admin-view.tsx` — connect to Supabase, crypto random pairing

**Delete:**
- `components/screens/dashboard-layout.tsx` — replaced by `app/(app)/layout.tsx`

---

## Task 1: Install packages and create .env.local

**Files:**
- Modify: `package.json`
- Create: `.env.local`

- [ ] **Step 1: Install Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Expected output: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Create .env.local**

Create `.env.local` at the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://gqfxtzpecclnfuklqljb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste your anon key from Supabase dashboard → Settings → API>
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('@supabase/supabase-js'); require('@supabase/ssr'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local
git commit -m "feat: install @supabase/supabase-js and @supabase/ssr"
```

---

## Task 2: Database types

**Files:**
- Create: `lib/supabase/types.ts`

- [ ] **Step 1: Create types file**

Create `lib/supabase/types.ts`:

```typescript
export type ThrowdownStatus = 'upcoming' | 'live' | 'completed'

export interface Throwdown {
  id: string
  title: string
  description: string | null
  status: ThrowdownStatus
  ends_at: string | null
  winner_id: string | null
  created_at: string
}

export interface Profile {
  id: string
  discord_id: string
  username: string
  avatar_url: string | null
  created_at: string
  is_admin: boolean
}

export interface Submission {
  id: string
  throwdown_id: string
  profile_id: string
  image_url: string
  created_at: string
  profile?: Profile
}

export interface Match {
  id: string
  throwdown_id: string
  round: number
  position: number
  submission_a_id: string | null
  submission_b_id: string | null
  winner_id: string | null
  created_at: string
  submission_a?: Submission & { profile: Profile }
  submission_b?: Submission & { profile: Profile }
  winner?: Submission & { profile: Profile }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: no errors in `lib/supabase/types.ts` (existing app errors are acceptable).

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add Supabase database types"
```

---

## Task 3: Supabase client utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from server component — cookies are read-only, safe to ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create middleware client**

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const appRoutes = ['/dashboard', '/throwdown', '/archive', '/admin']
  const isAppRoute = appRoutes.some(r => pathname.startsWith(r))

  if (!user && isAppRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "lib/supabase"
```

Expected: no output (no errors in these files).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts
git commit -m "feat: add Supabase client utilities (browser, server, middleware)"
```

---

## Task 4: Root middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create root middleware**

Create `middleware.ts` at the project root (same level as `app/`):

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Start dev server and verify no crash**

```bash
npm run dev
```

Open `http://localhost:3000`. The app should still load (still on the old routing). No middleware errors in the terminal.

Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add root middleware for session refresh and auth guards"
```

---

## Task 5: Theme provider + root layout update

**Files:**
- Create: `components/providers/theme-provider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create ThemeProvider wrapper**

Create `components/providers/theme-provider.tsx`:

```typescript
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 2: Wrap root layout with ThemeProvider**

Modify `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: 'BRACKET — Tournament Platform',
  description: 'Competitive tournament bracket platform with real-time match tracking.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} ${spaceMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/providers/theme-provider.tsx app/layout.tsx
git commit -m "feat: add ThemeProvider via next-themes"
```

---

## Task 6: App Router structure — routing skeleton

**Files:**
- Modify: `app/page.tsx`
- Create: `app/(app)/layout.tsx`
- Modify: `components/screens/sidebar.tsx`

- [ ] **Step 1: Replace app/page.tsx with auth redirect**

Replace `app/page.tsx` entirely:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
```

- [ ] **Step 2: Create authenticated group layout**

Create `app/(app)/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/screens/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update Sidebar to use next/link and next-themes**

Replace `components/screens/sidebar.tsx` entirely:

```typescript
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutGrid,
  History,
  ShieldCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid, mono: '01' },
  { href: '/archive', label: 'Match Archive', icon: History, mono: '02' },
]

const adminItems = [
  { href: '/admin', label: 'Match Control', icon: ShieldCheck, mono: '03' },
  { href: '/admin/users', label: 'User Roles', icon: Users, mono: '04' },
]

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-5 shrink-0">
      {/* Brand */}
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-sidebar-primary" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-sidebar-foreground/50">
            System
          </span>
        </div>
        <h1 className="font-mono text-base font-bold tracking-widest text-sidebar-foreground">
          THROWDOWN
        </h1>
        <p className="label-mono text-sidebar-foreground/40 mt-0.5">Spring 2026</p>
      </div>

      {/* Live indicator */}
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 bg-live/10 border border-live/20 rounded-md px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
          <span className="font-mono text-[10px] text-live tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Navigation</p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
                {item.mono}
              </span>
              <item.icon size={14} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <div className="pt-4">
            <p className="label-mono px-2 mb-2 text-sidebar-foreground/30">Admin</p>
            {adminItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <span className="font-mono text-[9px] text-sidebar-foreground/30 w-5 shrink-0">
                    {item.mono}
                  </span>
                  <item.icon size={14} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 space-y-1 pt-4 border-t border-sidebar-border mt-4">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="px-5 mt-4">
        <p className="font-mono text-[9px] text-sidebar-foreground/20 tracking-wider">
          THROWDOWN-SYS-V1
        </p>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Delete dashboard-layout.tsx**

```bash
rm components/screens/dashboard-layout.tsx
```

- [ ] **Step 5: Verify build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build may warn about missing pages (dashboard, login not yet created) but should not crash on the files changed so far.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/\(app\)/layout.tsx components/screens/sidebar.tsx
git rm components/screens/dashboard-layout.tsx
git commit -m "feat: migrate to App Router routing skeleton, update Sidebar to next/link"
```

---

## Task 7: Login page + Discord OAuth callback

**Files:**
- Create: `app/login/page.tsx`
- Modify: `components/screens/login-page.tsx`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Update LoginPage component to use real Discord OAuth**

Replace `components/screens/login-page.tsx`:

```typescript
'use client'

import { WavePattern } from '@/components/wave-pattern'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

export function LoginPage() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  async function handleDiscordLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">
            SYSTEM /
          </span>
          <span className="font-mono text-sm font-bold tracking-widest text-foreground">
            THROWDOWN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="label-mono hidden md:block">Latte Art Tournament</span>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-md border border-border hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={14} className="text-muted-foreground" /> : <Moon size={14} className="text-muted-foreground" />}
          </button>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2">
        <div className="flex flex-col justify-between p-10 md:p-16 border-r border-border">
          <div className="space-y-8">
            <div>
              <p className="label-mono mb-2">Series</p>
              <p className="text-sm text-foreground">Spring Throwdown 2026</p>
              <p className="text-sm text-muted-foreground">Regional Open</p>
            </div>
            <div>
              <p className="label-mono mb-3">Format</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary font-bold">01</span>
                  <span className="text-sm font-semibold text-foreground">Qualifying Round (Active)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">02</span>
                  <span className="text-sm text-muted-foreground">Top 16 Bracket</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">03</span>
                  <span className="text-sm text-muted-foreground">Semifinals</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">04</span>
                  <span className="text-sm text-muted-foreground">Grand Final</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="label-mono mb-3">Access</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sign in with your Discord account to view live brackets, track past throwdowns, and follow your favourite baristas.
              </p>
            </div>

            <button
              onClick={handleDiscordLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 px-6 rounded-md font-medium transition-colors"
            >
              <DiscordIcon />
              <span>Continue with Discord</span>
            </button>

            <p className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
              THROWDOWN-2026 / AUTH-V1 / DISCORD-OAUTH2
            </p>
          </div>
        </div>

        <div className="relative hidden md:flex items-center justify-center overflow-hidden bg-primary/5">
          <div className="absolute inset-0">
            <WavePattern opacity={0.55} density={72} animated />
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <span className="label-mono">Wave Field / Tournament Topology</span>
            <span className="label-mono">2026</span>
          </div>
          <div className="absolute top-6 left-6">
            <div className="flex flex-col gap-1">
              <span className="label-mono">THROWDOWN-REF: 2026</span>
              <span className="label-mono">SEASON / SPRING</span>
            </div>
          </div>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 origin-center">
            <span className="label-mono whitespace-nowrap">
              Bracket / Match History / Live Scores
            </span>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between px-8 py-3 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex gap-0.5 items-end">
            {[1,0,1,1,0,1,0,0,1,1,0,1,1,0,0,1,0,1,1,0,1,0,1,1,0,1,0,0].map((tall, i) => (
              <div
                key={i}
                className="w-1.5 bg-foreground/40"
                style={{ height: tall ? '16px' : '8px' }}
              />
            ))}
          </div>
          <span className="label-mono">THROWDOWN-SYS-V1</span>
        </div>
        <span className="label-mono hidden sm:block">PRINTED IN COMPETITIVE</span>
      </footer>
    </div>
  )
}

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C7.41566 50.7087 14.2186 53.9874 20.8989 56.1652C20.9913 56.1934 21.0892 56.1596 21.1481 56.0846C22.7656 53.8928 24.2098 51.5845 25.4513 49.1564C25.5129 49.0361 25.4541 48.8934 25.3251 48.8454C23.0888 47.9908 20.9576 46.9471 18.9046 45.7751C18.7615 45.6941 18.7503 45.4893 18.8825 45.3914C19.3168 45.0717 19.7511 44.7381 20.1659 44.4017C20.2303 44.3492 20.3199 44.3379 20.3955 44.3718C32.0584 49.7282 44.7196 49.7282 56.2359 44.3718C56.3115 44.3351 56.4011 44.3464 56.4683 44.3989C56.8831 44.7353 57.3174 45.0717 57.7545 45.3914C57.8867 45.4893 57.8783 45.6941 57.7352 45.7751C55.6822 46.9697 53.5510 47.9908 51.3119 48.8426C51.1829 48.8906 51.1269 49.0361 51.1885 49.1564C52.4523 51.5817 53.8964 53.89 55.4916 56.0818C55.5477 56.1596 55.6484 56.1934 55.7408 56.1652C62.4519 53.9874 69.2548 50.7087 76.2847 45.5576C76.3379 45.5182 76.3715 45.459 76.3771 45.3942C77.8883 30.0791 73.7668 16.7757 65.1526 4.9823C65.1330 4.9429 65.0994 4.9147 65.0602 4.8978H60.1045Z"
        fill="currentColor"
      />
    </svg>
  )
}
```

- [ ] **Step 2: Create login page route**

Create `app/login/page.tsx`:

```typescript
import { LoginPage } from '@/components/screens/login-page'

export default function Login() {
  return <LoginPage />
}
```

- [ ] **Step 3: Create OAuth callback route handler**

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 4: Start dev server and test login flow**

```bash
npm run dev
```

1. Open `http://localhost:3000` — should redirect to `/login`
2. Click "Continue with Discord" — should redirect to Discord authorization
3. Authorize — should redirect back to `/dashboard` (404 for now — page not created yet, which is expected)

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx components/screens/login-page.tsx app/auth/callback/route.ts
git commit -m "feat: add Discord OAuth login and callback route"
```

---

## Task 8: Dashboard — throwdowns grid

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Modify: `components/screens/dashboard-home.tsx`

- [ ] **Step 1: Update DashboardHome to accept real data**

Replace `components/screens/dashboard-home.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { WavePattern } from '@/components/wave-pattern'
import { ArrowRight, Clock, Zap, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Throwdown } from '@/lib/supabase/types'

interface DashboardHomeProps {
  throwdowns: Throwdown[]
}

export function DashboardHome({ throwdowns }: DashboardHomeProps) {
  const liveCount = throwdowns.filter(t => t.status === 'live').length

  return (
    <div className="min-h-screen">
      <div className="relative h-44 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.4} density={48} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-mono mb-1">Spring Throwdown 2026</p>
              <h2 className="text-2xl font-bold text-foreground text-balance">
                Tournament Overview
              </h2>
            </div>
            <div className="text-right">
              <p className="label-mono">BRACKET-REF</p>
              <p className="font-mono text-xs text-muted-foreground">ST-2026</p>
            </div>
          </div>
          {liveCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
              <span className="font-mono text-xs text-live tracking-widest">{liveCount} THROWDOWN{liveCount > 1 ? 'S' : ''} LIVE</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-6">
        <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
          ALL THROWDOWNS
        </h3>

        {throwdowns.length === 0 && (
          <p className="text-sm text-muted-foreground">No throwdowns found.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {throwdowns.map((t) => (
            <Link
              key={t.id}
              href={`/throwdown/${t.id}`}
              className="group bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <StatusChip status={t.status} />
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1 leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
              )}
              {t.ends_at && (
                <div className="flex items-center gap-1.5 mt-3">
                  <Clock size={10} className="text-muted-foreground" />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Ends {new Date(t.ends_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {t.status === 'completed' && t.winner_id && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Trophy size={10} className="text-primary" />
                  <span className="font-mono text-[10px] text-primary">Completed</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded',
      status === 'live' ? 'bg-live/15 text-live' :
      status === 'completed' ? 'bg-muted text-muted-foreground' :
      'bg-upcoming/15 text-upcoming'
    )}>
      {status.toUpperCase()}
    </span>
  )
}
```

- [ ] **Step 2: Create dashboard server page**

Create `app/(app)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { DashboardHome } from '@/components/screens/dashboard-home'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: throwdowns } = await supabase
    .from('throwdowns')
    .select('*')
    .order('created_at', { ascending: false })

  return <DashboardHome throwdowns={throwdowns ?? []} />
}
```

- [ ] **Step 3: Test in browser**

```bash
npm run dev
```

After logging in via Discord, go to `http://localhost:3000/dashboard`. You should see real throwdowns from your Supabase database as cards. If the database is empty, you'll see "No throwdowns found."

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx components/screens/dashboard-home.tsx
git commit -m "feat: dashboard throwdowns grid from Supabase"
```

---

## Task 9: Match archive from Supabase

**Files:**
- Create: `app/(app)/archive/page.tsx`
- Modify: `components/screens/past-matches-view.tsx`

- [ ] **Step 1: Update PastMatchesView to accept real data**

At the top of `components/screens/past-matches-view.tsx`, replace the `HistoricalMatch` interface and the `allMatches` constant. The component signature changes to accept props. Replace the entire file:

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ArrowUpDown, Filter, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import type { Match } from '@/lib/supabase/types'

type SortKey = 'date' | 'stage' | 'participantA' | 'winner'
type SortDir = 'asc' | 'desc'

interface HistoricalMatch {
  id: string
  participantA: string
  participantB: string
  winner: string
  round: number
  date: string
}

interface PastMatchesViewProps {
  matches: Match[]
}

function mapToHistorical(matches: Match[]): HistoricalMatch[] {
  return matches
    .filter(m => m.winner_id !== null)
    .map(m => ({
      id: m.id,
      participantA: m.submission_a?.profile?.username ?? 'Unknown',
      participantB: m.submission_b?.profile?.username ?? 'Unknown',
      winner: m.winner?.profile?.username ?? 'Unknown',
      round: m.round,
      date: m.created_at.split('T')[0],
    }))
}

export function PastMatchesView({ matches }: PastMatchesViewProps) {
  const allMatches = useMemo(() => mapToHistorical(matches), [matches])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [roundFilter, setRoundFilter] = useState('All Rounds')

  const rounds = useMemo(() => {
    const unique = [...new Set(allMatches.map(m => `Round ${m.round}`))].sort()
    return ['All Rounds', ...unique]
  }, [allMatches])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...allMatches]
    if (roundFilter !== 'All Rounds') {
      const round = parseInt(roundFilter.replace('Round ', ''))
      list = list.filter(m => m.round === round)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.participantA.toLowerCase().includes(q) ||
        m.participantB.toLowerCase().includes(q) ||
        m.winner.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const valA = sortKey === 'participantA' ? a.participantA :
                   sortKey === 'winner' ? a.winner :
                   sortKey === 'stage' ? String(a.round) : a.date
      const valB = sortKey === 'participantA' ? b.participantA :
                   sortKey === 'winner' ? b.winner :
                   sortKey === 'stage' ? String(b.round) : b.date
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })
    return list
  }, [search, sortKey, sortDir, roundFilter, allMatches])

  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated={false} />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Spring Throwdown 2026</p>
            <h2 className="text-xl font-bold text-foreground">Match Archive</h2>
          </div>
          <p className="label-mono">{allMatches.length} records / {filtered.length} shown</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search participants, match ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-muted-foreground shrink-0" />
            <select
              value={roundFilter}
              onChange={e => setRoundFilter(e.target.value)}
              className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-sans"
            >
              {rounds.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3"><span className="label-mono">ID</span></th>
                <SortHeader label="Participant A" sortKey="participantA" active={sortKey === 'participantA'} dir={sortDir} onClick={() => handleSort('participantA')} />
                <th className="text-center px-4 py-3"><span className="label-mono">vs</span></th>
                <th className="text-left px-4 py-3"><span className="label-mono">Participant B</span></th>
                <SortHeader label="Winner" sortKey="winner" active={sortKey === 'winner'} dir={sortDir} onClick={() => handleSort('winner')} />
                <SortHeader label="Round" sortKey="stage" active={sortKey === 'stage'} dir={sortDir} onClick={() => handleSort('stage')} />
                <SortHeader label="Date" sortKey="date" active={sortKey === 'date'} dir={sortDir} onClick={() => handleSort('date')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    No matches found
                  </td>
                </tr>
              ) : (
                filtered.map((match, i) => (
                  <tr
                    key={match.id}
                    className={cn(
                      'border-b border-border last:border-0 hover:bg-muted/20 transition-colors',
                      i % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm', match.winner === match.participantA ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {match.participantA}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm', match.winner === match.participantB ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {match.participantB}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy size={10} className="text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground">{match.winner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        Round {match.round}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{match.date}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="label-mono">Showing {filtered.length} of {allMatches.length} records</p>
        </div>
      </div>
    </div>
  )
}

function SortHeader({ label, sortKey, active, dir, onClick }: {
  label: string; sortKey: SortKey; active: boolean; dir: SortDir; onClick: () => void
}) {
  return (
    <th className="text-left px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 group">
        <span className={cn('font-mono text-[10px] tracking-widest uppercase transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}>
          {label}
        </span>
        <span className="text-muted-foreground">
          {active ? (dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ArrowUpDown size={10} />}
        </span>
      </button>
    </th>
  )
}
```

- [ ] **Step 2: Create archive server page**

Create `app/(app)/archive/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { PastMatchesView } from '@/components/screens/past-matches-view'

export default async function ArchivePage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false })

  return <PastMatchesView matches={matches ?? []} />
}
```

- [ ] **Step 3: Test in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/archive`. You should see completed matches from Supabase, or an empty state if none exist.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/archive/page.tsx components/screens/past-matches-view.tsx
git commit -m "feat: match archive connected to Supabase"
```

---

## Task 10: Realtime hook + throwdown bracket page

**Files:**
- Create: `hooks/use-realtime-matches.ts`
- Create: `app/(app)/throwdown/[id]/page.tsx`
- Modify: `components/screens/bracket-view.tsx`

- [ ] **Step 1: Create realtime matches hook**

Create `hooks/use-realtime-matches.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/types'

export function useRealtimeMatches(throwdownId: string, initialMatches: Match[]) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`throwdown-${throwdownId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `throwdown_id=eq.${throwdownId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMatches(prev => [...prev, payload.new as Match])
          } else if (payload.eventType === 'UPDATE') {
            setMatches(prev =>
              prev.map(m => m.id === (payload.new as Match).id ? payload.new as Match : m)
            )
          } else if (payload.eventType === 'DELETE') {
            setMatches(prev => prev.filter(m => m.id !== (payload.old as Match).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [throwdownId])

  return matches
}
```

- [ ] **Step 2: Export Round type and add data-driven prop to BracketView**

Open `components/screens/bracket-view.tsx`. Make three precise changes:

**Change 1** — Export the `Round` interface (find `interface Round` near the top and add `export`):

```typescript
export interface Round {
  label: string
  matches: BracketMatch[]
}
```

**Change 2** — Add a `BracketViewProps` interface directly above the `export function BracketView` line:

```typescript
interface BracketViewProps {
  rounds?: Round[]
  throwdownTitle?: string
}
```

**Change 3** — Update the `BracketView` function signature from:

```typescript
export function BracketView() {
```

to:

```typescript
export function BracketView({ rounds: propRounds, throwdownTitle }: BracketViewProps = {}) {
```

Then locate the line inside the function body where `singleBracket` is passed to `useState` or used directly as the rounds data source. It will look like one of these patterns:

```typescript
// pattern A — useState
const [rounds, setRounds] = useState(singleBracket)
// pattern B — direct use
{singleBracket.map(...)}
```

For pattern A, change it to:
```typescript
const [rounds, setRounds] = useState(propRounds ?? singleBracket)
```

For pattern B, replace `singleBracket` with `propRounds ?? singleBracket`.

Do not change any other part of the visual layout, connectors, or tab logic.

- [ ] **Step 3: Create throwdown bracket page**

Create `app/(app)/throwdown/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThrowdownBracket } from '@/components/screens/throwdown-bracket'

export default async function ThrowdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: throwdown } = await supabase
    .from('throwdowns')
    .select('*')
    .eq('id', id)
    .single()

  if (!throwdown) notFound()

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .eq('throwdown_id', id)
    .order('round', { ascending: true })
    .order('position', { ascending: true })

  return (
    <ThrowdownBracket
      throwdown={throwdown}
      initialMatches={matches ?? []}
    />
  )
}
```

- [ ] **Step 4: Create ThrowdownBracket client component**

Create `components/screens/throwdown-bracket.tsx`:

```typescript
'use client'

import { useMemo } from 'react'
import { BracketView, type Round } from '@/components/screens/bracket-view'
import { useRealtimeMatches } from '@/hooks/use-realtime-matches'
import type { Throwdown, Match } from '@/lib/supabase/types'

type MatchStatus = 'live' | 'upcoming' | 'done' | 'bye'

interface ThrowdownBracketProps {
  throwdown: Throwdown
  initialMatches: Match[]
}

function matchesToRounds(matches: Match[]): Round[] {
  const byRound = matches.reduce((acc, match) => {
    const r = match.round
    if (!acc[r]) acc[r] = []
    acc[r].push(match)
    return acc
  }, {} as Record<number, Match[]>)

  return Object.entries(byRound)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([round, roundMatches]) => ({
      label: `Round ${round}`,
      matches: roundMatches
        .sort((a, b) => a.position - b.position)
        .map(m => ({
          id: m.id,
          a: { name: m.submission_a?.profile?.username ?? 'TBD' },
          b: { name: m.submission_b?.profile?.username ?? 'TBD' },
          winner: m.winner_id
            ? (m.winner_id === m.submission_a_id ? 'a' as const : 'b' as const)
            : undefined,
          status: (m.winner_id ? 'done' : 'upcoming') as MatchStatus,
        })),
    }))
}

export function ThrowdownBracket({ throwdown, initialMatches }: ThrowdownBracketProps) {
  const matches = useRealtimeMatches(throwdown.id, initialMatches)
  const rounds = useMemo(() => matchesToRounds(matches), [matches])

  return (
    <BracketView
      rounds={rounds.length > 0 ? rounds : undefined}
      throwdownTitle={throwdown.title}
    />
  )
}
```

- [ ] **Step 5: Test realtime in browser**

```bash
npm run dev
```

1. Go to `/dashboard`, click a throwdown card — should navigate to `/throwdown/[id]`
2. Open the Supabase dashboard, update a `winner_id` on a match for that throwdown
3. The bracket in the browser should update without a page reload

- [ ] **Step 6: Commit**

```bash
git add hooks/use-realtime-matches.ts app/\(app\)/throwdown/\[id\]/page.tsx components/screens/throwdown-bracket.tsx components/screens/bracket-view.tsx
git commit -m "feat: throwdown bracket page with Supabase Realtime WebSocket updates"
```

---

## Task 11: Admin match management + crypto random pairing

**Files:**
- Create: `app/(app)/admin/page.tsx`
- Modify: `components/screens/admin-view.tsx`

- [ ] **Step 1: Rewrite AdminView with real data and crypto pairing**

Replace `components/screens/admin-view.tsx` entirely:

```typescript
'use client'

import { useState } from 'react'
import { Trash2, Zap, Clock, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import { createClient } from '@/lib/supabase/client'
import type { Throwdown, Match, Submission } from '@/lib/supabase/types'

interface AdminViewProps {
  throwdowns: Throwdown[]
  initialMatches: Match[]
  initialThrowdownId: string | null
}

function cryptoShuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function AdminView({ throwdowns, initialMatches, initialThrowdownId }: AdminViewProps) {
  const [selectedThrowdownId, setSelectedThrowdownId] = useState<string | null>(initialThrowdownId)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const liveCount = matches.filter(m => !m.winner_id).length
  const completedCount = matches.filter(m => m.winner_id !== null).length

  async function handleThrowdownChange(throwdownId: string) {
    setSelectedThrowdownId(throwdownId)
    setError(null)
    const supabase = createClient()
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .eq('throwdown_id', throwdownId)
      .order('round', { ascending: true })
      .order('position', { ascending: true })
    setMatches(data ?? [])
  }

  async function handleGeneratePairings() {
    if (!selectedThrowdownId) return
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data: submissions } = await supabase
      .from('submissions')
      .select('*, profile:profile_id(*)')
      .eq('throwdown_id', selectedThrowdownId)

    if (!submissions || submissions.length === 0) {
      setError('No submissions found for this throwdown.')
      setLoading(false)
      return
    }

    if (submissions.length % 2 !== 0) {
      setError(`Cannot generate pairings: ${submissions.length} submissions is not an even number.`)
      setLoading(false)
      return
    }

    const nextRound = matches.length > 0 ? Math.max(...matches.map(m => m.round)) + 1 : 1
    const shuffled = cryptoShuffle(submissions as Submission[])
    const pairs = []
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push({
        throwdown_id: selectedThrowdownId,
        round: nextRound,
        position: i / 2 + 1,
        submission_a_id: shuffled[i].id,
        submission_b_id: shuffled[i + 1].id,
      })
    }

    const { error: insertError } = await supabase.from('matches').insert(pairs)
    if (insertError) {
      setError(`Failed to create matches: ${insertError.message}`)
      setLoading(false)
      return
    }

    await handleThrowdownChange(selectedThrowdownId)
    setLoading(false)
  }

  async function handleDeleteMatch(matchId: string) {
    const supabase = createClient()
    await supabase.from('matches').delete().eq('id', matchId)
    setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  async function handleSetWinner(matchId: string, winnerId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('matches')
      .update({ winner_id: winnerId })
      .eq('id', matchId)
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .single()
    if (data) {
      setMatches(prev => prev.map(m => m.id === matchId ? data : m))
    }
  }

  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">Admin / Match Control</p>
            <h2 className="text-xl font-bold text-foreground">Match Management</h2>
          </div>
          <p className="label-mono text-muted-foreground">Create and manage throwdown matchups</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Throwdown selector */}
        <div className="flex items-center gap-4">
          <label className="label-mono shrink-0">Throwdown</label>
          <select
            value={selectedThrowdownId ?? ''}
            onChange={e => handleThrowdownChange(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select throwdown...</option>
            {throwdowns.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {selectedThrowdownId && (
          <>
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
                  <Zap size={12} className="text-live" />
                  <span className="font-mono text-xs text-live">{liveCount} ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2">
                  <Clock size={12} className="text-upcoming" />
                  <span className="font-mono text-xs text-upcoming">{completedCount} COMPLETED</span>
                </div>
              </div>
              <button
                onClick={handleGeneratePairings}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Shuffle size={14} />
                {loading ? 'Generating...' : 'Generate Pairings'}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Match list */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold tracking-widest text-muted-foreground">
                  ALL MATCHES
                </h3>
                <span className="label-mono">{matches.length} records</span>
              </div>

              <div className="divide-y divide-border">
                {matches.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No matches yet. Generate pairings to start.
                  </div>
                )}
                {matches.map(match => {
                  const nameA = match.submission_a?.profile?.username ?? 'TBD'
                  const nameB = match.submission_b?.profile?.username ?? 'TBD'
                  const hasWinner = match.winner_id !== null

                  return (
                    <div key={match.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors">
                      <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">R{match.round}</span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {nameA} <span className="text-muted-foreground font-normal">vs</span> {nameB}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          Position {match.position}{hasWinner ? ` · Winner: ${match.winner?.profile?.username}` : ''}
                        </p>
                      </div>

                      {!hasWinner && match.submission_a_id && match.submission_b_id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSetWinner(match.id, match.submission_a_id!)}
                            className="px-2 py-1 rounded text-[10px] font-mono bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {nameA} wins
                          </button>
                          <button
                            onClick={() => handleSetWinner(match.id, match.submission_b_id!)}
                            className="px-2 py-1 rounded text-[10px] font-mono bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            {nameB} wins
                          </button>
                        </div>
                      )}

                      <StatusChip done={hasWinner} />

                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusChip({ done }: { done: boolean }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded shrink-0',
      done ? 'bg-muted text-muted-foreground' : 'bg-live/15 text-live'
    )}>
      {done ? 'DONE' : 'ACTIVE'}
    </span>
  )
}
```

- [ ] **Step 2: Create admin server page**

Create `app/(app)/admin/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminView } from '@/components/screens/admin-view'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: throwdowns } = await supabase
    .from('throwdowns')
    .select('*')
    .order('created_at', { ascending: false })

  const firstId = throwdowns?.[0]?.id ?? null

  const { data: initialMatches } = firstId ? await supabase
    .from('matches')
    .select(`
      *,
      submission_a:submission_a_id(*, profile:profile_id(*)),
      submission_b:submission_b_id(*, profile:profile_id(*)),
      winner:winner_id(*, profile:profile_id(*))
    `)
    .eq('throwdown_id', firstId)
    .order('round', { ascending: true })
    .order('position', { ascending: true }) : { data: [] }

  return (
    <AdminView
      throwdowns={throwdowns ?? []}
      initialMatches={initialMatches ?? []}
      initialThrowdownId={firstId}
    />
  )
}
```

- [ ] **Step 3: Test admin flow in browser**

```bash
npm run dev
```

1. Log in as a user with `is_admin = true` in the `profiles` table
2. Navigate to `http://localhost:3000/admin`
3. Select a throwdown — matches should load
4. Click "Generate Pairings" — should create random pairs from submissions
5. Try with an odd number of submissions — should show an error message
6. Click a winner button — match updates instantly, bracket on `/throwdown/[id]` updates via realtime

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/page.tsx components/screens/admin-view.tsx
git commit -m "feat: admin match management with crypto-secure random pairing"
```

---

## Task 12: Final cleanup and verification

**Files:**
- Verify all routes work end-to-end

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build completes (TypeScript errors are non-blocking due to `ignoreBuildErrors: true`, but check for any runtime errors).

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any errors (unused imports, missing keys, etc.).

- [ ] **Step 3: End-to-end manual checklist**

Test each route:
- `http://localhost:3000` → redirects to `/login` (unauthenticated) or `/dashboard` (authenticated)
- `/login` → Discord OAuth button triggers real auth flow
- `/dashboard` → shows real throwdowns from Supabase as cards
- `/throwdown/[id]` → shows bracket, updates in realtime when admin sets a winner
- `/archive` → shows completed matches with participant names from profiles
- `/admin` → only accessible to `is_admin` users; can generate pairings and set winners
- Sidebar Sign Out → calls `supabase.auth.signOut()`, redirects to `/login`
- Sidebar theme toggle → switches between dark/light

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Supabase + Discord OAuth integration"
```
