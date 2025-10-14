-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'support', 'admin')),
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'network', 'access', 'other')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sla_response_time INTEGER, -- in minutes
  sla_resolution_time INTEGER, -- in minutes
  response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- internal notes only visible to support team
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_history table for audit trail
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for tickets table
CREATE POLICY "Employees can view own tickets" ON public.tickets
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
    )
  );

CREATE POLICY "Employees can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Support can update tickets" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
    )
  );

-- RLS Policies for messages table
CREATE POLICY "Users can view messages for their tickets" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = messages.ticket_id AND (
        tickets.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
        )
      )
    ) AND (
      is_internal = false OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
      )
    )
  );

CREATE POLICY "Users can create messages for their tickets" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = messages.ticket_id AND (
        tickets.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
        )
      )
    )
  );

-- RLS Policies for ticket_history table
CREATE POLICY "Users can view history for their tickets" ON public.ticket_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_history.ticket_id AND (
        tickets.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
        )
      )
    )
  );

CREATE POLICY "System can insert history" ON public.ticket_history
  FOR INSERT WITH CHECK (true);
