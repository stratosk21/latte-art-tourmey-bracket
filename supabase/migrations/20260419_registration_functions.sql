-- Registration function: atomically registers current user for a throwdown.
-- Returns the new registration's uuid.
-- NOTE: No SELECT...INTO used — Supabase SQL editor treats that as table creation.
-- All variable assignments use := (subquery) form instead.
CREATE OR REPLACE FUNCTION register_for_throwdown(p_throwdown_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $register$
DECLARE
  v_max_participants  integer;
  v_opens_at          timestamptz;
  v_closes_at         timestamptz;
  v_count             integer;
  v_status            text;
  v_seed              integer;
  v_id                uuid;
BEGIN
  -- Lock throwdown row to serialize concurrent registrations
  v_max_participants := (SELECT max_participants         FROM public.throwdowns WHERE id = p_throwdown_id FOR UPDATE);
  v_opens_at         := (SELECT registration_opens_at   FROM public.throwdowns WHERE id = p_throwdown_id);
  v_closes_at        := (SELECT registration_closes_at  FROM public.throwdowns WHERE id = p_throwdown_id);

  IF v_max_participants IS NULL AND v_opens_at IS NULL AND v_closes_at IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.throwdowns WHERE id = p_throwdown_id) THEN
      RAISE EXCEPTION 'Throwdown not found';
    END IF;
  END IF;

  IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;

  IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
    RAISE EXCEPTION 'Registration not open yet';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.registrations
    WHERE throwdown_id = p_throwdown_id AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already registered';
  END IF;

  v_count := (
    SELECT COUNT(*)
    FROM public.registrations
    WHERE throwdown_id = p_throwdown_id
      AND status = 'confirmed'
  );

  IF v_max_participants IS NULL OR v_count < v_max_participants THEN
    v_status := 'confirmed';
    v_seed   := v_count + 1;
  ELSE
    v_status := 'waitlist';
    v_seed   := NULL;
  END IF;

  INSERT INTO public.registrations (throwdown_id, profile_id, status, seed)
  VALUES (p_throwdown_id, auth.uid(), v_status, v_seed);

  v_id := (
    SELECT id FROM public.registrations
    WHERE throwdown_id = p_throwdown_id AND profile_id = auth.uid()
  );

  RETURN v_id;
END;
$register$;

-- Trigger function: auto-promotes the oldest waitlist entry when a confirmed
-- registration is deleted (user withdraws or admin removes).
CREATE OR REPLACE FUNCTION promote_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $promote$
DECLARE
  _limit                    integer;
  _current_confirmed_count  integer;
  _next_in_line_id          uuid;
BEGIN
  IF OLD.status != 'confirmed' THEN
    RETURN OLD;
  END IF;

  -- Lock throwdown row to prevent concurrent promotions
  _limit := (SELECT max_participants FROM public.throwdowns WHERE id = OLD.throwdown_id FOR UPDATE);

  IF _limit IS NULL THEN
    RETURN OLD;
  END IF;

  _current_confirmed_count := (
    SELECT COUNT(*)
    FROM public.registrations
    WHERE throwdown_id = OLD.throwdown_id
      AND status = 'confirmed'
  );

  IF _current_confirmed_count < _limit THEN
    _next_in_line_id := (
      SELECT id FROM public.registrations
      WHERE throwdown_id = OLD.throwdown_id
        AND status = 'waitlist'
      ORDER BY registered_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    );

    IF _next_in_line_id IS NOT NULL THEN
      UPDATE public.registrations
        SET status = 'confirmed',
            seed = (
              SELECT COALESCE(MAX(seed), 0) + 1
                FROM public.registrations
                WHERE throwdown_id = OLD.throwdown_id
                  AND status = 'confirmed'
            )
        WHERE id = _next_in_line_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$promote$;

CREATE TRIGGER on_registration_delete
  AFTER DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION promote_waitlist();
