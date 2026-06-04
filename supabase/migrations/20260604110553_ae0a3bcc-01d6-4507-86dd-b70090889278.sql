ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_user_blocked(_user uuid, _blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET blocked = _blocked, updated_at = now() WHERE id = _user;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_blocked(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.set_user_blocked(uuid, boolean) TO authenticated;