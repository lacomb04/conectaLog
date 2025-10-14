-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.tickets;
  new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate SLA deadlines based on priority
CREATE OR REPLACE FUNCTION calculate_sla_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  -- Set SLA times based on priority (in minutes)
  CASE NEW.priority
    WHEN 'critical' THEN
      NEW.sla_response_time := 15;  -- 15 minutes
      NEW.sla_resolution_time := 240; -- 4 hours
    WHEN 'high' THEN
      NEW.sla_response_time := 60;  -- 1 hour
      NEW.sla_resolution_time := 480; -- 8 hours
    WHEN 'medium' THEN
      NEW.sla_response_time := 240; -- 4 hours
      NEW.sla_resolution_time := 1440; -- 24 hours
    WHEN 'low' THEN
      NEW.sla_response_time := 480; -- 8 hours
      NEW.sla_resolution_time := 2880; -- 48 hours
  END CASE;
  
  -- Calculate deadlines
  NEW.response_deadline := NEW.created_at + (NEW.sla_response_time || ' minutes')::INTERVAL;
  NEW.resolution_deadline := NEW.created_at + (NEW.sla_resolution_time || ' minutes')::INTERVAL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log ticket changes to history
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority);
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'assigned_to_changed', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

CREATE TRIGGER set_sla_deadlines
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sla_deadlines();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_ticket_changes_trigger
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_changes();
