import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
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

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[proxy] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados. Rotas de ativos ficarão indisponíveis."
  );
}

if (!OPENAI_KEY) {
  console.warn("[proxy] OPENAI_API_KEY não definida. Respostas retornarão 500.");
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/api/conectabot", async (req: Request, res: Response) => {
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "Chave OpenAI ausente no backend." });
  }
  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await openaiResponse.json();
    res.status(openaiResponse.status).json(data);
  } catch (error: any) {
    console.error("[proxy] Erro ao contatar OpenAI:", error.message);
    res.status(500).json({ error: "Falha ao contatar OpenAI" });
  }
});

type RequesterProfile = {
  id: string;
  role: string;
  full_name?: string | null;
  email?: string | null;
  support_level?: number | null;
};

async function requireSupabaseRequester(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!supabaseAdmin) {
    res
      .status(503)
      .json({ error: "Serviço de gerenciamento de ativos indisponível." });
    return;
  }

  const authorization = req.headers.authorization || "";
  const lowerAuth = authorization.toLowerCase();
  const allowedRoles = new Set(["admin", "support"]);

  let profile: RequesterProfile | null = null;

  if (lowerAuth.startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "Token de acesso inválido." });
      return;
    }

    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        res.status(401).json({ error: "Sessão expirada ou inválida." });
        return;
      }

      const { data: fetchedProfile, error: profileError } = await supabaseAdmin
        .from("users")
        .select("id, role, full_name, email, support_level")
        .eq("id", user.id)
        .maybeSingle();

      const normalizedRole = (fetchedProfile?.role || "").toLowerCase();

      if (profileError || !fetchedProfile || !allowedRoles.has(normalizedRole)) {
        res
          .status(403)
          .json({ error: "Perfil do usuário não encontrado ou sem permissão." });
        return;
      }

      profile = {
        ...fetchedProfile,
        role: normalizedRole,
        support_level: fetchedProfile?.support_level ?? null,
      } as RequesterProfile;
    } catch (cause: any) {
      console.error(
        "[proxy] Falha ao validar sessão Supabase:",
        cause?.message
      );
      res.status(500).json({ error: "Erro ao validar sessão." });
      return;
    }
  }

  if (!profile) {
    const headerUserId = String(req.header("x-asset-user-id") || "").trim();
    if (!headerUserId) {
      res.status(401).json({ error: "Token de acesso ausente." });
      return;
    }

    try {
      const { data: fetchedProfile, error } = await supabaseAdmin
        .from("users")
        .select("id, role, full_name, email, support_level")
        .eq("id", headerUserId)
        .maybeSingle();

      const normalizedRole = (fetchedProfile?.role || "").toLowerCase();

      if (error || !fetchedProfile || !allowedRoles.has(normalizedRole)) {
        res
          .status(403)
          .json({ error: "Usuário sem permissão para acessar os ativos." });
        return;
      }

      const claimedRole = String(req.header("x-asset-user-role") || "").trim();
      if (
        claimedRole &&
        claimedRole.toLowerCase() !== (fetchedProfile.role || "").toLowerCase()
      ) {
        res.status(403).json({ error: "Perfil informado não confere." });
        return;
      }

      profile = {
        ...fetchedProfile,
        role: normalizedRole,
        support_level: fetchedProfile?.support_level ?? null,
      } as RequesterProfile;
    } catch (cause: any) {
      console.error(
        "[proxy] Falha ao validar cabeçalho de usuário:",
        cause?.message
      );
      res.status(500).json({ error: "Erro ao validar usuário." });
      return;
    }
  }

  (req as any).supabaseProfile = profile;
  next();
}

app.get("/api/assets", requireSupabaseRequester, async (req, res) => {
  const profile = (req as any).supabaseProfile as RequesterProfile;

  if (!supabaseAdmin) {
    res
      .status(503)
      .json({ error: "Serviço de gerenciamento de ativos indisponível." });
    return;
  }

  try {
    const scope = String(req.query.scope || "").toLowerCase();

    let query = supabaseAdmin
      .from("assets")
      .select(
        "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role, support_level)"
      )
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (scope === "assigned" || profile.role === "support") {
      query = query.eq("support_owner", profile.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[proxy] Falha ao listar ativos:", error.message);
      res.status(500).json({ error: "Erro ao listar ativos." });
      return;
    }

    res.json({ data });
  } catch (cause: any) {
    console.error("[proxy] Erro inesperado em GET /api/assets:", cause?.message);
    res.status(500).json({ error: "Erro inesperado ao buscar ativos." });
  }
});

app.post("/api/assets", requireSupabaseRequester, async (req, res) => {
  const profile = (req as any).supabaseProfile as RequesterProfile;

  if (!supabaseAdmin) {
    res
      .status(503)
      .json({ error: "Serviço de gerenciamento de ativos indisponível." });
    return;
  }

  if (profile.role !== "admin") {
    res.status(403).json({ error: "Somente administradores podem inserir ativos." });
    return;
  }

  const payload = req.body ?? {};

  try {
    const { data, error } = await supabaseAdmin
      .from("assets")
      .insert(payload)
      .select(
        "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role, support_level)"
      )
      .single();

    if (error) {
      console.error("[proxy] Falha ao inserir ativo:", error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ data });
  } catch (cause: any) {
    console.error("[proxy] Erro inesperado em POST /api/assets:", cause?.message);
    res.status(500).json({ error: "Erro inesperado ao cadastrar ativo." });
  }
});

app.patch("/api/assets", requireSupabaseRequester, async (req, res) => {
  const profile = (req as any).supabaseProfile as RequesterProfile;

  if (!supabaseAdmin) {
    res
      .status(503)
      .json({ error: "Serviço de gerenciamento de ativos indisponível." });
    return;
  }

  if (profile.role !== "admin") {
    res
      .status(403)
      .json({ error: "Somente administradores podem atualizar ativos." });
    return;
  }

  const assetIdRaw = req.query.id;
  const assetId = Array.isArray(assetIdRaw) ? assetIdRaw[0] : assetIdRaw;
  if (!assetId) {
    res.status(400).json({ error: "Identificador do ativo ausente." });
    return;
  }

  const payload = req.body ?? {};
  const updates: Record<string, any> = {};
  const hasField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

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
    const { data, error } = await supabaseAdmin
      .from("assets")
      .update(updates)
      .eq("id", assetId)
      .select(
        "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role, support_level)"
      )
      .maybeSingle();

    if (error) {
      console.error("[proxy] Falha ao atualizar ativo:", error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: "Ativo não encontrado." });
      return;
    }

    res.json({ data });
  } catch (cause: any) {
    console.error("[proxy] Erro inesperado em PATCH /api/assets/:id:", cause?.message);
    res.status(500).json({ error: "Erro inesperado ao atualizar ativo." });
  }
});

app.listen(PORT, () => {
  console.log(`[proxy] Servidor ConectaBot rodando na porta ${PORT}`);
});
