-- ============================================
-- SCRIPT COMPLETO: RESET E SETUP DO BANCO
-- ============================================
-- Este script remove tudo e recria do zero
-- Execute este script SOZINHO no seu Supabase

-- ============================================
-- PARTE 1: LIMPEZA COMPLETA
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS set_ticket_number ON public.tickets;
DROP TRIGGER IF EXISTS set_sla_deadlines ON public.tickets;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS log_ticket_changes_trigger ON public.tickets;

-- Drop functions
DROP FUNCTION IF EXISTS generate_ticket_number();
DROP FUNCTION IF EXISTS calculate_sla_deadlines();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS log_ticket_changes();

-- Drop tables (CASCADE removes dependencies)
DROP TABLE IF EXISTS public.ticket_history CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- PARTE 2: CRIAR TABELAS
-- ============================================

-- Tabela de usuários (independente do auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'support', 'employee')),
  department TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'network', 'access', 'other')),
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sla_response_time INTEGER, -- em minutos
  sla_resolution_time INTEGER, -- em minutos
  response_deadline TIMESTAMPTZ,
  resolution_deadline TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de mensagens (chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de tickets
CREATE TABLE public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PARTE 3: CRIAR FUNÇÕES
-- ============================================

-- Função para gerar número do ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.tickets;
  new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  NEW.ticket_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular SLA
CREATE OR REPLACE FUNCTION calculate_sla_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.priority
    WHEN 'critical' THEN
      NEW.sla_response_time := 15;
      NEW.sla_resolution_time := 240;
    WHEN 'high' THEN
      NEW.sla_response_time := 60;
      NEW.sla_resolution_time := 480;
    WHEN 'medium' THEN
      NEW.sla_response_time := 240;
      NEW.sla_resolution_time := 1440;
    WHEN 'low' THEN
      NEW.sla_response_time := 480;
      NEW.sla_resolution_time := 2880;
  END CASE;
  
  NEW.response_deadline := NEW.created_at + (NEW.sla_response_time || ' minutes')::INTERVAL;
  NEW.resolution_deadline := NEW.created_at + (NEW.sla_resolution_time || ' minutes')::INTERVAL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, NEW.assigned_to, 'status_changed', OLD.status, NEW.status);
    END IF;
    
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, NEW.assigned_to, 'priority_changed', OLD.priority, NEW.priority);
    END IF;
    
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, NEW.assigned_to, 'assigned_to_changed', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTE 4: CRIAR TRIGGERS
-- ============================================

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

-- ============================================
-- PARTE 5: CONFIGURAR RLS (Row Level Security)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para desenvolvimento (AJUSTE DEPOIS PARA PRODUÇÃO)
CREATE POLICY "Allow all operations for development" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON public.tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON public.ticket_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PARTE 6: HABILITAR REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- ============================================
-- PARTE 7: INSERIR DADOS DE EXEMPLO
-- ============================================

-- Inserir usuários de exemplo
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
  -- Criar usuários
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
  
  -- Criar tickets de exemplo
  INSERT INTO public.tickets (title, description, status, priority, category, created_by, assigned_to)
  VALUES (
    'Computador não liga',
    'Meu computador não está ligando desde ontem. Já tentei trocar a tomada mas não funcionou.',
    'open',
    'high',
    'hardware',
    employee1_id,
    support_id
  )
  RETURNING id INTO ticket1_id;
  
  INSERT INTO public.tickets (title, description, status, priority, category, created_by, assigned_to)
  VALUES (
    'Acesso ao sistema de vendas',
    'Preciso de acesso ao sistema de vendas para começar a trabalhar.',
    'in_progress',
    'medium',
    'access',
    employee2_id,
    support_id
  )
  RETURNING id INTO ticket2_id;
  
  INSERT INTO public.tickets (title, description, status, priority, category, created_by)
  VALUES (
    'Internet lenta',
    'A internet está muito lenta hoje, não consigo acessar os sistemas.',
    'open',
    'low',
    'network',
    employee1_id
  )
  RETURNING id INTO ticket3_id;
  
  -- Criar mensagens de exemplo
  INSERT INTO public.messages (ticket_id, user_id, message, is_internal)
  VALUES 
    (ticket1_id, employee1_id, 'Preciso de ajuda urgente com isso!', false),
    (ticket1_id, support_id, 'Vou verificar o problema agora.', false),
    (ticket1_id, support_id, 'Verificar se é problema de fonte de alimentação', true),
    (ticket2_id, employee2_id, 'Quando posso ter acesso?', false),
    (ticket2_id, support_id, 'Estou criando seu usuário agora.', false);
  
  -- Criar histórico de exemplo
  INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
  VALUES 
    (ticket2_id, support_id, 'status_changed', 'open', 'in_progress'),
    (ticket2_id, support_id, 'assigned_to_changed', NULL, support_id::TEXT);
    
END $$;

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- Banco de dados configurado com sucesso!
-- Você pode fazer login com qualquer um dos emails:
-- - admin@company.com (Admin)
-- - suporte@company.com (Suporte)
-- - joao@company.com (Funcionário)
-- - maria@company.com (Funcionário)
