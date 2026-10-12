-- BAYONA Life Game 1.0.8 — área opcional de vida en tareas existentes.
-- Se añade sobre 0006 sin rehacer ni borrar filas actuales.
ALTER TABLE public.planner_items
  ADD COLUMN IF NOT EXISTS area text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_items_life_area_allowed'
      AND conrelid = 'public.planner_items'::regclass
  ) THEN
    ALTER TABLE public.planner_items
      ADD CONSTRAINT planner_items_life_area_allowed
      CHECK (area IS NULL OR area IN (
        'body', 'mind', 'work', 'relationships', 'purpose'
      ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS planner_items_user_area_day_idx
  ON public.planner_items (user_id, area, day)
  WHERE area IS NOT NULL;

-- RLS de 0006 sigue intacto: auth.uid() = user_id.
-- No hay nueva tabla de XP; la economía sigue en la fuente original.
