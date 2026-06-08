-- Allow the client to call unlock helpers while keeping user isolation.
-- These RPCs are required by the course UI to decide which topics/units can open.

CREATE OR REPLACE FUNCTION public.is_topic_unlocked(_user UUID, _topic UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course UUID;
  _pos INT;
  _prev UUID;
  _total INT;
  _done INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF _user <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  SELECT course_id, position INTO _course, _pos
  FROM public.topics
  WHERE id = _topic;

  IF _course IS NULL OR NOT public.is_enrolled(_user, _course) THEN
    RETURN false;
  END IF;

  SELECT id INTO _prev
  FROM public.topics
  WHERE course_id = _course
    AND position < _pos
  ORDER BY position DESC
  LIMIT 1;

  IF _prev IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO _total
  FROM public.units
  WHERE topic_id = _prev;

  IF _total = 0 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO _done
  FROM public.unit_progress up
  JOIN public.units u ON u.id = up.unit_id
  WHERE u.topic_id = _prev
    AND up.user_id = _user
    AND up.completed = true;

  RETURN _done >= _total;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_unit_unlocked(_user UUID, _unit UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _topic UUID;
  _pos INT;
  _prev UUID;
  _done BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF _user <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;

  SELECT topic_id, position INTO _topic, _pos
  FROM public.units
  WHERE id = _unit;

  IF _topic IS NULL OR NOT public.is_topic_unlocked(_user, _topic) THEN
    RETURN false;
  END IF;

  SELECT id INTO _prev
  FROM public.units
  WHERE topic_id = _topic
    AND position < _pos
  ORDER BY position DESC
  LIMIT 1;

  IF _prev IS NULL THEN
    RETURN true;
  END IF;

  SELECT completed INTO _done
  FROM public.unit_progress
  WHERE user_id = _user
    AND unit_id = _prev;

  RETURN COALESCE(_done, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_topic_unlocked(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_unit_unlocked(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_topic_unlocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_unit_unlocked(UUID, UUID) TO authenticated;
