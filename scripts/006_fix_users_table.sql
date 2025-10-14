-- Remove foreign key constraint from users table to allow standalone usage
-- This allows us to create test users without Supabase Auth integration

-- Drop existing foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Make id column use gen_random_uuid() as default
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Recreate the table without foreign key for simpler testing
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'support', 'admin')),
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate dependent tables
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.ticket_history CASCADE;

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'network', 'access', 'other')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sla_response_time INTEGER,
  sla_resolution_time INTEGER,
  response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_history table
CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified for testing without auth)
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tickets" ON public.tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on ticket_history" ON public.ticket_history FOR ALL USING (true) WITH CHECK (true);
