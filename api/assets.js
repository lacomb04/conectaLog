const { createClient } = require("@supabase/supabase-js");

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
const validCategories = new Set([
  "hardware",
  "software",
  "network",
  "peripherals",
  "licenses",
  "mobile",
]);
const validStatuses = new Set([
  "em uso",
  "em manutenção",
  "planejado",
  "obsoleto",
]);
const validLifecycleStages = new Set([
  "acquisition",
  "deployment",
  "use",
  "maintenance",
  "disposal",
]);

let supabaseAdmin = null;
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

function getHeader(req, name) {
  const lower = name.toLowerCase();
  return (
    req.headers[lower] ||
    req.headers[name] ||
    req.headers[lower.replace(/_/g, "-")] ||
    ""
  );
}

async function resolveProfile(req) {
  if (!supabaseAdmin) {
    return {
      profile: null,
      status: 503,
      error: "Serviço de gerenciamento de ativos indisponível.",
    };
  }

  const rawAuth = getHeader(req, "authorization");
  const authHeader = typeof rawAuth === "string" ? rawAuth.toLowerCase() : "";

  if (authHeader.startsWith("bearer ")) {
    const token = (typeof rawAuth === "string" ? rawAuth : "").slice(7).trim();
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

      return { profile: fetchedProfile };
    } catch (cause) {
      console.error("[api/assets] Falha ao validar token:", cause?.message);
      return { profile: null, status: 500, error: "Erro ao validar sessão." };
    }
  }

  const headerUserId = String(getHeader(req, "x-asset-user-id") || "").trim();
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

    const claimedRole = String(getHeader(req, "x-asset-user-role") || "").trim();
    if (
      claimedRole &&
      claimedRole.toLowerCase() !== (fetchedProfile.role || "").toLowerCase()
    ) {
      return { profile: null, status: 403, error: "Perfil informado não confere." };
    }

    return { profile: fetchedProfile };
  } catch (cause) {
    console.error(
      "[api/assets] Falha ao validar usuário via cabeçalho:",
      cause?.message
    );
    return { profile: null, status: 500, error: "Erro ao validar usuário." };
  }
}

module.exports = async function handler(req, res) {
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
      const scopeParam = req.query?.scope;
      const scope = Array.isArray(scopeParam)
        ? String(scopeParam[0] || "").toLowerCase()
        : String(scopeParam || "").toLowerCase();

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
    } catch (cause) {
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
    } catch (cause) {
      console.error("[api/assets] Erro inesperado (POST):", cause?.message);
      res.status(500).json({ error: "Erro inesperado ao cadastrar ativo." });
    }
    return;
  }

  if (req.method === "PATCH") {
    if ((profile.role || "").toLowerCase() !== "admin") {
      res
        .status(403)
        .json({ error: "Somente administradores podem atualizar ativos." });
      return;
    }

    const idParam = req.query?.id;
    const assetId = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!assetId) {
      res.status(400).json({ error: "Identificador do ativo ausente." });
      return;
    }

    const payload = req.body ?? {};
    const updates = {};
    const hasField = (key) => Object.prototype.hasOwnProperty.call(payload, key);

    if (hasField("asset_code")) {
      if (typeof payload.asset_code !== "string" || !payload.asset_code.trim()) {
        res.status(400).json({ error: "Código do ativo inválido." });
        return;
      }
      updates.asset_code = payload.asset_code.trim().toUpperCase();
    }

    if (hasField("name")) {
      if (typeof payload.name !== "string" || !payload.name.trim()) {
        res.status(400).json({ error: "Nome do ativo inválido." });
        return;
      }
      updates.name = payload.name.trim();
    }

    if (hasField("category")) {
      if (typeof payload.category !== "string" || !validCategories.has(payload.category)) {
        res.status(400).json({ error: "Categoria informada é inválida." });
        return;
      }
      updates.category = payload.category;
    }

    if (hasField("status")) {
      if (typeof payload.status !== "string" || !validStatuses.has(payload.status)) {
        res.status(400).json({ error: "Status informado é inválido." });
        return;
      }
      updates.status = payload.status;
    }

    if (hasField("lifecycle_stage")) {
      if (
        typeof payload.lifecycle_stage !== "string" ||
        !validLifecycleStages.has(payload.lifecycle_stage)
      ) {
        res.status(400).json({ error: "Etapa do ciclo de vida inválida." });
        return;
      }
      updates.lifecycle_stage = payload.lifecycle_stage;
    }

    if (hasField("quantity")) {
      const numericQuantity = Number(payload.quantity);
      if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        res.status(400).json({ error: "Quantidade informada é inválida." });
        return;
      }
      updates.quantity = Math.max(1, Math.round(numericQuantity));
    }

    const nullableTextFields = ["subcategory", "description", "location"];
    nullableTextFields.forEach((field) => {
      if (!hasField(field)) return;
      const raw = payload[field];
      if (raw === null || raw === undefined) {
        updates[field] = null;
        return;
      }
      if (typeof raw !== "string") {
        updates[field] = null;
        return;
      }
      const trimmed = raw.trim();
      updates[field] = trimmed.length ? trimmed : null;
    });

    const dateFields = [
      "acquisition_date",
      "last_maintenance_date",
      "next_maintenance_date",
      "warranty_expires_at",
      "license_expiry",
    ];
    dateFields.forEach((field) => {
      if (!hasField(field)) return;
      const raw = payload[field];
      if (raw === null || raw === undefined) {
        updates[field] = null;
        return;
      }
      if (typeof raw !== "string") {
        updates[field] = null;
        return;
      }
      const trimmed = raw.trim();
      updates[field] = trimmed.length ? trimmed : null;
    });

    if (hasField("support_owner")) {
      const ownerRaw = payload.support_owner;
      if (ownerRaw === null || ownerRaw === undefined) {
        updates.support_owner = null;
      } else if (typeof ownerRaw === "string" && ownerRaw.trim()) {
        updates.support_owner = ownerRaw.trim();
      } else {
        updates.support_owner = null;
      }
    }

    if (hasField("inventoried")) {
      updates.inventoried = Boolean(payload.inventoried);
    }

    if (!Object.keys(updates).length) {
      res
        .status(400)
        .json({ error: "Nenhum campo válido informado para atualização." });
      return;
    }

    updates.updated_at = new Date().toISOString();

    try {
      const { data, error: updateError } = await supabaseAdmin
        .from("assets")
        .update(updates)
        .eq("id", assetId)
        .select(
          "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)"
        )
        .maybeSingle();

      if (updateError) {
        console.error("[api/assets] Falha ao atualizar ativo:", updateError.message);
        res.status(400).json({ error: updateError.message });
        return;
      }

      if (!data) {
        res.status(404).json({ error: "Ativo não encontrado." });
        return;
      }

      res.status(200).json({ data });
    } catch (cause) {
      console.error("[api/assets] Erro inesperado (PATCH):", cause?.message);
      res.status(500).json({ error: "Erro inesperado ao atualizar ativo." });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, PATCH");
  res.status(405).json({ error: `Método ${req.method} não permitido.` });
};
