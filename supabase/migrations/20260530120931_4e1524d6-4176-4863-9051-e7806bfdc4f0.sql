
-- 1. Restrict profiles SELECT to own profile only
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);

-- 2. Add enrollment check to quiz_attempts INSERT
DROP POLICY IF EXISTS attempts_insert_own ON public.quiz_attempts;
CREATE POLICY attempts_insert_own ON public.quiz_attempts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.topics t ON t.id = u.topic_id
    WHERE u.id = quiz_attempts.unit_id
      AND public.is_enrolled(auth.uid(), t.course_id)
  )
);

-- 3. Hide correct_index from clients via column-level revoke
REVOKE SELECT (correct_index) ON public.quiz_questions FROM anon, authenticated;

-- Server-side answer validation function (callable by enrolled users)
CREATE OR REPLACE FUNCTION public.check_quiz_answer(_question uuid, _answer integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quiz_questions q
    JOIN public.units u ON u.id = q.unit_id
    JOIN public.topics t ON t.id = u.topic_id
    WHERE q.id = _question
      AND q.correct_index = _answer
      AND public.is_enrolled(auth.uid(), t.course_id)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.check_quiz_answer(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, integer) TO authenticated;

-- 4. Constrain unit_progress UPDATE: 'completed' can only be true when video_percent meets unit's min_watch_percent
DROP POLICY IF EXISTS progress_update_own ON public.unit_progress;
CREATE POLICY progress_update_own ON public.unit_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    completed = false
    OR video_percent >= (SELECT min_watch_percent FROM public.units WHERE id = unit_progress.unit_id)
  )
);

DROP POLICY IF EXISTS progress_insert_own ON public.unit_progress;
CREATE POLICY progress_insert_own ON public.unit_progress FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    completed = false
    OR video_percent >= (SELECT min_watch_percent FROM public.units WHERE id = unit_progress.unit_id)
  )
);

-- 5. Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- These are used inside RLS policies and run regardless of EXECUTE grants on the helper.
REVOKE EXECUTE ON FUNCTION public.add_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_topic_unlocked(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_unit_unlocked(uuid, uuid) FROM PUBLIC, anon, authenticated;
