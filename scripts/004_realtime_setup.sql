-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_history;

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
  COUNT(*) FILTER (WHERE resolved_at > resolution_deadline) as sla_resolution_breached
FROM public.tickets;

-- Grant access to the view
GRANT SELECT ON public.ticket_stats TO authenticated;
