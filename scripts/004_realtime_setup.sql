-- Enable Realtime for tables (avoid duplicate additions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ticket_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_history;
  END IF;
END;
$$;

-- Ensure optional columns exist (for environments criados antes das migrations mais recentes)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Create a view for ticket statistics (for BI dashboard)
CREATE OR REPLACE VIEW public.ticket_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'waiting_response') as waiting_response_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
  COUNT(*) FILTER (WHERE priority = 'critical') as critical_tickets,
  COUNT(*) FILTER (WHERE priority = 'high') as high_tickets,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_tickets,
  COUNT(*) FILTER (WHERE priority = 'low') as low_tickets,
  AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/60) FILTER (WHERE responded_at IS NOT NULL) as avg_response_time_minutes,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes,
  COUNT(*) FILTER (WHERE responded_at > response_deadline) as sla_response_breached,
  COUNT(*) FILTER (WHERE resolved_at > resolution_deadline) as sla_resolution_breached,
  COUNT(*) FILTER (WHERE resolution_rating IS NOT NULL) as rated_tickets,
  AVG(resolution_rating) FILTER (WHERE resolution_rating IS NOT NULL) as avg_resolution_rating,
  COUNT(*) FILTER (WHERE resolution_feedback IS NOT NULL AND TRIM(resolution_feedback) <> '') as feedback_tickets
FROM public.tickets;

-- Grant access to the view
GRANT SELECT ON public.ticket_stats TO authenticated;
