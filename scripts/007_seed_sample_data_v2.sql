-- Seed sample data for testing
-- This script creates sample users, tickets, and messages

DO $$
DECLARE
  admin_id UUID;
  support_id UUID;
  employee1_id UUID;
  employee2_id UUID;
  ticket1_id UUID;
  ticket2_id UUID;
  ticket3_id UUID;
BEGIN
  -- Insert users and capture their IDs
  INSERT INTO public.users (email, full_name, role, department)
  VALUES ('admin@company.com', 'Admin User', 'admin', 'TI')
  RETURNING id INTO admin_id;

  INSERT INTO public.users (email, full_name, role, department)
  VALUES ('suporte@company.com', 'Agente de Suporte', 'support', 'TI')
  RETURNING id INTO support_id;

  INSERT INTO public.users (email, full_name, role, department)
  VALUES ('joao@company.com', 'João Silva', 'employee', 'Vendas')
  RETURNING id INTO employee1_id;

  INSERT INTO public.users (email, full_name, role, department)
  VALUES ('maria@company.com', 'Maria Santos', 'employee', 'Marketing')
  RETURNING id INTO employee2_id;

  -- Insert sample tickets
  INSERT INTO public.tickets (
    ticket_number, title, description, priority, status, category,
    created_by, assigned_to, sla_response_time, sla_resolution_time,
    response_deadline, resolution_deadline
  ) VALUES (
    'TKT-001',
    'Computador não liga',
    'Meu computador não está ligando desde ontem. Já tentei trocar o cabo de energia mas não funcionou.',
    'high',
    'open',
    'hardware',
    employee1_id,
    NULL,
    30,
    240,
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '4 hours'
  ) RETURNING id INTO ticket1_id;

  INSERT INTO public.tickets (
    ticket_number, title, description, priority, status, category,
    created_by, assigned_to, sla_response_time, sla_resolution_time,
    response_deadline, resolution_deadline, responded_at
  ) VALUES (
    'TKT-002',
    'Não consigo acessar o sistema de vendas',
    'Quando tento fazer login no sistema de vendas, recebo erro de credenciais inválidas.',
    'medium',
    'in_progress',
    'access',
    employee2_id,
    support_id,
    60,
    480,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '8 hours',
    NOW() - INTERVAL '15 minutes'
  ) RETURNING id INTO ticket2_id;

  INSERT INTO public.tickets (
    ticket_number, title, description, priority, status, category,
    created_by, assigned_to, sla_response_time, sla_resolution_time,
    response_deadline, resolution_deadline, responded_at, resolved_at
  ) VALUES (
    'TKT-003',
    'Internet lenta',
    'A internet está muito lenta hoje, dificultando o trabalho.',
    'low',
    'resolved',
    'network',
    employee1_id,
    support_id,
    120,
    1440,
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '24 hours',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '30 minutes'
  ) RETURNING id INTO ticket3_id;

  -- Insert sample messages
  INSERT INTO public.messages (ticket_id, user_id, message, is_internal)
  VALUES 
    (ticket1_id, employee1_id, 'Preciso urgente do computador para apresentação amanhã!', false),
    (ticket2_id, employee2_id, 'Já tentei resetar a senha mas não funcionou.', false),
    (ticket2_id, support_id, 'Vou verificar suas permissões no sistema.', false),
    (ticket2_id, support_id, 'Usuário não tinha permissão de acesso. Verificar com admin.', true),
    (ticket3_id, employee1_id, 'A velocidade está muito baixa.', false),
    (ticket3_id, support_id, 'Vou verificar o roteador do seu andar.', false),
    (ticket3_id, support_id, 'Problema resolvido. Era configuração do roteador.', false);

  -- Insert ticket history
  INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
  VALUES
    (ticket2_id, support_id, 'status_change', 'open', 'in_progress'),
    (ticket2_id, support_id, 'assigned', NULL, 'Agente de Suporte'),
    (ticket3_id, support_id, 'status_change', 'in_progress', 'resolved'),
    (ticket3_id, support_id, 'resolved', NULL, 'Problema no roteador corrigido');

  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Support ID: %', support_id;
  RAISE NOTICE 'Employee 1 ID: %', employee1_id;
  RAISE NOTICE 'Employee 2 ID: %', employee2_id;
END $$;
