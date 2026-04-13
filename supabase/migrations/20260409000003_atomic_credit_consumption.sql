-- Atomic credit consumption: claim one unused credit in a single UPDATE
-- using a row-level lock (FOR UPDATE SKIP LOCKED) to prevent double-spend.
-- Returns { status: "ok", credit_id } on success or { status: "no_credit" }.
CREATE OR REPLACE FUNCTION consume_square_credit(
  p_user_id  UUID,
  p_square_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit_id UUID;
BEGIN
  -- Atomically lock and claim one unused credit.
  -- SKIP LOCKED means concurrent calls get a different row (or nothing),
  -- so two simultaneous requests can never both claim the same credit.
  SELECT id INTO v_credit_id
  FROM square_credits
  WHERE user_id = p_user_id
    AND used_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_credit_id IS NULL THEN
    RETURN jsonb_build_object('status', 'no_credit');
  END IF;

  UPDATE square_credits
  SET used_on_square_id = p_square_id,
      used_at           = NOW()
  WHERE id = v_credit_id;

  RETURN jsonb_build_object(
    'status',    'ok',
    'credit_id', v_credit_id::TEXT
  );
END;
$$;


-- Refund a credit that was just consumed but whose associated action failed.
-- Only allows refunding within a 5-minute safety window to prevent abuse.
CREATE OR REPLACE FUNCTION refund_square_credit(
  p_credit_id UUID,
  p_user_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE square_credits
  SET used_at           = NULL,
      used_on_square_id = NULL
  WHERE id      = p_credit_id
    AND user_id = p_user_id
    AND used_at IS NOT NULL
    AND used_at > NOW() - INTERVAL '5 minutes';
END;
$$;
