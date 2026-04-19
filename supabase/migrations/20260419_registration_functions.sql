-- Registration function: atomically registers current user for a throwdown.
-- Returns the new registration's uuid.
CREATE OR REPLACE FUNCTION register_for_throwdown(p_throwdown_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $register$
DECLARE
  v_max_participants  integer;
  v_opens_at          timestamptz;
  v_closes_at         timestamptz;
  v_count             integer;
  v_status            text;
  v_seed              integer;
  v_id                uuid;
BEGIN
  SELECT max_participants, registration_opens_at, registration_closes_at
    INTO v_max_participants, v_opens_at, v_closes_at
    FROM throwdowns
    WHERE id = p_throwdown_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Throwdown not found';
  END IF;

  IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;

  IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
    RAISE EXCEPTION 'Registration not open yet';
  END IF;

  v_count := (
    SELECT COUNT(*)
    FROM registrations
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

  INSERT INTO registrations (throwdown_id, profile_id, status, seed)
  VALUES (p_throwdown_id, auth.uid(), v_status, v_seed)
  ON CONFLICT (throwdown_id, profile_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN RAISE EXCEPTION 'Already registered'; END IF;
  RETURN v_id;
END;
$register$;

-- Trigger function: auto-promotes the oldest waitlist entry when a confirmed
-- registration is deleted (user withdraws or admin removes).
CREATE OR REPLACE FUNCTION promote_waitlist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $promote$
DECLARE
  v_max_participants  integer;
  v_count             integer;
BEGIN
  IF OLD.status != 'confirmed' THEN RETURN OLD; END IF;

  SELECT max_participants
    INTO v_max_participants
    FROM throwdowns
    WHERE id = OLD.throwdown_id;

  IF v_max_participants IS NULL THEN RETURN OLD; END IF;

  v_count := (
    SELECT COUNT(*)
    FROM registrations
    WHERE throwdown_id = OLD.throwdown_id
      AND status = 'confirmed'
  );

  IF v_count < v_max_participants THEN
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
$promote$;

CREATE TRIGGER on_registration_delete
  AFTER DELETE ON registrations
  FOR EACH ROW EXECUTE FUNCTION promote_waitlist();
