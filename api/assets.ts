import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  "";

const allowedRoles = new Set(["admin", "support"]);

let supabaseAdmin: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  console.warn(
    "[api/assets] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes. Função ficará indisponível."
  );
}

type RequesterProfile = {
  id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
};

async function resolveProfile(
  req: VercelRequest
): Promise<{ profile: RequesterProfile | null; status?: number; error?: string }> {
  if (!supabaseAdmin) {
    return {
      profile: null,
      status: 503,
      error: "Serviço de gerenciamento de ativos indisponível.",
    };
  }

  const authHeader = (req.headers.authorization || "").toLowerCase();

  if (authHeader.startsWith("bearer ")) {
    const token = (req.headers.authorization || "").slice(7).trim();
    if (!token) {
      return { profile: null, status: 401, error: "Token de acesso inválido." };
    }

    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return {
          profile: null,
          status: 401,
          error: "Sessão expirada ou inválida.",
        };
      }

      const { data: fetchedProfile, error: profileError } = await supabaseAdmin
        .from("users")
        .select("id, role, full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !fetchedProfile ||
        !allowedRoles.has((fetchedProfile.role || "").toLowerCase())
      ) {
        return {
          profile: null,
          status: 403,
          error: "Perfil do usuário não encontrado ou sem permissão.",
        };
      }

      return { profile: fetchedProfile as RequesterProfile };
    } catch (cause: any) {
      console.error("[api/assets] Falha ao validar token:", cause?.message);
      return { profile: null, status: 500, error: "Erro ao validar sessão." };
    }
  }

  const headerUserId = String(req.headers["x-asset-user-id"] || "").trim();
  if (!headerUserId) {
    return { profile: null, status: 401, error: "Token de acesso ausente." };
  }

  try {
    const { data: fetchedProfile, error } = await supabaseAdmin
      .from("users")
      .select("id, role, full_name, email")
      .eq("id", headerUserId)
      .maybeSingle();

    if (
      error ||
      !fetchedProfile ||
      !allowedRoles.has((fetchedProfile.role || "").toLowerCase())
    ) {
      return {
        profile: null,
        status: 403,
        error: "Usuário sem permissão para acessar os ativos.",
      };
    }

    const claimedRole = String(req.headers["x-asset-user-role"] || "").trim();
    if (
      claimedRole &&
      claimedRole.toLowerCase() !== (fetchedProfile.role || "").toLowerCase()
    ) {
      return { profile: null, status: 403, error: "Perfil informado não confere." };
    }

    return { profile: fetchedProfile as RequesterProfile };
  } catch (cause: any) {
    console.error("[api/assets] Falha ao validar usuário via cabeçalho:", cause?.message);
    return { profile: null, status: 500, error: "Erro ao validar usuário." };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!supabaseAdmin) {
    res
      .status(503)
      .json({ error: "Serviço de gerenciamento de ativos indisponível." });
    return;
  }

  const { profile, status, error } = await resolveProfile(req);
  if (!profile) {
    res.status(status || 401).json({ error: error || "Acesso negado." });
    return;
  }

  if (req.method === "GET") {
    try {
      const scope = String((req.query.scope as string) || "").toLowerCase();

      let query = supabaseAdmin
        .from("assets")
        .select(
          "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)"
        )
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (scope === "assigned" || profile.role === "support") {
        query = query.eq("support_owner", profile.id);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error("[api/assets] Falha ao listar ativos:", queryError.message);
        res.status(500).json({ error: "Erro ao listar ativos." });
        return;
      }

      res.status(200).json({ data });
    } catch (cause: any) {
      console.error("[api/assets] Erro inesperado (GET):", cause?.message);
      res.status(500).json({ error: "Erro inesperado ao buscar ativos." });
    }
    return;
  }

  if (req.method === "POST") {
    if ((profile.role || "").toLowerCase() !== "admin") {
      res
        .status(403)
        .json({ error: "Somente administradores podem inserir ativos." });
      return;
    }

    const payload = req.body ?? {};

    try {
      const { data, error: insertError } = await supabaseAdmin
        .from("assets")
        .insert(payload)
        .select(
          "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)"
        )
        .single();

      if (insertError) {
        console.error("[api/assets] Falha ao inserir ativo:", insertError.message);
        res.status(400).json({ error: insertError.message });
        return;
      }

      res.status(201).json({ data });
    } catch (cause: any) {
      console.error("[api/assets] Erro inesperado (POST):", cause?.message);
      res.status(500).json({ error: "Erro inesperado ao cadastrar ativo." });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: `Método ${req.method} não permitido.` });
}
