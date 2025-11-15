import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  chatConectaBot,
  montarTicket,
  initFirstTurn,
} from "../services/conectabot";
import supabase from "../../supabaseClient";

function precisaDeHumano(valor) {
  if (valor == null) return true;
  const texto = String(valor).trim().toLowerCase();
  return !["nao", "não", "no", "false", "resolvido"].includes(texto);
}

export default function ConectaBotChat({
  user,
  onTicketCreated,
  onClose,
  allowTicketCreation = true,
}) {
  const baseCollected = useMemo(() => {
    const base = {};
    if (user?.full_name) base.nome_usuario = user.full_name;
    if (user?.department) base.setor = user.department;
    if (user?.email) base.email_corporativo = user.email;
    return base;
  }, [user?.full_name, user?.department, user?.email]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [collected, setCollected] = useState(baseCollected);
  const bottomRef = useRef(null);
  const userColumn = import.meta.env.VITE_TICKETS_USER_COLUMN || "user_id";
  const model = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini";
  const hasKey = !!import.meta.env.VITE_OPENAI_API_KEY;

  useEffect(() => {
    if (Object.keys(baseCollected).length) {
      setCollected((prev) => ({ ...baseCollected, ...prev }));
    }
  }, [baseCollected]);

  useEffect(() => {
    // Primeira resposta automática da IA
    let cancel = false;
    (async () => {
      setLoading(true);
      const first = await initFirstTurn(baseCollected, {
        nome: baseCollected.nome_usuario,
        setor: baseCollected.setor,
        email: baseCollected.email_corporativo,
      });
      if (!cancel) {
        setCollected((prev) => ({
          ...baseCollected,
          ...(first.collected || {}),
          ...prev,
        }));
        setMessages([{ role: "assistant", content: first.reply }]);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id, baseCollected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, creatingTicket]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading || creatingTicket) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await chatConectaBot([...messages, userMsg], collected);
      setCollected(r.collected);
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      if (r.done) {
        const precisaHumano = precisaDeHumano(r.collected?.precisa_atendimento);
        if (!precisaHumano) {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                "Perfeito! Como o problema foi solucionado, não abrirei chamado. Se precisar novamente, estou à disposição.",
            },
          ]);
          return;
        }
        if (allowTicketCreation) {
          await criarTicket(r.collected, r.classificacao);
        } else {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                "Coleta concluída. Use estas informações para agilizar o atendimento humano (modo assistência).",
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Falha: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function criarTicket(col, classificacao) {
    if (creatingTicket) return;
    setCreatingTicket(true);
    try {
      const { titulo, descricao, prioridade, categoria } = montarTicket(
        col,
        classificacao
      );
      const payloadBase = {
        title: titulo,
        description: descricao,
        priority: prioridade,
        category: categoria,
        status: "open",
        created_by: user?.id || null,
      };
      const payload =
        user?.id && userColumn && userColumn !== "created_by"
          ? { ...payloadBase, [userColumn]: user.id }
          : payloadBase;

      let { error } = await supabase.from("tickets").insert(payload);

      if (
        error &&
        userColumn &&
        userColumn !== "created_by" &&
        error.message?.includes(userColumn)
      ) {
        const fallbackPayload = { ...payloadBase };
        ({ error } = await supabase.from("tickets").insert(fallbackPayload));
      }

      if (error) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Erro ao criar ticket: " + error.message,
          },
        ]);
        return;
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Ticket criado e encaminhado. Obrigado! 🚀",
        },
      ]);
      onTicketCreated?.();
    } finally {
      setCreatingTicket(false);
    }
  }

  function quickTest() {
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: `Diagnóstico:
Chave: ${hasKey ? "OK" : "FALTANDO"}
Modelo: ${model}
Campos coletados: ${Object.keys(collected).length}
Pronto (done)? ${
          [
            "nome_usuario",
            "setor",
            "email_corporativo",
            "descricao_do_problema",
          ].every((k) => collected[k])
            ? "Parcial"
            : "Incompleto"
        }
`,
      },
    ]);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <strong>ConectaBot</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!allowTicketCreation && (
            <span
              style={{
                fontSize: 11,
                color: "#555",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                padding: "2px 6px",
                borderRadius: 6,
              }}
            >
              Assistência (sem criar chamados)
            </span>
          )}
          <button onClick={onClose} style={styles.closeBtn} aria-label="Fechar">
            ×
          </button>
        </div>
      </div>
      <div style={styles.body}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...styles.msg,
              ...(m.role === "assistant" ? styles.assistant : styles.user),
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.msg, ...styles.assistant }}>
            Processando...
          </div>
        )}
        {creatingTicket && (
          <div style={{ ...styles.msg, ...styles.assistant }}>
            Criando ticket...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} style={styles.form}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite..."
          style={styles.input}
          disabled={loading || creatingTicket}
        />
        <button
          disabled={loading || creatingTicket || !input.trim()}
          style={styles.sendBtn}
        >
          {creatingTicket ? "..." : "Enviar"}
        </button>
      </form>
      <small style={styles.footerInfo}>
        Campos coletados:{" "}
        {Object.entries(collected).filter(([_, v]) => v).length}
      </small>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "fixed",
    bottom: 105,
    right: 20,
    width: 360,
    background: "#fff",
    border: "1px solid #ccc",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
    zIndex: 2000,
    fontFamily: "system-ui, sans-serif",
  },
  header: {
    padding: "8px 12px",
    borderBottom: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f7f7f7",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  body: {
    padding: 12,
    overflowY: "auto",
    maxHeight: 380,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  msg: {
    padding: "6px 10px",
    borderRadius: 8,
    lineHeight: "1.35",
    fontSize: 13,
    whiteSpace: "pre-wrap",
  },
  assistant: { background: "#f1f3f5", alignSelf: "flex-start" },
  user: { background: "#d1e7ff", alignSelf: "flex-end" },
  form: { display: "flex", gap: 6, padding: 8, borderTop: "1px solid #eee" },
  input: {
    flex: 1,
    padding: "6px 8px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid #bbb",
  },
  sendBtn: { padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  closeBtn: {
    background: "transparent",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
  },
  smallBtn: {
    background: "#eee",
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 11,
    cursor: "pointer",
  },
  footerInfo: { color: "#666", fontSize: 11, margin: "0 8px 8px" },
  alert: {
    background: "#ffecec",
    color: "#a00",
    padding: "6px 10px",
    fontSize: 12,
    borderBottom: "1px solid #f5c2c2",
  },
  metaBar: {
    display: "flex",
    gap: 12,
    padding: "4px 10px",
    fontSize: 11,
    borderBottom: "1px solid #eee",
    background: "#fafafa",
  },
  metaItem: { color: "#555" },
};
