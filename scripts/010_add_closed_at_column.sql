-- Add closed_at column to tickets table if missing (for legacy environments)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'closed_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.tickets ADD COLUMN closed_at TIMESTAMPTZ';
  END IF;
END;
$$;
