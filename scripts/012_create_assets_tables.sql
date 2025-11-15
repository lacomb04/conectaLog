-- Criação da estrutura de gestão de ativos de TI
-- Executar após as migrações anteriores

-- Tabela principal de ativos
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'network', 'peripherals', 'licenses', 'mobile')),
  subcategory TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('em uso', 'em manutenção', 'planejado', 'obsoleto')),
  lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN ('acquisition', 'deployment', 'use', 'maintenance', 'disposal')),
  acquisition_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  warranty_expires_at DATE,
  license_expiry DATE,
  location TEXT,
  inventoried BOOLEAN NOT NULL DEFAULT false,
  support_owner UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_support_owner ON public.assets(support_owner);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assets_touch_updated_at ON public.assets;
CREATE TRIGGER trg_assets_touch_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- Ativa RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Remove versões anteriores para manter idempotência
DROP POLICY IF EXISTS "Support and admins can read assets" ON public.assets;
DROP POLICY IF EXISTS "Only admins insert assets" ON public.assets;
DROP POLICY IF EXISTS "Admins or assigned support update assets" ON public.assets;
DROP POLICY IF EXISTS "Only admins delete assets" ON public.assets;

-- 1) Suporte e administradores podem consultar todos os ativos
CREATE POLICY "Support and admins can read assets" ON public.assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('support', 'admin')
    )
  );

-- 2) Somente administradores podem inserir ativos
CREATE POLICY "Only admins insert assets" ON public.assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 3) Administradores podem atualizar qualquer ativo; suporte pode atualizar os ativos atribuídos a eles
CREATE POLICY "Admins or assigned support update assets" ON public.assets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR support_owner = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR support_owner = auth.uid()
  );

-- 4) Apenas administradores podem excluir ativos
CREATE POLICY "Only admins delete assets" ON public.assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Dados de exemplo baseados no inventário informado
-- Limpa registros pré-existentes para evitar duplicidade durante testes locais
DELETE FROM public.assets;

INSERT INTO public.assets (
  asset_code,
  name,
  category,
  subcategory,
  description,
  quantity,
  status,
  lifecycle_stage,
  acquisition_date,
  last_maintenance_date,
  next_maintenance_date,
  warranty_expires_at,
  license_expiry,
  location,
  inventoried
) VALUES
  ('DESK-STD', 'Desktop corporativo padrão', 'hardware', 'desktop', 'Estações de trabalho fixas distribuídas nos departamentos administrativos e operacionais.', 70, 'em uso', 'use', '2023-01-10', '2024-07-01', '2025-07-01', '2026-01-10', NULL, 'Escritórios - andares 1 a 4', true),
  ('NOTE-EXEC', 'Notebook corporativo mobilidade', 'hardware', 'notebook', 'Equipamentos destinados a gestores e colaboradores em regime híbrido.', 25, 'em uso', 'use', '2023-03-15', '2024-06-15', '2025-06-15', '2025-03-15', NULL, 'Escritórios - armário de TI', true),
  ('PRNT-REDE', 'Impressora a laser de rede', 'peripherals', 'printer', 'Impressoras compartilhadas conectadas à rede corporativa.', 10, 'em uso', 'maintenance', '2022-08-01', '2024-05-20', '2024-11-20', '2024-08-01', NULL, 'Salas de apoio e áreas comuns', true),
  ('SRV-ERP', 'Servidor ERP TOTVS', 'hardware', 'server', 'Servidores dedicados ao sistema TOTVS (produção e contingência).', 2, 'em uso', 'maintenance', '2021-11-20', '2024-04-10', '2024-10-10', '2025-11-20', NULL, 'Data center local', true),
  ('SRV-DB', 'Servidor banco de dados PostgreSQL', 'hardware', 'server', 'Servidor dedicado às bases transacionais e analíticas.', 2, 'em uso', 'maintenance', '2021-11-20', '2024-04-05', '2024-10-05', '2025-11-20', NULL, 'Data center local', true),
  ('SRV-BKP', 'Servidor de backup Veeam', 'hardware', 'server', 'Infraestrutura de backup local com replicação para nuvem.', 2, 'em uso', 'maintenance', '2022-05-05', '2024-03-12', '2024-09-12', '2026-05-05', NULL, 'Sala de TI', true),
  ('SRV-FILE', 'Servidor de arquivos corporativos', 'hardware', 'server', 'Servidor dedicado ao armazenamento compartilhado interno.', 1, 'em uso', 'maintenance', '2020-09-14', '2024-02-20', '2024-08-20', '2024-09-14', NULL, 'Data center local', true),
  ('SRV-APP', 'Servidor de aplicações middleware', 'hardware', 'server', 'Servidor para integrações internas e APIs legadas.', 1, 'em uso', 'maintenance', '2020-11-02', '2024-02-10', '2024-08-10', '2024-11-02', NULL, 'Data center local', true),
  ('MBL-VENTAS', 'Smartphone corporativo equipe de vendas', 'mobile', 'smartphone', 'Dispositivos móveis gerenciados para equipe comercial.', 40, 'em uso', 'use', '2023-04-01', '2024-04-01', '2025-04-01', '2025-04-01', NULL, 'Equipe de vendas - uso externo', true),
  ('NET-LAN', 'Rede cabeada e Wi-Fi empresarial', 'network', 'infraestrutura', 'Switches gerenciáveis, access points e cabeamento estruturado.', 1, 'em uso', 'maintenance', '2022-02-10', '2024-03-15', '2024-09-15', NULL, NULL, 'Infraestrutura predial', true),
  ('SW-ERP', 'Sistema ERP TOTVS', 'software', 'erp', 'Licenciamento e ambiente do ERP TOTVS Protheus.', 1, 'em uso', 'use', '2021-12-01', '2024-01-10', '2024-07-10', '2024-12-01', '2024-12-01', 'Data center local', true),
  ('SW-M365', 'Serviço de e-mail Microsoft 365', 'licenses', 'email', 'Assinaturas Microsoft 365 Business Premium.', 1, 'em uso', 'maintenance', '2023-01-01', '2024-01-01', '2024-07-01', '2024-12-31', '2024-12-31', 'Nuvem Microsoft', true),
  ('SW-BKP-AWS', 'Backup em nuvem AWS S3', 'software', 'backup', 'Bucket dedicado para rotinas de backup e retenção.', 1, 'em uso', 'maintenance', '2022-06-01', '2024-03-01', '2024-09-01', NULL, NULL, 'AWS São Paulo', true),
  ('NET-CAM', 'Câmeras IP de segurança', 'peripherals', 'security', 'Sistema de monitoramento interno com NVR integrado.', 1, 'em uso', 'maintenance', '2022-03-20', '2024-02-18', '2024-08-18', '2025-03-20', NULL, 'Áreas comuns e perímetro', true),
  ('NET-ROUT', 'Roteadores e firewalls gerenciáveis', 'network', 'security', 'Camada de roteamento e segurança perimetral.', 1, 'em uso', 'maintenance', '2023-02-01', '2024-04-22', '2024-10-22', '2026-02-01', NULL, 'Sala de TI', true),
  ('NET-VPN', 'Serviço de VPN corporativa', 'network', 'vpn', 'Acesso remoto seguro para equipes externas.', 1, 'em uso', 'maintenance', '2022-09-15', '2024-01-15', '2024-07-15', NULL, NULL, 'Infraestrutura de rede', true);

-- Recarrega o esquema no PostgREST
NOTIFY pgrst, 'reload schema';
