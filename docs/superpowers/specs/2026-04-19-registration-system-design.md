# Registration System — Spec 1 (Format B)

**Date:** 2026-04-19
**Scope:** Core registration flow, throwdown creation, registrant management, admin tooling updates.
**Out of scope:** Format C (submission-based scoring, judging UI) — covered in a future spec.

---

## Overview

Throwdowns gain a full registration lifecycle: admin creates a throwdown with a capacity and registration window, Discord users sign up (auto-confirmed up to capacity, then waitlisted), and an admin generates pairings from the confirmed list. The bracket view is unchanged; it gains a "Registrants" tab alongside it.

Two tournament formats exist in the data model from day one:

| Format | Value | Status |
|---|---|---|
| Registration-based | `registration` | **Implemented in this spec** |
| Submission-based scoring | `submission_scoring` | UI stub only — button disabled |

---

## Database Migration

Run the scripts **in the order listed below**. Each section is safe to run as one transaction.

### Script 1 — Extend `throwdowns` table

```sql
ALTER TABLE throwdowns
  ADD COLUMN format text NOT NULL DEFAULT 'registration'
    CHECK (format IN ('registration', 'submission_scoring')),
  ADD COLUMN max_participants integer,
  ADD COLUMN registration_opens_at timestamptz,
  ADD COLUMN registration_closes_at timestamptz;
```

- `format`: determines tournament type; defaults to `registration`.
- `max_participants`: `NULL` means unlimited confirmed spots.
- `registration_opens_at`: `NULL` means registration is open immediately on creation.
- `registration_closes_at`: `NULL` means registration never closes automatically.

### Script 2 — Make `submissions.image_url` nullable

Format B participants have no image to submit. Submission records are still created per registrant when pairings are generated, so the existing matches/bracket joins stay intact.

```sql
ALTER TABLE submissions ALTER COLUMN image_url DROP NOT NULL;
```

### Script 3 — Create `registrations` table

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
```

- `status`: `confirmed` = in bracket, `waitlist` = over capacity, `pending` = reserved for future admin-gated flows.
- `seed`: assigned at confirm time (registration order, 1-based); `NULL` for waitlisted entries.

### Script 4 — Row Level Security

```sql
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can view registrations (public registrant list)
CREATE POLICY "reg_select" ON registrations
  FOR SELECT USING (true);

-- Users can only insert their own registration (status is set by the DB function)
CREATE POLICY "reg_insert" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users withdraw themselves; admins remove anyone
CREATE POLICY "reg_delete" ON registrations
  FOR DELETE USING (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can update status or seed
CREATE POLICY "reg_update" ON registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
```

### Script 5 — Registration function (atomic, capacity-safe)

```sql
CREATE OR REPLACE FUNCTION register_for_throwdown(p_throwdown_id uuid)
RETURNS registrations
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_td    throwdowns;
  v_count integer;
  v_reg   registrations;
BEGIN
  -- Lock throwdown row to prevent race conditions on capacity check
  SELECT * INTO v_td FROM throwdowns WHERE id = p_throwdown_id FOR UPDATE;

  IF v_td.registration_closes_at IS NOT NULL AND now() > v_td.registration_closes_at THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;

  IF v_td.registration_opens_at IS NOT NULL AND now() < v_td.registration_opens_at THEN
    RAISE EXCEPTION 'Registration not open yet';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM registrations
    WHERE throwdown_id = p_throwdown_id AND status = 'confirmed';

  INSERT INTO registrations (throwdown_id, profile_id, status, seed)
  VALUES (
    p_throwdown_id,
    auth.uid(),
    CASE
      WHEN v_td.max_participants IS NULL OR v_count < v_td.max_participants
      THEN 'confirmed'
      ELSE 'waitlist'
    END,
    CASE
      WHEN v_td.max_participants IS NULL OR v_count < v_td.max_participants
      THEN v_count + 1
      ELSE NULL
    END
  )
  ON CONFLICT (throwdown_id, profile_id) DO NOTHING
  RETURNING * INTO v_reg;

  IF v_reg IS NULL THEN
    RAISE EXCEPTION 'Already registered';
  END IF;

  RETURN v_reg;
END;
$$;
```

### Script 6 — Waitlist promotion trigger

Fires after a confirmed registration is deleted (user withdraws or admin removes). Automatically promotes the oldest waitlist entry.

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
    FROM registrations
    WHERE throwdown_id = OLD.throwdown_id AND status = 'confirmed';

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
      ORDER BY registered_at ASC
      LIMIT 1
    );
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER on_registration_delete
  AFTER DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION promote_waitlist();
```

---

## Routing Changes

| Old route | New route | Notes |
|---|---|---|
| `/admin` | `/match-control` | Directory rename: `app/(app)/admin` → `app/(app)/match-control` |
| `/throwdown/[id]` | `/throwdown/[id]` | Same URL; page restructured to tabbed layout |

The sidebar navigation label "Match Control" already matches the new URL.

---

## TypeScript Types

Add to `lib/supabase/types.ts`:

```ts
export type RegistrationStatus = 'confirmed' | 'pending' | 'waitlist'
export type ThrowdownFormat = 'registration' | 'submission_scoring'

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

Extend `Throwdown`:

```ts
export interface Throwdown {
  // ...existing fields...
  format: ThrowdownFormat
  max_participants: number | null
  registration_opens_at: string | null
  registration_closes_at: string | null
}
```

---

## Component Architecture

### New components

**`components/screens/throwdown-detail.tsx`**
Client component. Owns `activeTab: 'registrants' | 'bracket'` state. Props: `throwdown`, `registrations`, `initialMatches`, `isAdmin`, `currentUserId`.

**`components/screens/registrants-view.tsx`**
Registrant list UI. Layout matches the provided mockup:
- 4 stat cards: Total Signed Up / Confirmed / Pending / Waitlist
- Capacity progress bar (`confirmed / max_participants`); shows "Bracket is full — accepting waitlist only" when at capacity
- Search input (filters by handle or name)
- Filter tabs: ALL / CONFIRMED / PENDING / WAITLIST
- Table columns: Seed ↕ | Handle ↕ | Name | Registered ↕ | Status | (actions)
- **Join button** (non-admin, not-yet-registered, registration window open)
- **Leave button** (non-admin, registered, registration window open)
- **Generate Pairings button** (admin only, confirmed count ≥ 2)
- Per-row **Remove** button (admin only, trash icon)

**`components/screens/create-throwdown-dialog.tsx`**
Modal dialog. Fields:
- Title (required)
- Description (optional)
- Format: `Registration-based` button | `Submission-based` button (disabled, tooltip "Coming soon")
- Max participants (number, optional — leave blank for unlimited)
- Registration opens at (datetime-local, optional)
- Registration closes at (datetime-local, optional)

On submit: `supabase.from('throwdowns').insert(...)` then router refresh.

**`components/ui/skeletons.tsx` additions**
- `AdminSkeleton` — matches `/match-control` header + selector + table layout
- `ThrowdownDetailSkeleton` — matches tabbed throwdown header + registrant table layout

### Updated components

**`app/(app)/match-control/page.tsx`** (renamed from `admin`)
- Add "**+ New Throwdown**" button to header area
- Renders `CreateThrowdownDialog` controlled by a boolean state
- Removes `handleGeneratePairings` and its button entirely from `AdminView`

**`app/(app)/throwdown/[id]/page.tsx`**
Additional server-side fetches:
```ts
// Fetch registrations with profiles
const { data: registrations } = await supabase
  .from('registrations')
  .select('*, profile:profile_id(*)')
  .eq('throwdown_id', id)
  .order('seed', { ascending: true, nullsFirst: false })

// Check if current user is admin
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()
```

Renders `<ThrowdownDetail>` instead of `<ThrowdownBracket>` directly.

**`components/page-transition.tsx`**
Add skeleton mappings:
```ts
if (path === '/match-control') return AdminSkeleton
if (path.startsWith('/throwdown/')) return ThrowdownDetailSkeleton
```

---

## Registration Data Flow

### User joins
```
Click "Join"
  → supabase.rpc('register_for_throwdown', { p_throwdown_id: id })
  → DB checks window + capacity atomically (row-lock on throwdown)
  → Returns registration: status = 'confirmed' or 'waitlist'
  → Client appends to local registrations list
```

### User leaves / Admin removes
```
Click "Leave" or admin trash icon
  → supabase.from('registrations').delete().eq('id', reg.id)
  → DB trigger fires: promote_waitlist()
  → Oldest waitlist entry promoted to confirmed (if capacity freed)
  → Client removes row from local state
```

### Admin generates pairings (Format B)
```
Click "Generate Pairings"
  → Read confirmed registrations ordered by seed
  → For each registrant, upsert a submission record (image_url: null)
  → Shuffle pairs using crypto-random (existing cryptoShuffle)
  → Insert match rows using submission IDs
  → Bracket tab becomes navigable
```

---

## Admin Tooling

- **Generate Pairings** button moves from `/match-control` → Registrants tab on `/throwdown/[id]`
- `/match-control` keeps: throwdown selector, match list, set winner, delete match
- `/match-control` gains: **+ New Throwdown** button → `CreateThrowdownDialog`

---

## Skeleton Coverage

| Route | Skeleton component |
|---|---|
| `/match-control` | `AdminSkeleton` (new) |
| `/throwdown/[id]` | `ThrowdownDetailSkeleton` (replaces `BracketSkeleton`) |
| `/dashboard` | `DashboardSkeleton` (existing, unchanged) |
| `/archive` | `ArchiveSkeleton` (existing, unchanged) |

---

## Out of Scope (Spec 2)

- Scoring criteria configuration
- Submission upload UI for Format C participants
- Judge scoring interface
- Score-based seeding
- Judge role / throwdown assignment
