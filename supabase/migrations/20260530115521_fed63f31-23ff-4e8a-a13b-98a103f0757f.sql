
-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger: crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- COURSES
-- =========================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL DEFAULT 0,
  cover_emoji TEXT DEFAULT '🧩',
  accent_color TEXT NOT NULL DEFAULT 'teal',  -- teal | coral | gray | amber
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO authenticated, anon;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_select_all" ON public.courses FOR SELECT USING (true);

-- =========================================
-- TOPICS
-- =========================================
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  bonus_points INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topics TO authenticated, anon;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_select_all" ON public.topics FOR SELECT USING (true);

-- =========================================
-- UNITS
-- =========================================
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  youtube_video_id TEXT,                 -- ej: "dQw4w9WgXcQ"
  min_watch_percent INT NOT NULL DEFAULT 90,
  base_points INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.units TO authenticated, anon;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_select_all" ON public.units FOR SELECT USING (true);

-- =========================================
-- ENROLLMENTS
-- =========================================
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
GRANT SELECT, INSERT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_select_own" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enrollments_insert_own" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Helper: ¿está inscrito?
CREATE OR REPLACE FUNCTION public.is_enrolled(_user UUID, _course UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = _user AND course_id = _course)
$$;

-- =========================================
-- RESOURCES
-- =========================================
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf','ppt','doc','video','link')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
-- Solo los inscritos al curso pueden ver los recursos
CREATE POLICY "resources_select_enrolled" ON public.resources FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.topics t ON t.id = u.topic_id
    WHERE u.id = resources.unit_id
      AND public.is_enrolled(auth.uid(), t.course_id)
  )
);

-- =========================================
-- UNIT PROGRESS
-- =========================================
CREATE TABLE public.unit_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  video_percent INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, unit_id)
);
GRANT SELECT, INSERT, UPDATE ON public.unit_progress TO authenticated;
GRANT ALL ON public.unit_progress TO service_role;
ALTER TABLE public.unit_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_select_own" ON public.unit_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON public.unit_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON public.unit_progress FOR UPDATE USING (auth.uid() = user_id);

-- =========================================
-- QUIZ QUESTIONS
-- =========================================
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,                 -- array de strings
  correct_index INT NOT NULL,
  points INT NOT NULL DEFAULT 5,
  position INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_select_enrolled" ON public.quiz_questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.topics t ON t.id = u.topic_id
    WHERE u.id = quiz_questions.unit_id
      AND public.is_enrolled(auth.uid(), t.course_id)
  )
);

-- =========================================
-- QUIZ ATTEMPTS
-- =========================================
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total INT NOT NULL,
  points_earned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select_own" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "attempts_insert_own" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================
-- FUNCIONES DE DESBLOQUEO
-- =========================================
-- ¿Tema desbloqueado? Primer tema siempre, los demás si el anterior está 100% completado
CREATE OR REPLACE FUNCTION public.is_topic_unlocked(_user UUID, _topic UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _course UUID; _pos INT; _prev UUID; _total INT; _done INT;
BEGIN
  SELECT course_id, position INTO _course, _pos FROM public.topics WHERE id = _topic;
  IF _user IS NULL OR NOT public.is_enrolled(_user, _course) THEN RETURN false; END IF;
  IF _pos = 0 THEN RETURN true; END IF;
  SELECT id INTO _prev FROM public.topics WHERE course_id = _course AND position < _pos ORDER BY position DESC LIMIT 1;
  IF _prev IS NULL THEN RETURN true; END IF;
  SELECT COUNT(*) INTO _total FROM public.units WHERE topic_id = _prev;
  IF _total = 0 THEN RETURN true; END IF;
  SELECT COUNT(*) INTO _done FROM public.unit_progress up
    JOIN public.units u ON u.id = up.unit_id
    WHERE u.topic_id = _prev AND up.user_id = _user AND up.completed = true;
  RETURN _done >= _total;
END;
$$;

-- ¿Unidad desbloqueada? Primera unidad si el tema está desbloqueado; las demás si la anterior está completa
CREATE OR REPLACE FUNCTION public.is_unit_unlocked(_user UUID, _unit UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _topic UUID; _pos INT; _prev UUID; _done BOOLEAN;
BEGIN
  SELECT topic_id, position INTO _topic, _pos FROM public.units WHERE id = _unit;
  IF NOT public.is_topic_unlocked(_user, _topic) THEN RETURN false; END IF;
  IF _pos = 0 THEN RETURN true; END IF;
  SELECT id INTO _prev FROM public.units WHERE topic_id = _topic AND position < _pos ORDER BY position DESC LIMIT 1;
  IF _prev IS NULL THEN RETURN true; END IF;
  SELECT completed INTO _done FROM public.unit_progress WHERE user_id = _user AND unit_id = _prev;
  RETURN COALESCE(_done, false);
END;
$$;

-- Otorgar puntos al perfil (usado al completar unidad o quiz)
CREATE OR REPLACE FUNCTION public.add_points(_user UUID, _amount INT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET points = points + _amount, updated_at = now() WHERE id = _user;
$$;
