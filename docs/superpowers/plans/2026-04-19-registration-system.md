# Registration System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full registration lifecycle to throwdowns — admin creates throwdowns with capacity/window settings, users join/leave, and the registrants page drives pairing generation.

**Architecture:** New `registrations` table tracks sign-up status (confirmed/waitlist) with auto-promotion via DB trigger. `/throwdown/[id]` gains a tabbed layout (Registrants + Bracket). Generate Pairings moves from `/match-control` to the Registrants tab. `/admin` is renamed `/match-control`.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + RLS + PL/pgSQL), React 19, Tailwind CSS v4, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **User runs** | Supabase SQL editor | DB migration (6 scripts) |
| **Modify** | `lib/supabase/types.ts` | Add `Registration`, `RegistrationStatus`, `ThrowdownFormat`; extend `Throwdown` |
| **Create** | `app/(app)/match-control/page.tsx` | Renamed admin page (was `app/(app)/admin/page.tsx`) |
| **Delete** | `app/(app)/admin/page.tsx` | Replaced by match-control |
| **Modify** | `components/screens/sidebar.tsx` | Update admin nav href `/admin` → `/match-control` |
| **Modify** | `components/screens/admin-view.tsx` | Remove Generate Pairings; add + New Throwdown button + dialog |
| **Create** | `components/screens/create-throwdown-dialog.tsx` | Modal form to create a throwdown |
| **Create** | `components/screens/registrants-view.tsx` | Stats, capacity bar, table, join/leave/remove/generate-pairings |
| **Create** | `components/screens/throwdown-detail.tsx` | Tabbed container: Registrants ↔ Bracket |
| **Modify** | `app/(app)/throwdown/[id]/page.tsx` | Fetch registrations + isAdmin; render `ThrowdownDetail` |
| **Modify** | `components/ui/skeletons.tsx` | Add `AdminSkeleton`, `ThrowdownDetailSkeleton` |
| **Modify** | `components/page-transition.tsx` | Map `/match-control` → `AdminSkeleton`, `/throwdown/` → `ThrowdownDetailSkeleton` |

---

## Task 1: Database Migration

**Run all 6 scripts in order in the Supabase SQL editor (Dashboard → SQL Editor).**

- [ ] **Step 1: Run Script 1 — extend throwdowns table**

```sql
ALTER TABLE throwdowns
  ADD COLUMN format text NOT NULL DEFAULT 'registration'
    CHECK (format IN ('registration', 'submission_scoring')),
  ADD COLUMN max_participants integer,
  ADD COLUMN registration_opens_at timestamptz,
  ADD COLUMN registration_closes_at timestamptz;
```

- [ ] **Step 2: Run Script 2 — make submissions.image_url nullable**

```sql
ALTER TABLE submissions ALTER COLUMN image_url DROP NOT NULL;
```

- [ ] **Step 3: Run Script 3 — add unique constraint to submissions**

This allows safe upsert when generating pairings for Format B (prevents duplicate participant records).

```sql
ALTER TABLE submissions
  ADD CONSTRAINT submissions_throwdown_profile_unique
  UNIQUE (throwdown_id, profile_id);
```

- [ ] **Step 4: Run Script 4 — create registrations table + RLS**

```sql
CREATE TABLE registrations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  throwdown_id    uuid        NOT NULL REFERENCES throwdowns(id)  ON DELETE CASCADE,
  profile_id      uuid        NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'confirmed'
                                CHECK (status IN ('confirmed', 'pending', 'waitlist')),
  seed            integer,
  registered_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (throwdown_id, profile_id)
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reg_select" ON registrations
  FOR SELECT USING (true);

CREATE POLICY "reg_insert" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "reg_delete" ON registrations
  FOR DELETE USING (
    auth.uid() = profile_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "reg_update" ON registrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

- [ ] **Step 5: Run Script 5 — registration function (atomic, capacity-safe)**

```sql
CREATE OR REPLACE FUNCTION register_for_throwdown(p_throwdown_id uuid)
RETURNS registrations
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_td    throwdowns;
  v_count integer;
  v_reg   registrations;
BEGIN
  SELECT * INTO v_td FROM throwdowns WHERE id = p_throwdown_id FOR UPDATE;

  IF v_td.registration_closes_at IS NOT NULL AND now() > v_td.registration_closes_at THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;

  IF v_td.registration_opens_at IS NOT NULL AND now() < v_td.registration_opens_at THEN
    RAISE EXCEPTION 'Registration not open yet';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM registrations WHERE throwdown_id = p_throwdown_id AND status = 'confirmed';

  INSERT INTO registrations (throwdown_id, profile_id, status, seed)
  VALUES (
    p_throwdown_id, auth.uid(),
    CASE WHEN v_td.max_participants IS NULL OR v_count < v_td.max_participants
      THEN 'confirmed' ELSE 'waitlist' END,
    CASE WHEN v_td.max_participants IS NULL OR v_count < v_td.max_participants
      THEN v_count + 1 ELSE NULL END
  )
  ON CONFLICT (throwdown_id, profile_id) DO NOTHING
  RETURNING * INTO v_reg;

  IF v_reg IS NULL THEN RAISE EXCEPTION 'Already registered'; END IF;
  RETURN v_reg;
END;
$$;
```

- [ ] **Step 6: Run Script 6 — waitlist promotion trigger**

```sql
CREATE OR REPLACE FUNCTION promote_waitlist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_td    throwdowns;
  v_count integer;
BEGIN
  IF OLD.status != 'confirmed' THEN RETURN OLD; END IF;

  SELECT * INTO v_td FROM throwdowns WHERE id = OLD.throwdown_id;
  IF v_td.max_participants IS NULL THEN RETURN OLD; END IF;

  SELECT COUNT(*) INTO v_count
    FROM registrations WHERE throwdown_id = OLD.throwdown_id AND status = 'confirmed';

  IF v_count < v_td.max_participants THEN
    UPDATE registrations
    SET status = 'confirmed',
        seed = (
          SELECT COALESCE(MAX(seed), 0) + 1
          FROM registrations
          WHERE throwdown_id = OLD.throwdown_id AND status = 'confirmed'
        )
    WHERE id = (
      SELECT id FROM registrations
      WHERE throwdown_id = OLD.throwdown_id AND status = 'waitlist'
      ORDER BY registered_at ASC LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_registration_delete
  AFTER DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION promote_waitlist();
```

- [ ] **Step 7: Verify in Supabase Table Editor**

Open Table Editor → confirm `throwdowns` has columns `format`, `max_participants`, `registration_opens_at`, `registration_closes_at`. Confirm `registrations` table exists with columns `id`, `throwdown_id`, `profile_id`, `status`, `seed`, `registered_at`.

---

## Task 2: TypeScript Types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Replace full contents of `lib/supabase/types.ts`**

```ts
export type ThrowdownStatus = 'upcoming' | 'live' | 'completed'
export type ThrowdownFormat = 'registration' | 'submission_scoring'
export type RegistrationStatus = 'confirmed' | 'pending' | 'waitlist'

export interface Throwdown {
  id: string
  title: string
  description: string | null
  status: ThrowdownStatus
  format: ThrowdownFormat
  max_participants: number | null
  registration_opens_at: string | null
  registration_closes_at: string | null
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
  image_url: string | null
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

export interface Registration {
  id: string
  throwdown_id: string
  profile_id: string
  status: RegistrationStatus
  seed: number | null
  registered_at: string
  profile?: Profile
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add Registration types and extend Throwdown with format/registration fields"
```

---

## Task 3: Rename /admin to /match-control + Update Sidebar

**Files:**
- Create: `app/(app)/match-control/page.tsx`
- Delete: `app/(app)/admin/page.tsx` (and remove empty directory)
- Modify: `components/screens/sidebar.tsx`

- [ ] **Step 1: Create `app/(app)/match-control/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminView } from '@/components/screens/admin-view'

export default async function MatchControlPage() {
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

- [ ] **Step 2: Delete `app/(app)/admin/page.tsx`**

```bash
rm app/(app)/admin/page.tsx
rmdir app/(app)/admin
```

- [ ] **Step 3: Update sidebar nav href in `components/screens/sidebar.tsx`**

Find this block (around line 29–31):

```ts
const adminItems = [
  { href: '/admin', label: 'Match Control', icon: ShieldCheck },
]
```

Replace with:

```ts
const adminItems = [
  { href: '/match-control', label: 'Match Control', icon: ShieldCheck },
]
```

- [ ] **Step 4: Verify by running dev server**

Run `npm run dev`. Navigate to `/match-control` — should load the existing match management page. The sidebar "Match Control" link should be active when on that page. Visiting `/admin` should 404.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/match-control/page.tsx components/screens/sidebar.tsx
git commit -m "feat: rename /admin route to /match-control, update sidebar nav"
```

---

## Task 4: Add AdminSkeleton and ThrowdownDetailSkeleton

**Files:**
- Modify: `components/ui/skeletons.tsx`

- [ ] **Step 1: Append `AdminSkeleton` to `components/ui/skeletons.tsx`**

Add at the end of the file (before the closing of the last export):

```tsx
// ─── Match Control (admin) page skeleton ─────────────────────────────────────

export function AdminSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header strip — matches real h-36 bg-primary/5 */}
      <div className="relative h-36 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div className="flex items-start justify-between">
          <div>
            <Shimmer className="h-2.5 w-36 mb-2" />
            <Shimmer className="h-6 w-44" style={{ animationDelay: '50ms' }} />
          </div>
          <Shimmer className="h-8 w-32 rounded-md" style={{ animationDelay: '100ms' }} />
        </div>
        <Shimmer className="h-2.5 w-52" style={{ animationDelay: '150ms' }} />
      </div>

      <div className="p-8 space-y-6">
        {/* Throwdown selector */}
        <div className="flex items-center gap-4">
          <Shimmer className="h-2.5 w-20 rounded-sm" />
          <Shimmer className="h-9 w-48 rounded-md" style={{ animationDelay: '60ms' }} />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shimmer className="h-8 w-24 rounded-md" style={{ animationDelay: '80ms' }} />
            <Shimmer className="h-8 w-28 rounded-md" style={{ animationDelay: '120ms' }} />
          </div>
        </div>

        {/* Match list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <Shimmer className="h-2.5 w-24" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
              <Shimmer className="h-3 w-6 rounded-sm" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3.5 w-48" style={{ animationDelay: `${i * 50 + 30}ms` }} />
                <Shimmer className="h-2.5 w-32" style={{ animationDelay: `${i * 50 + 60}ms` }} />
              </div>
              <Shimmer className="h-5 w-16 rounded-sm" style={{ animationDelay: `${i * 50 + 80}ms` }} />
              <Shimmer className="h-5 w-5 rounded-sm" style={{ animationDelay: `${i * 50 + 100}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Throwdown detail (tabbed) page skeleton ──────────────────────────────────

export function ThrowdownDetailSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Tab bar */}
      <div className="border-b border-border bg-card px-8 flex items-center gap-6 h-11">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-3 w-20" style={{ animationDelay: '80ms' }} />
      </div>

      {/* Registrants tab (default shown in skeleton) */}
      {/* Header strip */}
      <div className="h-36 border-b border-border bg-primary/5 flex flex-col justify-between p-8">
        <div>
          <Shimmer className="h-2.5 w-44 mb-2" />
          <Shimmer className="h-6 w-32" style={{ animationDelay: '50ms' }} />
        </div>
        <Shimmer className="h-2.5 w-28" style={{ animationDelay: '100ms' }} />
      </div>

      <div className="p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <Shimmer className="h-2.5 w-20" style={{ animationDelay: `${i * 60}ms` }} />
              <Shimmer className="h-7 w-12" style={{ animationDelay: `${i * 60 + 50}ms` }} />
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <Shimmer className="h-2.5 w-32" />
            <Shimmer className="h-2.5 w-12" style={{ animationDelay: '50ms' }} />
          </div>
          <Shimmer className="h-2 w-full rounded-full" style={{ animationDelay: '80ms' }} />
          <Shimmer className="h-2.5 w-52" style={{ animationDelay: '120ms' }} />
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center justify-between gap-4">
          <Shimmer className="h-9 w-64 rounded-md" />
          <div className="flex items-center gap-2">
            {[40, 60, 48, 48].map((w, i) => (
              <Shimmer key={i} className="h-7 rounded-md" style={{ width: w, animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/20">
            {[24, 80, 80, 60, 60].map((w, i) => (
              <Shimmer key={i} className="h-2.5 rounded-sm" style={{ width: w, animationDelay: `${i * 30}ms` }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center px-5 py-3.5 border-b border-border last:border-0">
              <Shimmer className="h-5 w-6 rounded-sm" style={{ animationDelay: `${i * 40}ms` }} />
              <Shimmer className="h-3.5 w-28 rounded-sm" style={{ animationDelay: `${i * 40 + 30}ms` }} />
              <Shimmer className="h-3.5 w-24 rounded-sm" style={{ animationDelay: `${i * 40 + 50}ms` }} />
              <Shimmer className="h-3 w-20 rounded-sm" style={{ animationDelay: `${i * 40 + 70}ms` }} />
              <Shimmer className="h-5 w-20 rounded-sm" style={{ animationDelay: `${i * 40 + 90}ms` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/skeletons.tsx
git commit -m "feat: add AdminSkeleton and ThrowdownDetailSkeleton"
```

---

## Task 5: Update page-transition.tsx Skeleton Mappings

**Files:**
- Modify: `components/page-transition.tsx`

- [ ] **Step 1: Replace full contents of `components/page-transition.tsx`**

```tsx
'use client'

import { usePathname } from 'next/navigation'
import { useNavigation } from './navigation-progress'
import {
  DashboardSkeleton,
  ThrowdownDetailSkeleton,
  ArchiveSkeleton,
  AdminSkeleton,
} from './ui/skeletons'
import type { ComponentType } from 'react'

function skeletonFor(path: string): ComponentType | null {
  if (path === '/dashboard') return DashboardSkeleton
  if (path === '/archive') return ArchiveSkeleton
  if (path === '/match-control') return AdminSkeleton
  if (path.startsWith('/throwdown/')) return ThrowdownDetailSkeleton
  return null
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { pending } = useNavigation()
  const Skeleton = pending ? skeletonFor(pending) : null

  return (
    <div className="flex-1 min-w-0 overflow-auto relative">
      <div key={pathname} className="page-enter">
        {children}
      </div>
      {Skeleton && (
        <div className="absolute inset-0 z-10 bg-background overflow-auto">
          <Skeleton />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify by running dev server**

Run `npm run dev`. Click "Match Control" in the sidebar — the `AdminSkeleton` shimmer should appear instantly as the orange progress bar starts. Click a throwdown link — `ThrowdownDetailSkeleton` should appear.

- [ ] **Step 3: Commit**

```bash
git add components/page-transition.tsx
git commit -m "feat: map /match-control and /throwdown/* to new skeleton components"
```

---

## Task 6: Clean Up AdminView (Remove Generate Pairings, Add + New Throwdown)

**Files:**
- Modify: `components/screens/admin-view.tsx`

- [ ] **Step 1: Replace full contents of `components/screens/admin-view.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Trash2, Zap, Clock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import { createClient } from '@/lib/supabase/client'
import { CreateThrowdownDialog } from './create-throwdown-dialog'
import type { Throwdown, Match } from '@/lib/supabase/types'

interface AdminViewProps {
  throwdowns: Throwdown[]
  initialMatches: Match[]
  initialThrowdownId: string | null
}

export function AdminView({ throwdowns, initialMatches, initialThrowdownId }: AdminViewProps) {
  const [selectedThrowdownId, setSelectedThrowdownId] = useState<string | null>(initialThrowdownId)
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const liveCount = matches.filter(m => !m.winner_id).length
  const completedCount = matches.filter(m => m.winner_id !== null).length

  async function handleThrowdownChange(throwdownId: string) {
    setSelectedThrowdownId(throwdownId)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
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
    if (error) { setError(`Failed to load matches: ${error.message}`); return }
    setMatches(data ?? [])
  }

  async function handleDeleteMatch(matchId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { setError(`Failed to delete match: ${error.message}`); return }
    setMatches(prev => prev.filter(m => m.id !== matchId))
  }

  async function handleSetWinner(matchId: string, winnerId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
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
    if (error) { setError(`Failed to set winner: ${error.message}`); return }
    if (data) setMatches(prev => prev.map(m => m.id === matchId ? data : m))
  }

  return (
    <div className="min-h-screen">
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-mono mb-1">Admin / Match Control</p>
              <h2 className="text-xl font-bold text-foreground">Match Management</h2>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              New Throwdown
            </button>
          </div>
          <p className="label-mono text-muted-foreground">Create and manage throwdown matchups</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
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

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
                    No matches yet. Go to the throwdown detail page to generate pairings.
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

      <CreateThrowdownDialog open={showCreate} onClose={() => setShowCreate(false)} />
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

- [ ] **Step 2: Verify**

Run `npm run dev`. Go to `/match-control`. The "Generate Pairings" button should be gone. A "+ New Throwdown" button should appear in the header (top-right of the hero strip). Clicking it should not crash (the dialog doesn't exist yet — it will in Task 7).

- [ ] **Step 3: Commit**

```bash
git add components/screens/admin-view.tsx
git commit -m "feat: remove Generate Pairings from match-control, add + New Throwdown button"
```

---

## Task 7: CreateThrowdownDialog Component

**Files:**
- Create: `components/screens/create-throwdown-dialog.tsx`

- [ ] **Step 1: Create `components/screens/create-throwdown-dialog.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { ThrowdownFormat } from '@/lib/supabase/types'

interface CreateThrowdownDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateThrowdownDialog({ open, onClose }: CreateThrowdownDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<ThrowdownFormat>('registration')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [registrationOpensAt, setRegistrationOpensAt] = useState('')
  const [registrationClosesAt, setRegistrationClosesAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    setTitle('')
    setDescription('')
    setFormat('registration')
    setMaxParticipants('')
    setRegistrationOpensAt('')
    setRegistrationClosesAt('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('throwdowns').insert({
      title: title.trim(),
      description: description.trim() || null,
      format,
      max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      registration_opens_at: registrationOpensAt || null,
      registration_closes_at: registrationClosesAt || null,
      status: 'upcoming',
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }
    router.refresh()
    handleClose()
    setLoading(false)
  }

  const inputClass = 'w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono text-sm font-bold tracking-widest uppercase">New Throwdown</h2>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-mono block mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Spring Throwdown 2026"
              className={inputClass}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — shown on the registrants page"
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Format</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat('registration')}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-xs font-mono border transition-colors',
                  format === 'registration'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                )}
              >
                Registration-based
              </button>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="flex-1 px-3 py-2 rounded-md text-xs font-mono border border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
              >
                Submission-based
              </button>
            </div>
          </div>

          <div>
            <label className="label-mono block mb-1.5">Max Participants</label>
            <input
              type="number"
              min="2"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              placeholder="Leave blank for unlimited"
              className={inputClass}
            />
          </div>

          <div>
            <label className="label-mono block mb-1.5">Registration Opens</label>
            <input
              type="datetime-local"
              value={registrationOpensAt}
              onChange={e => setRegistrationOpensAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to open immediately</p>
          </div>

          <div>
            <label className="label-mono block mb-1.5">Registration Closes</label>
            <input
              type="datetime-local"
              value={registrationClosesAt}
              onChange={e => setRegistrationClosesAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to never close automatically</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Throwdown'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Go to `/match-control`, click "+ New Throwdown". The dialog should open. Fill in a title and submit. The throwdown should appear in the dropdown selector. Cancel should dismiss the dialog and reset the form.

- [ ] **Step 3: Commit**

```bash
git add components/screens/create-throwdown-dialog.tsx
git commit -m "feat: add CreateThrowdownDialog with format toggle and registration window settings"
```

---

## Task 8: RegistrantsView Component

**Files:**
- Create: `components/screens/registrants-view.tsx`

- [ ] **Step 1: Create `components/screens/registrants-view.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, Shuffle, UserPlus, UserMinus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WavePattern } from '@/components/wave-pattern'
import { createClient } from '@/lib/supabase/client'
import type { Throwdown, Registration, Match } from '@/lib/supabase/types'

interface RegistrantsViewProps {
  throwdown: Throwdown
  initialRegistrations: Registration[]
  isAdmin: boolean
  currentUserId: string
  hasExistingMatches: boolean
  onPairingsGenerated: (matches: Match[]) => void
}

type FilterTab = 'all' | 'confirmed' | 'pending' | 'waitlist'

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

function isRegistrationOpen(throwdown: Throwdown): boolean {
  const now = new Date()
  if (throwdown.registration_opens_at && new Date(throwdown.registration_opens_at) > now) return false
  if (throwdown.registration_closes_at && new Date(throwdown.registration_closes_at) < now) return false
  return true
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function RegistrantsView({
  throwdown,
  initialRegistrations,
  isAdmin,
  currentUserId,
  hasExistingMatches,
  onPairingsGenerated,
}: RegistrantsViewProps) {
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length
  const pendingCount = registrations.filter(r => r.status === 'pending').length
  const waitlistCount = registrations.filter(r => r.status === 'waitlist').length
  const totalCount = registrations.length

  const myRegistration = registrations.find(r => r.profile_id === currentUserId)
  const registrationOpen = isRegistrationOpen(throwdown)
  const atCapacity = throwdown.max_participants !== null && confirmedCount >= throwdown.max_participants

  const filtered = useMemo(() => {
    let list = registrations
    if (filter !== 'all') list = list.filter(r => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.profile?.username?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (a.seed !== null && b.seed !== null) return a.seed - b.seed
      if (a.seed !== null) return -1
      if (b.seed !== null) return 1
      return new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    })
  }, [registrations, filter, search])

  async function handleJoin() {
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: rawReg, error: rpcError } = await supabase.rpc('register_for_throwdown', {
      p_throwdown_id: throwdown.id,
    })
    if (rpcError) { setError(rpcError.message); setLoading(false); return }
    const { data: reg } = await supabase
      .from('registrations')
      .select('*, profile:profile_id(*)')
      .eq('id', (rawReg as Registration).id)
      .single()
    if (reg) setRegistrations(prev => [...prev, reg as Registration])
    setLoading(false)
  }

  async function handleLeave() {
    if (!myRegistration) return
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: delError } = await supabase.from('registrations').delete().eq('id', myRegistration.id)
    if (delError) { setError(delError.message); setLoading(false); return }
    setRegistrations(prev => prev.filter(r => r.id !== myRegistration.id))
    setLoading(false)
  }

  async function handleRemove(regId: string) {
    setError(null)
    const supabase = createClient()
    const { error: delError } = await supabase.from('registrations').delete().eq('id', regId)
    if (delError) { setError(delError.message); return }
    setRegistrations(prev => prev.filter(r => r.id !== regId))
  }

  async function handleGeneratePairings() {
    setError(null)
    setLoading(true)
    const supabase = createClient()

    const confirmed = registrations.filter(r => r.status === 'confirmed')
    if (confirmed.length < 2) {
      setError('Need at least 2 confirmed registrants.')
      setLoading(false)
      return
    }

    const submissionInserts = confirmed.map(r => ({
      throwdown_id: throwdown.id,
      profile_id: r.profile_id,
      image_url: null,
    }))

    const { data: submissions, error: subError } = await supabase
      .from('submissions')
      .upsert(submissionInserts, { onConflict: 'throwdown_id,profile_id' })
      .select('id, profile_id')

    if (subError || !submissions) {
      setError(`Failed to create participant records: ${subError?.message}`)
      setLoading(false)
      return
    }

    const submissionMap = new Map(submissions.map(s => [s.profile_id, s.id]))
    const submissionIds = confirmed
      .map(r => submissionMap.get(r.profile_id))
      .filter((id): id is string => !!id)

    const shuffled = cryptoShuffle(submissionIds)
    const pairs = []
    for (let i = 0; i < shuffled.length; i += 2) {
      pairs.push({
        throwdown_id: throwdown.id,
        round: 1,
        position: i / 2 + 1,
        submission_a_id: shuffled[i],
        submission_b_id: shuffled[i + 1] ?? null,
      })
    }

    const { data: newMatches, error: matchError } = await supabase
      .from('matches')
      .insert(pairs)
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)

    if (matchError) {
      setError(`Failed to create matches: ${matchError.message}`)
      setLoading(false)
      return
    }

    onPairingsGenerated(newMatches ?? [])
    setLoading(false)
  }

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'ALL', count: totalCount },
    { key: 'confirmed', label: 'CONFIRMED', count: confirmedCount },
    { key: 'pending', label: 'PENDING', count: pendingCount },
    { key: 'waitlist', label: 'WAITLIST', count: waitlistCount },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-36 overflow-hidden border-b border-border bg-primary/5">
        <div className="absolute inset-0">
          <WavePattern opacity={0.3} density={40} animated />
        </div>
        <div className="relative z-10 h-full flex flex-col justify-between p-8">
          <div>
            <p className="label-mono mb-1">
              {throwdown.title.toUpperCase()} · {totalCount} REGISTERED
            </p>
            <h2 className="text-xl font-bold text-foreground">Registrants</h2>
          </div>
          <div className="flex items-center justify-between">
            <p className="label-mono text-muted-foreground">
              {registrationOpen
                ? atCapacity
                  ? 'Registration closed — bracket is full'
                  : throwdown.registration_closes_at
                  ? `Closes ${formatDate(throwdown.registration_closes_at)}`
                  : 'Registration open'
                : 'Registration closed'}
            </p>
            {!isAdmin && !myRegistration && registrationOpen && (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <UserPlus size={14} />
                {atCapacity ? 'Join Waitlist' : 'Join'}
              </button>
            )}
            {!isAdmin && myRegistration && registrationOpen && (
              <button
                onClick={handleLeave}
                disabled={loading}
                className="flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                <UserMinus size={14} />
                Leave
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL SIGNED UP', value: totalCount },
            { label: 'CONFIRMED', value: confirmedCount },
            { label: 'PENDING', value: pendingCount },
            { label: 'WAITLIST', value: waitlistCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <p className="label-mono mb-2">{label}</p>
              <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Capacity bar */}
        {throwdown.max_participants !== null && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="label-mono">BRACKET CAPACITY</p>
              <p className="label-mono">{confirmedCount} / {throwdown.max_participants}</p>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  atCapacity ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${Math.min(100, (confirmedCount / throwdown.max_participants) * 100)}%` }}
              />
            </div>
            {atCapacity && (
              <p className="text-xs text-muted-foreground">Bracket is full — accepting waitlist only</p>
            )}
          </div>
        )}

        {/* Admin: Generate Pairings */}
        {isAdmin && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasExistingMatches
                ? 'Pairings already generated for this throwdown.'
                : `${confirmedCount} confirmed registrant${confirmedCount !== 1 ? 's' : ''} ready for pairing.`}
            </p>
            <button
              onClick={handleGeneratePairings}
              disabled={loading || confirmedCount < 2 || hasExistingMatches}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Shuffle size={14} />
              {loading ? 'Generating...' : 'Generate Pairings'}
            </button>
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="relative w-full sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handle or name…"
              className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md font-mono text-[10px] tracking-widest transition-colors',
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Registrant table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[44px_1fr_140px_80px] sm:grid-cols-[44px_1fr_1fr_140px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/20">
            <span className="label-mono">Seed</span>
            <span className="label-mono">Handle</span>
            <span className="label-mono hidden sm:block">Name</span>
            <span className="label-mono">Registered</span>
            <span className="label-mono">Status</span>
          </div>

          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {search ? 'No registrants match your search.' : 'No registrants yet.'}
              </div>
            )}
            {filtered.map(reg => (
              <div
                key={reg.id}
                className="grid grid-cols-[44px_1fr_140px_80px] sm:grid-cols-[44px_1fr_1fr_140px_100px] gap-4 items-center px-5 py-3.5 hover:bg-muted/10 transition-colors"
              >
                {/* Seed */}
                <div className="flex items-center gap-1.5">
                  {reg.seed !== null && (
                    <span className="w-1.5 h-4 rounded-sm bg-primary/80 shrink-0" />
                  )}
                  <span className="font-mono text-xs text-foreground">
                    {reg.seed !== null ? reg.seed : '—'}
                  </span>
                </div>

                {/* Handle */}
                <span className="text-sm font-medium text-foreground truncate">
                  {reg.profile?.username ?? '—'}
                </span>

                {/* Name (same as handle until we have a display_name field) */}
                <span className="text-sm text-muted-foreground truncate hidden sm:block">
                  {reg.profile?.username ?? '—'}
                </span>

                {/* Registered date */}
                <span className="text-xs text-muted-foreground">
                  {formatDate(reg.registered_at)}
                </span>

                {/* Status + admin remove */}
                <div className="flex items-center gap-2">
                  <StatusBadge status={reg.status} />
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(reg.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'font-mono text-[9px] tracking-widest px-2 py-1 rounded shrink-0 flex items-center gap-1',
      status === 'confirmed' && 'bg-primary/15 text-primary',
      status === 'waitlist' && 'bg-muted text-muted-foreground',
      status === 'pending' && 'bg-upcoming/15 text-upcoming',
    )}>
      {status.toUpperCase()}
    </span>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/screens/registrants-view.tsx
git commit -m "feat: add RegistrantsView with stats, capacity bar, table, join/leave/remove, generate pairings"
```

---

## Task 9: ThrowdownDetail Tabbed Container

**Files:**
- Create: `components/screens/throwdown-detail.tsx`

- [ ] **Step 1: Create `components/screens/throwdown-detail.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { RegistrantsView } from './registrants-view'
import { ThrowdownBracket } from './throwdown-bracket'
import type { Throwdown, Registration, Match } from '@/lib/supabase/types'

type Tab = 'registrants' | 'bracket'

interface ThrowdownDetailProps {
  throwdown: Throwdown
  initialRegistrations: Registration[]
  initialMatches: Match[]
  isAdmin: boolean
  currentUserId: string
}

export function ThrowdownDetail({
  throwdown,
  initialRegistrations,
  initialMatches,
  isAdmin,
  currentUserId,
}: ThrowdownDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('registrants')
  const [matches, setMatches] = useState<Match[]>(initialMatches)

  function handlePairingsGenerated(newMatches: Match[]) {
    setMatches(newMatches)
    setActiveTab('bracket')
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="bg-card border-b border-border px-8 flex items-end gap-1">
        {(['registrants', 'bracket'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-mono text-[10px] tracking-widest uppercase border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'registrants' && (
        <RegistrantsView
          throwdown={throwdown}
          initialRegistrations={initialRegistrations}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          hasExistingMatches={matches.length > 0}
          onPairingsGenerated={handlePairingsGenerated}
        />
      )}
      {activeTab === 'bracket' && (
        <ThrowdownBracket throwdown={throwdown} initialMatches={matches} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/screens/throwdown-detail.tsx
git commit -m "feat: add ThrowdownDetail tabbed container (Registrants | Bracket)"
```

---

## Task 10: Update throwdown/[id]/page.tsx

**Files:**
- Modify: `app/(app)/throwdown/[id]/page.tsx`

- [ ] **Step 1: Replace full contents of `app/(app)/throwdown/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThrowdownDetail } from '@/components/screens/throwdown-detail'

export default async function ThrowdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: throwdown } = await supabase
    .from('throwdowns')
    .select('*')
    .eq('id', id)
    .single()

  if (!throwdown) notFound()

  const [matchesResult, registrationsResult, profileResult] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        *,
        submission_a:submission_a_id(*, profile:profile_id(*)),
        submission_b:submission_b_id(*, profile:profile_id(*)),
        winner:winner_id(*, profile:profile_id(*))
      `)
      .eq('throwdown_id', id)
      .order('round', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('registrations')
      .select('*, profile:profile_id(*)')
      .eq('throwdown_id', id)
      .order('seed', { ascending: true, nullsFirst: false }),
    user
      ? supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
  ])

  return (
    <ThrowdownDetail
      throwdown={throwdown}
      initialMatches={matchesResult.data ?? []}
      initialRegistrations={registrationsResult.data ?? []}
      isAdmin={profileResult.data?.is_admin ?? false}
      currentUserId={user?.id ?? ''}
    />
  )
}
```

- [ ] **Step 2: Verify end-to-end**

Run `npm run dev`.

1. Navigate to any throwdown — the page should show a tab bar with "REGISTRANTS" and "BRACKET" tabs.
2. REGISTRANTS tab shows the registrant list (empty if no registrations yet), stat cards, and capacity bar if `max_participants` is set.
3. BRACKET tab shows the existing bracket view.
4. As admin: "Generate Pairings" button visible in Registrants tab. Clicking it (with confirmed registrants) should create matches and switch to the Bracket tab.
5. As non-admin: "Join" button visible if registration window is open and user hasn't registered. After joining, "Leave" button appears.
6. Admin remove (trash icon) removes the row from the list.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/throwdown/\[id\]/page.tsx
git commit -m "feat: update throwdown page to tabbed ThrowdownDetail with registrations"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All spec requirements mapped to tasks:
  - DB migration (Task 1) ✓
  - TypeScript types (Task 2) ✓
  - `/admin` → `/match-control` rename (Task 3) ✓
  - AdminSkeleton + ThrowdownDetailSkeleton (Task 4) ✓
  - page-transition.tsx mappings (Task 5) ✓
  - Remove Generate Pairings from match-control (Task 6) ✓
  - Create Throwdown dialog (Tasks 6+7) ✓
  - Registrants view with all spec features (Task 8) ✓
  - Tabbed ThrowdownDetail (Task 9) ✓
  - Updated throwdown page (Task 10) ✓
- [x] **No placeholders:** All steps have complete code
- [x] **Type consistency:** `Registration`, `ThrowdownFormat`, `RegistrationStatus` defined in Task 2 and used consistently through Tasks 7–10. `handlePairingsGenerated(matches: Match[])` defined in Task 9 matches `onPairingsGenerated: (matches: Match[]) => void` in Task 8.
