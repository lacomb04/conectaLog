-- Cria função RPC com SECURITY DEFINER para servir os dados de ativos ao painel
-- Execute este script após provisionar as tabelas de ativos.

CREATE OR REPLACE FUNCTION public.rpc_fetch_assets_dashboard(
  p_requester UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'admin'
)
RETURNS TABLE (
  id UUID,
  asset_code TEXT,
  name TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  quantity INTEGER,
  status TEXT,
  lifecycle_stage TEXT,
  acquisition_date DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  warranty_expires_at DATE,
  license_expiry DATE,
  location TEXT,
  inventoried BOOLEAN,
  support_owner UUID,
  support_owner_profile JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_role TEXT := lower(coalesce(p_role, 'admin'));
BEGIN
  IF normalized_role = 'support' AND p_requester IS NOT NULL THEN
    RETURN QUERY
    SELECT
      a.id,
      a.asset_code,
      a.name,
      a.category,
      a.subcategory,
      a.description,
      a.quantity,
      a.status,
      a.lifecycle_stage,
      a.acquisition_date,
      a.last_maintenance_date,
      a.next_maintenance_date,
      a.warranty_expires_at,
      a.license_expiry,
      a.location,
      a.inventoried,
      a.support_owner,
      CASE
        WHEN u.id IS NOT NULL THEN jsonb_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'role', u.role
        )
        ELSE NULL
      END AS support_owner_profile,
      a.created_at,
      a.updated_at
    FROM public.assets a
    LEFT JOIN public.users u ON u.id = a.support_owner
    WHERE a.support_owner = p_requester
    ORDER BY a.category ASC, a.name ASC;
  ELSE
    RETURN QUERY
    SELECT
      a.id,
      a.asset_code,
      a.name,
      a.category,
      a.subcategory,
      a.description,
      a.quantity,
      a.status,
      a.lifecycle_stage,
      a.acquisition_date,
      a.last_maintenance_date,
      a.next_maintenance_date,
      a.warranty_expires_at,
      a.license_expiry,
      a.location,
      a.inventoried,
      a.support_owner,
      CASE
        WHEN u.id IS NOT NULL THEN jsonb_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email,
          'role', u.role
        )
        ELSE NULL
      END AS support_owner_profile,
      a.created_at,
      a.updated_at
    FROM public.assets a
    LEFT JOIN public.users u ON u.id = a.support_owner
    ORDER BY a.category ASC, a.name ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_fetch_assets_dashboard(UUID, TEXT) TO anon, authenticated, service_role;
