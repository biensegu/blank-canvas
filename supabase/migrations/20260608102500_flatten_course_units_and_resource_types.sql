-- Product structure: courses contain units directly; units contain resources.
-- Existing data keeps using topics as a technical compatibility container.

ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_type_check;

ALTER TABLE public.resources
  ADD CONSTRAINT resources_type_check
  CHECK (type IN (
    'pdf',
    'image',
    'video',
    'file',
    'videoconference',
    'ppt',
    'doc',
    'link'
  ));

UPDATE public.topics
SET
  title = 'Contenido',
  description = COALESCE(description, 'Contenedor tecnico de unidades.'),
  bonus_points = 0
WHERE title IN ('Tema_1', 'Prueba de Normativa_1');

UPDATE public.units
SET
  youtube_video_id = NULL,
  min_watch_percent = 0
WHERE youtube_video_id IS NOT NULL OR min_watch_percent <> 0;

DROP POLICY IF EXISTS progress_update_own ON public.unit_progress;
CREATE POLICY progress_update_own ON public.unit_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS progress_insert_own ON public.unit_progress;
CREATE POLICY progress_insert_own ON public.unit_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);
