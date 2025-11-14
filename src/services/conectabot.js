// Serviço ConectaBot – coleta orientada e criação de ticket.
// AVISO: mover para backend em produção para não expor a API key no front.

import supabase from "../supabaseClient";

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";
const DEBUG = !!import.meta.env.VITE_CONECTABOT_DEBUG;

const SPEC = {
  "empresa": "ConectaLog",
  "descricao_empresa": "A ConectaLog é uma empresa de soluções logísticas integradas especializada em transporte rodoviário, armazenagem, roteirização e logística reversa para clientes de e-commerce e varejo de médio e grande porte. Seu sistema central é o LogisMax, responsável por toda a operação de transporte e gestão de estoque.",
  "agente_virtual": {
    "nome": "ConectaBot",
    "funcao": "Pré-atendimento de suporte técnico interno",
    "objetivo": "Coletar informações essenciais sobre o problema do usuário e encaminhar o chamado completo para um atendente humano.",
    "linguagem": "Amigável, profissional e empática",
    "regras_de_acao": [
      "Cumprimentar o usuário e se identificar como ConectaBot.",
      "Solicitar nome completo e setor do colaborador.",
      "Pedir descrição clara do problema e identificar o tipo de serviço afetado.",
      "Determinar a prioridade com base no impacto na operação.",
      "Coletar informações complementares específicas (dependendo da categoria).",
      "Verificar se há solução de autoatendimento disponível (FAQ).",
      "Gerar ticket completo e encaminhar para atendimento humano."
    ]
  },
  "dados_para_coleta": {
    "nome_usuario": "",
    "setor": "",
    "email_corporativo": "",
    "tipo_de_servico": "",
    "descricao_do_problema": "",
    "sistema_afetado": "",
    "equipamento": "",
    "prioridade": "",
    "impacto_operacional": "",
    "horario_do_problema": "",
    "anexo_print": "",
    "localizacao": ""
  },
  "classificacao_de_servicos": {
    "area_1_suporte_operacao_critica": {
      "descricao": "Problemas que afetam diretamente a operação logística.",
      "categorias": {
        "logismax": ["travamento", "erro de roteirização", "lentidão", "dúvida de uso"],
        "scanners": ["falha de leitura", "sem conexão", "bateria", "não sincroniza"],
        "tablets_motoristas": ["GPS não funciona", "app não sincroniza"],
        "impressoras_termicas": ["erro de impressão", "etiqueta desalinhada"],
        "integracoes_api": ["pedidos não entram", "falha na integração com cliente"]
      },
      "prioridade_padrao": "Alta"
    },
    "area_2_suporte_corporativo": {
      "descricao": "Suporte ao escritório administrativo, financeiro, comercial e de gestão.",
      "categorias": {
        "hardware": ["notebook", "monitor", "mouse", "teclado", "periféricos"],
        "software_produtividade": ["Office 365", "Outlook", "Teams", "Google Workspace"],
        "erp_crm": ["erro no sistema financeiro", "acesso negado", "problema em relatórios"],
        "rede_vpn": ["sem internet", "VPN desconectando", "Wi-Fi lento"]
      },
      "prioridade_padrao": "Média"
    },
    "area_3_infraestrutura_e_seguranca": {
      "descricao": "Gestão de acessos, servidores, backups e segurança da informação.",
      "categorias": {
        "gestao_de_acessos": ["criação de usuário", "bloqueio de conta", "alteração de permissões"],
        "seguranca": ["phishing", "vírus detectado", "alerta de firewall"],
        "servidores_backup": ["backup falhou", "problema no servidor local ou em nuvem"]
      },
      "prioridade_padrao": "Baixa"
    }
  },
  "regras_de_prioridade": {
    "alta": "Problema impacta diretamente a operação logística (ex: caminhões parados, LogisMax travado).",
    "media": "Problema impede o trabalho de um usuário ou setor administrativo.",
    "baixa": "Dúvidas, solicitações simples, criação de acessos ou manutenções preventivas."
  },
  "mensagens_padrao": {
    "saudacao_inicial": "Olá! 👋 Sou o ConectaBot, assistente virtual da ConectaLog. Vou te ajudar a registrar seu chamado de suporte.",
    "coleta_dados_basicos": "Por favor, me informe seu nome completo e o setor onde você trabalha.",
    "descricao_problema": "Pode me descrever brevemente o problema? Exemplo: 'O LogisMax travou na tela de roteirização' ou 'Não consigo acessar o Outlook'.",
    "coleta_detalhes_tecnicos": "Ótimo, agora preciso de alguns detalhes: qual sistema ou equipamento está afetado e desde quando o problema começou?",
    "confirmacao_envio": "Perfeito, já registrei todas as informações. Vou encaminhar seu chamado para nossa equipe técnica.",
    "encerramento": "Seu ticket foi criado com sucesso! Você receberá atualizações por e-mail e poderá acompanhar o status no portal do suporte. Obrigado pelo contato! 🚀"
  },
  "base_conhecimento": [
    {
      "categoria": "logismax",
      "gatilhos": ["logismax", "roteirização", "travou", "lentidão"],
      "passos": [
        "Verifique conexão VPN/rede corporativa.",
        "Limpe cache do navegador ou reinicie o LogisMax.",
        "Se o erro persistir, capture print da tela e informe o código exibido."
      ]
    },
    {
      "categoria": "hardware",
      "gatilhos": ["notebook", "computador", "não liga", "superaquecendo"],
      "passos": [
        "Confirme cabos e alimentação.",
        "Reinicie o equipamento e verifique leds/painéis.",
        "Se ainda falhar, informe número do patrimônio."
      ]
    },
    {
      "categoria": "software_produtividade",
      "gatilhos": ["outlook", "teams", "office", "e-mail"],
      "passos": [
        "Teste acesso via web.",
        "Limpe credenciais salvas e reinicie o app.",
        "Informe mensagem de erro ou print caso continue."
      ]
    }
  ],
  "saida_esperada_ticket": {
    "titulo": "",
    "descricao_completa": "",
    "categoria": "",
    "prioridade": "",
    "dados_usuario": {
      "nome": "",
      "setor": "",
      "email": ""
    },
    "anexos": [],
    "status_inicial": "Aguardando técnico humano",
    "origem": "Chatbot ConectaBot"
  }
};

const systemPrompt = `
=== ESPECIFICAÇÃO ===
${JSON.stringify(SPEC, null, 2)}

=== PAPEL ===
Você é o ConectaBot (pré-atendimento). Coleta estruturada e encaminha.

=== ESTRATÉGIA ===
- Utilize a base_conhecimento para sugerir autoatendimento antes de abrir ticket.
- Combine múltiplos campos em até 4 perguntas diretas (apenas o essencial).
- Sempre que sugerir solução, confirme se resolveu. Caso sim, finalize cordialmente sem criar ticket.

=== CAMPOS & CONTROLE ===
- Coletar: nome_usuario, setor, email_corporativo, tipo_de_servico, descricao_do_problema, sistema_afetado, equipamento, prioridade, impacto_operacional, horario_do_problema, anexo_print, localizacao.
- Campo adicional: collected.precisa_atendimento ("sim" ou "nao").
- Somente defina done=true quando collected.precisa_atendimento="sim" E todos os campos essenciais presentes (nome_usuario, setor, email_corporativo, descricao_do_problema, tipo_de_servico ou sistema_afetado, prioridade).

=== RESPOSTA ===
Retorne SOMENTE JSON (sem markdown):
{
  "reply": "...",
  "collected": {...},
  "done": false,
  "classificacao": {"area":"", "categoria":"", "subtipo":""}
}

=== REGRAS FINAIS ===
- Se a pessoa disser que resolveu ou não precisa abrir chamado, mantenha done=false e defina collected.precisa_atendimento="nao".
- Apenas quando confirmar suporte humano necessário defina collected.precisa_atendimento="sim" e done=true.
`;

const KB_TABLE =
  import.meta.env.VITE_CONECTABOT_KB_TABLE || "ai_knowledge";
let cachedKnowledge = [];
let knowledgeFetchedAt = 0;
const KNOWLEDGE_TTL = 60 * 1000; // 1 minuto

async function loadKnowledge() {
  const now = Date.now();
  if (cachedKnowledge.length && now - knowledgeFetchedAt < KNOWLEDGE_TTL) {
    return cachedKnowledge;
  }

  const { data, error } = await supabase
    .from(KB_TABLE)
    .select("title, content, category, tags, source, is_active")
    .eq("is_active", true);

  if (error) {
    console.warn("[ConectaBot] Falha ao buscar conhecimento:", error.message);
    return cachedKnowledge;
  }

  cachedKnowledge = (data || []).map((row) => ({
    title: row.title,
    content: row.content,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    source: row.source || "",
  }));
  knowledgeFetchedAt = now;
  return cachedKnowledge;
}

export async function initFirstTurn(prefilled = {}, userContext = {}) {
  if (!OPENAI_KEY) {
    return {
      reply: "Olá! 👋 Configure a chave OpenAI para usar o ConectaBot.",
      collected: prefilled,
      done: false
    };
  }
  const initialMessages = [];
  if (userContext && Object.keys(userContext).length) {
    initialMessages.push({
      role: "system",
      content: "Contexto do usuário autenticado: " + JSON.stringify(userContext)
    });
  }
  return await chatConectaBot(initialMessages, prefilled);
}

export async function chatConectaBot(chatMessages, collected) {
  if (!OPENAI_KEY) {
    return { reply: "Chave OpenAI não configurada.", collected: collected || {}, done: false };
  }
  const payloadMessages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: "Estado atual (collected): " + JSON.stringify(collected || {}) },
    ...chatMessages.map(m => ({ role: m.role, content: m.content }))
  ];
  let raw;
  try {
    raw = await callChatCompletions(payloadMessages);
  } catch (e) {
    if (DEBUG) console.warn("[ConectaBot] fallback responses:", e.message);
    try {
      raw = await callResponses(payloadMessages);
    } catch (e2) {
      return { reply: "Erro IA: " + e2.message, collected: collected || {}, done: false };
    }
  }
  const parsed = safeParseBotJSON(raw, collected);
  if (DEBUG) console.log("[ConectaBot][parsed]", parsed);
  return parsed;
}

async function callChatCompletions(messages) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages,
      response_format: { type: "json_object" }
    })
  });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 400));
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function callResponses(messages) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      input: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
      response_format: { type: "json_object" }
    })
  });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 400));
  const j = await r.json();
  return j.output?.[0]?.content?.[0]?.text || j.output_text || "";
}

function safeParseBotJSON(text, collected) {
  if (DEBUG) console.log("[ConectaBot][raw]", text);
  let cleaned = (text || "").trim();
  cleaned = cleaned.replace(/```json/gi, "```").replace(/```/g, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1) cleaned = cleaned.slice(first, last + 1);
  let obj;
  try { obj = JSON.parse(cleaned); }
  catch (e) {
    if (DEBUG) console.warn("[ConectaBot] parse falhou:", e.message);
    obj = { reply: "Não consegui interpretar, pode reformular?", collected: {}, done: false, classificacao: {} };
  }
  obj.collected = { ...(collected || {}), ...(obj.collected || {}) };
  if (!obj.reply) obj.reply = "Pode continuar, preciso de mais detalhes.";
  if (typeof obj.done !== "boolean") obj.done = false;
  if (!obj.classificacao) obj.classificacao = { area: "", categoria: "", subtipo: "" };
  return obj;
}

export function montarTicket(collected, classificacao) {
  collected = collected || {};
  const tituloBase = collected.tipo_de_servico || collected.sistema_afetado || "Suporte";
  const descricaoCurta = (collected.descricao_do_problema || "").slice(0, 60) || "Chamado";
  const titulo = `${tituloBase} - ${descricaoCurta}`;
  const corpo = [
    `Descrição: ${collected.descricao_do_problema || "-"}`,
    `Sistema: ${collected.sistema_afetado || "-"}`,
    `Tipo Serviço: ${collected.tipo_de_servico || "-"}`,
    `Equipamento: ${collected.equipamento || "-"}`,
    `Impacto: ${collected.impacto_operacional || "-"}`,
    `Horário: ${collected.horario_do_problema || "-"}`,
    `Localização: ${collected.localizacao || "-"}`,
    `Anexo (ref): ${collected.anexo_print || "-"}`,
    `Classificação: ${classificacao?.area || ""} / ${classificacao?.categoria || ""} / ${classificacao?.subtipo || ""}`,
    `Origem: Chatbot ConectaBot`
  ].join("\n");
  const prioridade = normalizarPrioridade(collected.prioridade) ||
    inferirPrioridade(classificacao, collected.impacto_operacional);
  const categoria = classificacao?.categoria || collected.tipo_de_servico || collected.sistema_afetado || "suporte";
  return { titulo, descricao: corpo, prioridade, categoria };
}

function normalizarPrioridade(p) {
  if (!p) return null;
  const map = { alta: "high", high: "high", media: "medium", médio: "medium", medium: "medium", baixa: "low", low: "low", critica: "critical", crítico: "critical", critical: "critical" };
  return map[p.toLowerCase()] || null;
}

function inferirPrioridade(classificacao, impacto = "") {
  if (classificacao?.area === "area_1_suporte_operacao_critica") return "high";
  if (classificacao?.area === "area_2_suporte_corporativo") return "medium";
  if (classificacao?.area === "area_3_infraestrutura_e_seguranca") return "low";
  impacto = (impacto || "").toLowerCase();
  if (impacto.includes("parad") || impacto.includes("geral")) return "high";
  if (impacto.includes("setor") || impacto.includes("equipe")) return "medium";
  return "low";
}
