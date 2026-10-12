-- BAYONA · Mi Día 2.0 (aditivo sobre 0006/0007).
-- Guarda la plantilla recurrente una sola vez y las excepciones por fecha.
ALTER TABLE public.planner_items
  ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS repeat_until date,
  ADD COLUMN IF NOT EXISTS recurrence_exceptions jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planner_items_recurrence_allowed'
      AND conrelid = 'public.planner_items'::regclass
  ) THEN
    ALTER TABLE public.planner_items
      ADD CONSTRAINT planner_items_recurrence_allowed
      CHECK (recurrence IN ('none', 'daily', 'weekdays', 'weekly'));
  END IF;
END $$;

-- Mantener políticas RLS del planificador. No se crea una economía nueva.
