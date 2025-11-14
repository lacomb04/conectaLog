import React, { useEffect, useState } from "react";
import supabase from "../../supabaseClient";
import { Link } from "react-router-dom";
import ConectaBotChat from "../components/ConectaBotChat";
import TeamChatPanel from "../components/TeamChatPanel";
import ChatDock from "../components/ChatDock";

export default function SupportHome({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", priority: "" });
  const [supportUsers, setSupportUsers] = useState([]);
  const [transferOpen, setTransferOpen] = useState(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showTeamChat, setShowTeamChat] = useState(false);
  const chatButtons = [
    {
      key: "team",
      label: "Equipe",
      icon: "🗨️",
      active: showTeamChat,
      bg: "linear-gradient(135deg,#0ea5e9,#0284c7)",
      onClick: () => {
        setShowAIChat(false);
        setShowTeamChat((o) => !o);
      },
    },
    {
      key: "bot",
      label: "ConectaBot",
      icon: "🤖",
      active: showAIChat,
      activeBg: "linear-gradient(135deg,#6366f1,#4338ca)",
      onClick: () => {
        setShowTeamChat(false);
        setShowAIChat((o) => !o);
      },
    },
  ];

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .in("role", ["admin", "support"]);
      setSupportUsers((data || []).filter((u) => u.id !== user.id));
    })();
  }, [user?.id]);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      let query = supabase
        .from("tickets")
        .select("*, user:users(full_name, department)")
        .or(`assigned_to.is.null,assigned_to.eq.${user?.id || "000"}`);
      if (filter.status) query = query.eq("status", filter.status);
      if (filter.priority) query = query.eq("priority", filter.priority);
      const { data } = await query.order("created_at", { ascending: false });
      setTickets(data || []);
      setLoading(false);
    }
    if (user?.id) fetchTickets();
  }, [filter, user?.id]);

  async function assignToSelf(id) {
    if (!user?.id) return;
    await supabase
      .from("tickets")
      .update({ assigned_to: user.id })
      .eq("id", id);
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, assigned_to: user.id } : t))
    );
  }

  async function transferTicket(id, newUserId) {
    if (!newUserId) return;
    await supabase
      .from("tickets")
      .update({ assigned_to: newUserId })
      .eq("id", id);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="container">
      <h2>Tickets de Suporte</h2>
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <select
          value={filter.status}
          onChange={(e) =>
            setFilter((f) => ({ ...f, status: e.target.value }))
          }
        >
          <option value="">Todos Status</option>
          <option value="open">Aberto</option>
          <option value="in_progress">Em andamento</option>
          <option value="waiting">Aguardando</option>
          <option value="resolved">Resolvido</option>
          <option value="closed">Fechado</option>
        </select>
        <select
          value={filter.priority}
          onChange={(e) =>
            setFilter((f) => ({ ...f, priority: e.target.value }))
          }
        >
          <option value="">Todas Prioridades</option>
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="critical">Crítica</option>
        </select>
        <Link
          to="/conectabot"
          style={{
            padding: "6px 10px",
            background: "#1e88e5",
            color: "#fff",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Central ConectaBot
        </Link>
      </div>
      <ul>
        {loading ? (
          <li>Carregando...</li>
        ) : (
          tickets.map((ticket) => {
            const isMine = ticket.assigned_to === user?.id;
            return (
              <li key={ticket.id} style={{ marginBottom: 16 }}>
                <Link to={`/ticket/${ticket.id}`}>{ticket.title}</Link>
                <span style={{ marginLeft: 8, color: "#888" }}>
                  {ticket.status}
                </span>
                <span style={{ marginLeft: 8, color: "#888" }}>
                  Prioridade: {ticket.priority}
                </span>
                <span style={{ marginLeft: 8, color: "#888" }}>
                  Funcionário: {ticket.user?.full_name}
                </span>
                {!ticket.assigned_to && (
                  <button
                    style={{ marginLeft: 12 }}
                    onClick={() => assignToSelf(ticket.id)}
                  >
                    Assumir
                  </button>
                )}
                {isMine && (
                  <>
                    <button
                      style={{ marginLeft: 12 }}
                      onClick={() =>
                        setTransferOpen((cur) =>
                          cur === ticket.id ? null : ticket.id
                        )
                      }
                    >
                      {transferOpen === ticket.id ? "Cancelar" : "Transferir"}
                    </button>
                    {transferOpen === ticket.id && (
                      <select
                        style={{ marginLeft: 8 }}
                        defaultValue=""
                        onChange={(e) =>
                          transferTicket(ticket.id, e.target.value)
                        }
                      >
                        <option value="">Selecionar destino...</option>
                        {supportUsers.map((su) => (
                          <option key={su.id} value={su.id}>
                            {su.full_name || su.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </li>
            );
          })
        )}
      </ul>
      {showTeamChat && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            right: 32,
            zIndex: 1300,
          }}
        >
          <TeamChatPanel user={user} onClose={() => setShowTeamChat(false)} />
        </div>
      )}
      {showAIChat && (
        <div
          style={{
            position: "fixed",
            bottom: 210,
            right: 32,
            zIndex: 1300,
          }}
        >
          <ConectaBotChat
            user={user}
            onTicketCreated={() => {
              setShowAIChat(false);
              setFilter((f) => ({ ...f }));
            }}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
      <ChatDock buttons={chatButtons} />
    </div>
  );
}
