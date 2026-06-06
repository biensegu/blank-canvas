
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ STARS (rename points) ============
ALTER TABLE public.profiles RENAME COLUMN points TO stars;

CREATE OR REPLACE FUNCTION public.add_stars(_user UUID, _amount INT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET stars = stars + _amount, updated_at = now() WHERE id = _user;
$$;
REVOKE EXECUTE ON FUNCTION public.add_stars(UUID, INT) FROM anon, authenticated, PUBLIC;

DROP FUNCTION IF EXISTS public.add_points(UUID, INT);

-- Admins can see all profiles
CREATE POLICY profiles_select_admin ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ COURSES extras ============
ALTER TABLE public.courses
  ADD COLUMN objectives TEXT,
  ADD COLUMN materials_summary TEXT,
  ADD COLUMN duration_hours INT NOT NULL DEFAULT 0,
  ADD COLUMN region TEXT NOT NULL DEFAULT 'Castilla-La Mancha';

-- Admins can manage courses/topics/units/resources
CREATE POLICY courses_admin_all ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY topics_admin_all ON public.topics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY units_admin_all ON public.units FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY resources_admin_all ON public.resources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY quiz_questions_admin_all ON public.quiz_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ BUNDLES ============
CREATE TABLE public.course_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_bundles TO anon, authenticated;
GRANT ALL ON public.course_bundles TO service_role;
ALTER TABLE public.course_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bundles_select_all ON public.course_bundles FOR SELECT USING (true);
CREATE POLICY bundles_admin_all ON public.course_bundles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ VIDEOCONFERENCES ============
CREATE TABLE public.videoconferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  bbb_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.videoconferences TO authenticated;
GRANT ALL ON public.videoconferences TO service_role;
ALTER TABLE public.videoconferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY vc_select_enrolled ON public.videoconferences FOR SELECT
  USING (public.is_enrolled(auth.uid(), course_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY vc_admin_all ON public.videoconferences FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.vc_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_id UUID NOT NULL REFERENCES public.videoconferences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vc_id, user_id)
);
GRANT SELECT, INSERT ON public.vc_attendance TO authenticated;
GRANT ALL ON public.vc_attendance TO service_role;
ALTER TABLE public.vc_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY vca_select_own ON public.vc_attendance FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY vca_insert_own ON public.vc_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============ ROULETTE ============
CREATE TABLE public.roulette_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_index INT NOT NULL UNIQUE CHECK (slot_index BETWEEN 0 AND 7),
  kind TEXT NOT NULL CHECK (kind IN ('surprise','chest','tutoring')),
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roulette_items TO authenticated;
GRANT ALL ON public.roulette_items TO service_role;
ALTER TABLE public.roulette_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY rou_items_select_auth ON public.roulette_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY rou_items_admin_all ON public.roulette_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.roulette_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.roulette_items(id),
  chosen_option JSONB,
  spun_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roulette_spins TO authenticated;
GRANT ALL ON public.roulette_spins TO service_role;
ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY spins_select_own ON public.roulette_spins FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ ACTIVITY EVENTS ============
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_user_created ON public.activity_events(user_id, created_at DESC);
CREATE INDEX idx_activity_type_created ON public.activity_events(type, created_at DESC);
GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_insert_own ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY activity_admin_select ON public.activity_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ SEED CONTENT ============
INSERT INTO public.courses (slug, title, description, price_cents, accent_color, cover_emoji, position, objectives, materials_summary, duration_hours, region)
VALUES
  ('normativa', 'Normativa', 'Normativa de Castilla-La Mancha para Orientación Educativa. Curso gratuito.', 0, 'teal', '📜', 0,
   'Conocer la normativa vigente de educación en Castilla-La Mancha aplicable a la especialidad de Orientación Educativa.',
   'Legislación estatal y autonómica, decretos, órdenes y resoluciones actualizadas.', 30, 'Castilla-La Mancha'),
  ('programacion', 'Programación', 'Elaboración de la programación didáctica para Orientación Educativa.', 15000, 'coral', '📝', 1,
   'Diseñar una programación didáctica defendible, alineada con la normativa de Castilla-La Mancha.',
   'Plantillas, ejemplos, criterios de evaluación y rúbricas.', 60, 'Castilla-La Mancha'),
  ('supuestos', 'Supuestos', 'Resolución de supuestos prácticos de Orientación Educativa.', 15000, 'amber', '🧩', 2,
   'Aprender a resolver supuestos prácticos con un esquema reproducible.',
   'Banco de supuestos, soluciones comentadas y vídeos de resolución.', 60, 'Castilla-La Mancha'),
  ('temas', 'Temas', 'Desarrollo del temario oficial de Orientación Educativa.', 15000, 'teal', '📚', 3,
   'Dominar el temario oficial con esquemas, resúmenes y vídeos explicativos.',
   'Temario completo en PDF, esquemas, vídeos y cuestionarios.', 120, 'Castilla-La Mancha');

INSERT INTO public.course_bundles (slug, title, description, price_cents, billing_period, position) VALUES
  ('normativa-mas-2', 'Normativa + 2 bloques', 'Normativa (gratis) + 2 bloques a elegir (Programación, Supuestos o Temas).', 17000, 'monthly', 0),
  ('normativa-mas-3', 'Normativa + 3 bloques', 'Normativa (gratis) + los 3 bloques: Programación, Supuestos y Temas.', 18500, 'monthly', 1);

-- ============ SEED ROULETTE (default 8 slots) ============
INSERT INTO public.roulette_items (slot_index, kind, title, weight, payload) VALUES
  (0, 'surprise', 'Sorpresa 1', 10, '{}'::jsonb),
  (1, 'chest',    'Cofre 1',    6,  '{"options":[]}'::jsonb),
  (2, 'surprise', 'Sorpresa 2', 10, '{}'::jsonb),
  (3, 'chest',    'Cofre 2',    6,  '{"options":[]}'::jsonb),
  (4, 'surprise', 'Sorpresa 3', 10, '{}'::jsonb),
  (5, 'chest',    'Cofre 3',    6,  '{"options":[]}'::jsonb),
  (6, 'surprise', 'Sorpresa 4', 10, '{}'::jsonb),
  (7, 'tutoring', 'Tutoría individualizada', 1, '{}'::jsonb);
