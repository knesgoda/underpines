-- Pre-beta security hardening (3/3): stop the age-gate audit log being an open
-- write target.
--
-- The log carried the only `TO anon WITH CHECK (true)` INSERT policy in the
-- schema, so anyone could write arbitrary rows into the exact trail you'd rely
-- on in a COPPA inquiry — floodable and poisonable. Replace the open policy
-- with a definer RPC that only writes the two validated enum columns, so the
-- shape and values of every audit row are controlled. (The pre-account gate
-- runs before sign-in, so the RPC stays callable by anon — but it can no longer
-- be used to insert junk into other columns.)

DROP POLICY IF EXISTS "Anyone can insert age audit log" ON public.age_gate_audit_log;

CREATE OR REPLACE FUNCTION public.record_age_gate_event(_age_bracket text, _action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _age_bracket NOT IN ('under_13', '13_to_17', '18_plus') THEN RETURN; END IF;
  IF _action NOT IN ('blocked', 'passed') THEN RETURN; END IF;
  INSERT INTO public.age_gate_audit_log (age_bracket, action)
  VALUES (_age_bracket, _action);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_age_gate_event(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_age_gate_event(text, text) TO anon, authenticated;
