-- Add resolution feedback metadata columns to tickets and adjust RLS for employee feedback
DO $$
BEGIN
  -- Add columns only when they do not exist yet
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'resolution_rating'
  ) THEN
    EXECUTE 'ALTER TABLE public.tickets ADD COLUMN resolution_rating INTEGER CHECK (resolution_rating BETWEEN 1 AND 5)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'resolution_feedback'
  ) THEN
    EXECUTE 'ALTER TABLE public.tickets ADD COLUMN resolution_feedback TEXT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'resolution_confirmed_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.tickets ADD COLUMN resolution_confirmed_at TIMESTAMPTZ';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'resolution_confirmed_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.tickets ADD COLUMN resolution_confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL';
  END IF;
END;
$$;

-- Ensure an employee policy exists so requesters can close their own tickets with feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tickets'
      AND policyname = 'Employees can close own tickets'
  ) THEN
    CREATE POLICY "Employees can close own tickets"
      ON public.tickets
      FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);
  END IF;
END;
$$;
