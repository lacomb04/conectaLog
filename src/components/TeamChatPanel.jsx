import React, { useEffect, useState, useRef } from "react";
import supabase from "../../supabaseClient";

const PAGE_LIMIT = 50;

export default function TeamChatPanel({ user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const viewportRef = useRef(null);

  const canChat =
    ["admin", "support"].includes(user?.role) ||
    ["admin", "support"].includes(user?.user_metadata?.role);

  useEffect(() => {
    if (!canChat) return;
    const channel = supabase
      .channel("team-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          requestAnimationFrame(() => {
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: "smooth",
            });
          });
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .select(
          "id, content, sender_id, sender_name, sender_role, created_at"
        )
        .order("created_at", { ascending: true })
        .limit(PAGE_LIMIT);
      if (error) {
        if (error.code === "42501") {
          setSetupError(
            "Permissão negada (42501). Verifique as policies RLS para SELECT na tabela team_chat_messages."
          );
        } else {
          setSetupError(
            "Tabela team_chat_messages não encontrada. Crie-a para habilitar o chat."
          );
        }
      } else {
        setMessages(data || []);
        requestAnimationFrame(() => {
          viewportRef.current?.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: "smooth",
          });
        });
      }
      setLoading(false);
    })();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [canChat]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || setupError) return;
    const payload = {
      content: input.trim(),
      sender_id: user?.id || null,
      sender_name:
        user?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Suporte",
      sender_role:
        user?.role ||
        user?.user_metadata?.role ||
        "support",
    };
    setInput("");
    const { error } = await supabase
      .from("team_chat_messages")
      .insert(payload);
    if (error) {
      if (error.code === "42501") {
        setSetupError(
          "Permissão negada (42501). Ajuste as policies RLS de INSERT para a tabela team_chat_messages."
        );
      } else {
        setSetupError(
          `Falha ao enviar (${error.code || "erro"}). Verifique se a tabela team_chat_messages existe.`
        );
      }
    }
  }

  if (!canChat) {
    return (
      <aside style={styles.panel}>
        <header style={styles.header}>
          <strong>Chat da Equipe</strong>
          <button onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </header>
        <p style={{ padding: 16, fontSize: 13 }}>
          Somente usuários de suporte ou administradores podem acessar este
          espaço.
        </p>
      </aside>
    );
  }

  return (
    <aside style={styles.panel}>
      <header style={styles.header}>
        <div>
          <strong>Chat da Equipe</strong>
          <span style={styles.subtitle}>
            Comunicação rápida entre suporte e administração
          </span>
        </div>
        <button onClick={onClose} style={styles.closeBtn}>
          ×
        </button>
      </header>
      {setupError && (
        <div style={styles.alert}>
          {setupError}
          <details style={{ marginTop: 6, fontSize: 12 }}>
            <summary>Como liberar acesso</summary>
            <pre style={styles.sql}>
{`-- Exemplo de policy para SELECT/INSERT
create policy "Team chat select" on public.team_chat_messages
  for select using (
    auth.role() = 'anon'
    and coalesce(auth.jwt()->'user_metadata'->>'role','') in ('admin','support')
  );

create policy "Team chat insert" on public.team_chat_messages
  for insert with check (
    auth.role() = 'anon'
    and coalesce(auth.jwt()->'user_metadata'->>'role','') in ('admin','support')
  );`}
            </pre>
          </details>
        </div>
      )}
      <div ref={viewportRef} style={styles.messages}>
        {loading && <span style={styles.loading}>Carregando...</span>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.sender_id === user?.id ? styles.mine : styles.other),
            }}
          >
            <div style={styles.msgMeta}>
              <strong>{msg.sender_name}</strong>
              <span>
                {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p style={styles.msgText}>{msg.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={styles.form}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Compartilhe uma atualização..."
          style={styles.input}
          disabled={!!setupError}
        />
        <button type="submit" style={styles.sendBtn} disabled={!!setupError}>
          Enviar
        </button>
      </form>
    </aside>
  );
}

const styles = {
  panel: {
    width: 360,
    maxHeight: "70vh",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
    border: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subtitle: { display: "block", fontSize: 11, color: "#64748b" },
  closeBtn: {
    border: "none",
    background: "#f1f5f9",
    width: 28,
    height: 28,
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#f8fafc",
  },
  loading: { fontSize: 12, color: "#64748b" },
  message: {
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    maxWidth: "85%",
  },
  mine: {
    alignSelf: "flex-end",
    background: "#e0f2fe",
    borderColor: "rgba(2,136,209,0.25)",
  },
  other: { alignSelf: "flex-start" },
  msgMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    marginBottom: 4,
    color: "#475569",
  },
  msgText: { margin: 0, fontSize: 13, color: "#1e293b" },
  form: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
  },
  input: {
    flex: 1,
    borderRadius: 10,
    border: "1px solid #cbd5f5",
    padding: "8px 10px",
    fontSize: 13,
  },
  sendBtn: {
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#4338ca)",
    color: "#fff",
    borderRadius: 10,
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  alert: {
    margin: "8px 16px 0",
    padding: "10px 12px",
    background: "#fef3c7",
    border: "1px solid #fcd34d",
    borderRadius: 10,
    fontSize: 12,
    color: "#92400e",
  },
  sql: {
    marginTop: 8,
    background: "#1f2937",
    color: "#e5e7eb",
    padding: 8,
    borderRadius: 8,
    overflowX: "auto",
  },
};
