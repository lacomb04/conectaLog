-- Seed script with valid UUIDs for testing
-- This creates sample users and tickets for development/testing

-- First, let's create some sample user profiles
-- Note: In production, users should be created through Supabase Auth
-- For testing, we'll insert directly into the users table

DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  support_id uuid := gen_random_uuid();
  employee1_id uuid := gen_random_uuid();
  employee2_id uuid := gen_random_uuid();
  ticket1_id uuid;
  ticket2_id uuid;
  ticket3_id uuid;
BEGIN
  -- Insert sample users
  INSERT INTO public.users (id, email, full_name, role, department)
  VALUES 
    (admin_id, 'admin@company.com', 'Admin User', 'admin', 'TI'),
    (support_id, 'suporte@company.com', 'Agente de Suporte', 'support', 'TI'),
    (employee1_id, 'joao@company.com', 'João Silva', 'employee', 'Vendas'),
    (employee2_id, 'maria@company.com', 'Maria Santos', 'employee', 'Marketing');

  -- Insert sample tickets
  INSERT INTO public.tickets (title, description, category, priority, status, requester_id, assigned_to)
  VALUES 
    ('Computador não liga', 'Meu computador não está ligando desde ontem. Já tentei trocar o cabo de energia mas não funcionou.', 'hardware', 'high', 'open', employee1_id, support_id),
    ('Acesso ao sistema de vendas', 'Preciso de acesso ao sistema de vendas para começar a trabalhar. Sou novo na empresa.', 'access', 'medium', 'in_progress', employee2_id, support_id),
    ('Impressora com problema', 'A impressora do 3º andar está com erro de papel preso.', 'hardware', 'low', 'open', employee1_id, NULL)
  RETURNING id INTO ticket1_id;

  -- Get the ticket IDs for messages
  SELECT id INTO ticket1_id FROM public.tickets WHERE requester_id = employee1_id AND title = 'Computador não liga';
  SELECT id INTO ticket2_id FROM public.tickets WHERE requester_id = employee2_id AND title = 'Acesso ao sistema de vendas';
  SELECT id INTO ticket3_id FROM public.tickets WHERE requester_id = employee1_id AND title = 'Impressora com problema';

  -- Insert sample messages
  INSERT INTO public.messages (ticket_id, user_id, content, is_internal)
  VALUES 
    (ticket1_id, employee1_id, 'Preciso urgente do computador para trabalhar hoje.', false),
    (ticket1_id, support_id, 'Vou verificar o equipamento agora. Pode ser problema na fonte de alimentação.', false),
    (ticket2_id, employee2_id, 'Meu gestor é o Carlos da área comercial.', false),
    (ticket2_id, support_id, 'Verificando com o RH os acessos necessários.', false),
    (ticket2_id, support_id, 'Usuário precisa de aprovação do gestor primeiro.', true);

  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Support ID: %', support_id;
  RAISE NOTICE 'Employee 1 ID: %', employee1_id;
  RAISE NOTICE 'Employee 2 ID: %', employee2_id;
END $$;
