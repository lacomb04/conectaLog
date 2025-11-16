-- Adiciona hierarquia de níveis para a equipe de suporte
-- Execute este script após aplicar as migrações anteriores.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS support_level SMALLINT
  CHECK (support_level BETWEEN 1 AND 3);

COMMENT ON COLUMN public.users.support_level IS 'Define o nível hierárquico do agente de suporte (1=primeiro contato, 2=especialista, 3=nível avançado).';

-- Ajusta usuários de suporte existentes para nível 1 por padrão
UPDATE public.users
SET support_level = 1
WHERE role = 'support' AND support_level IS NULL;

COMMIT;
