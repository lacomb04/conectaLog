-- Create table to store ConectaBot knowledge base articles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_knowledge'
  ) THEN
    CREATE TABLE public.ai_knowledge (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      source TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category ON public.ai_knowledge(category);
    CREATE INDEX IF NOT EXISTS idx_ai_knowledge_tags ON public.ai_knowledge USING GIN(tags);
  END IF;
END;
$$;

-- Ensure development-friendly RLS policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_knowledge'
  ) THEN
    -- table was just created above; enable RLS and add permissive policy
    ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow all operations on ai_knowledge"
      ON public.ai_knowledge
      FOR ALL
      USING (true)
      WITH CHECK (true);
  ELSE
    -- table already existed, ensure RLS is enabled and the policy is present
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'ai_knowledge'
        AND policyname = 'Allow all operations on ai_knowledge'
    ) THEN
      ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow all operations on ai_knowledge"
        ON public.ai_knowledge
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END;
$$;
