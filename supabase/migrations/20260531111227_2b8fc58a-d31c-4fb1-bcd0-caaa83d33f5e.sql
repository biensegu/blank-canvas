
-- Dedup table for star awards
CREATE TABLE IF NOT EXISTS public.star_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, ref_id)
);
GRANT SELECT ON public.star_awards TO authenticated;
GRANT ALL ON public.star_awards TO service_role;
ALTER TABLE public.star_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY star_awards_select_own ON public.star_awards
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Award star with dedup
CREATE OR REPLACE FUNCTION public.award_star_dedup(_user UUID, _reason TEXT, _ref TEXT, _amount INT DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  BEGIN
    INSERT INTO public.star_awards(user_id, reason, ref_id, amount) VALUES (_user, _reason, _ref, _amount);
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
  UPDATE public.profiles SET stars = stars + _amount, updated_at = now() WHERE id = _user;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.award_star_dedup(UUID, TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;

-- Spin roulette server-side (weighted random + insert)
CREATE OR REPLACE FUNCTION public.spin_roulette(_user UUID)
RETURNS public.roulette_spins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stars INT;
  _spins_done INT;
  _allowed INT;
  _total_weight INT;
  _pick INT;
  _cum INT := 0;
  _row RECORD;
  _spin public.roulette_spins;
BEGIN
  SELECT stars INTO _stars FROM public.profiles WHERE id = _user;
  IF _stars IS NULL THEN RAISE EXCEPTION 'no profile'; END IF;
  _allowed := _stars / 10;
  SELECT COUNT(*) INTO _spins_done FROM public.roulette_spins WHERE user_id = _user;
  IF _spins_done >= _allowed THEN RAISE EXCEPTION 'no spins available'; END IF;
  SELECT COALESCE(SUM(weight), 0) INTO _total_weight FROM public.roulette_items;
  IF _total_weight <= 0 THEN RAISE EXCEPTION 'no roulette items'; END IF;
  _pick := 1 + floor(random() * _total_weight)::INT;
  FOR _row IN SELECT id, weight FROM public.roulette_items ORDER BY slot_index LOOP
    _cum := _cum + _row.weight;
    IF _pick <= _cum THEN
      INSERT INTO public.roulette_spins(user_id, item_id) VALUES (_user, _row.id) RETURNING * INTO _spin;
      RETURN _spin;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'spin failed';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.spin_roulette(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_roulette(UUID) TO authenticated;

-- Storage bucket for course files
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "course_files_admin_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'course-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "course_files_read_authenticated"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-files' AND auth.uid() IS NOT NULL);

-- Seed roulette items (8 slots) if empty
INSERT INTO public.roulette_items (slot_index, kind, title, payload, weight)
SELECT * FROM (VALUES
  (0, 'surprise', 'Sorpresa: Plantilla de programación', '{"note":"Te enviaremos una plantilla por email"}'::jsonb, 10),
  (1, 'chest', 'Cofre: PDF resumen o vídeo extra', '{"options":[{"label":"PDF resumen","value":"pdf"},{"label":"Vídeo extra","value":"video"}]}'::jsonb, 6),
  (2, 'surprise', 'Sorpresa: Acceso a quiz bonus', '{"note":"Quiz extra de repaso"}'::jsonb, 10),
  (3, 'tutoring', 'Tutoría individualizada (30 min)', '{"note":"Sesión 1:1 con tu tutor"}'::jsonb, 1),
  (4, 'surprise', 'Sorpresa: Esquema visual', '{"note":"Esquema visual del tema"}'::jsonb, 10),
  (5, 'chest', 'Cofre: Supuesto resuelto o caso real', '{"options":[{"label":"Supuesto resuelto","value":"supuesto"},{"label":"Caso real","value":"caso"}]}'::jsonb, 6),
  (6, 'surprise', 'Sorpresa: 5 estrellas extra', '{"bonus_stars":5}'::jsonb, 10),
  (7, 'chest', 'Cofre: Audio resumen o ficha imprimible', '{"options":[{"label":"Audio resumen","value":"audio"},{"label":"Ficha imprimible","value":"ficha"}]}'::jsonb, 6)
) AS v(slot_index, kind, title, payload, weight)
WHERE NOT EXISTS (SELECT 1 FROM public.roulette_items);
