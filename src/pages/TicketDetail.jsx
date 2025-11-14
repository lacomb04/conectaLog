import React, { useEffect, useState, useRef } from "react";
import supabase from "../../supabaseClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { useParams, useNavigate } from "react-router-dom";

export default function TicketDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    async function fetchTicket() {
      const { data: t } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();
      setTicket(t || null);
    }
    async function fetchMessages() {
      const { data: m } = await supabase
        .from("messages")
        .select("*, user:users(full_name)")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      setMessages(m || []);
    }
    fetchTicket();
    fetchMessages();

    const subscription = supabase
      .channel(`messages-ticket-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${id}`,
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    await supabase
      .from("messages")
      .insert({
        ticket_id: id,
        user_id: user.id,
        message: msg,
        is_internal: false,
      });
    setMsg("");
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }

  async function updateStatus(newStatus) {
    await supabase.from("tickets").update({ status: newStatus }).eq("id", id);
    const { data: t } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", id)
      .single();
    setTicket(t);
  }

  if (!ticket)
    return (
      <Card>
        <p>Ticket não encontrado.</p>
        <Button variant="soft" onClick={() => navigate(-1)}>
          Voltar
        </Button>
      </Card>
    );

  return (
    <div className="page-shell">
      <div className="stack-between section">
        <div className="stack">
          <Button variant="soft" onClick={() => navigate(-1)}>
            Voltar
          </Button>
          <h1>{ticket.title}</h1>
        </div>
        <div className="stack">
          <Badge tone="neutral">{ticket.status}</Badge>
          {user.role !== "employee" && (
            <Select
              value={ticket.status}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ width: 180 }}
            >
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="waiting">Aguardando</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </Select>
          )}
        </div>
      </div>
      <Card className="center-column">
        <p>
          <strong>Descrição:</strong> {ticket.description}
        </p>
        <p>
          <strong>Categoria:</strong> {ticket.category} •{" "}
          <strong>Prioridade:</strong> {ticket.priority}
        </p>
        <p>
          <strong>Criado em:</strong>{" "}
          {new Date(ticket.created_at).toLocaleString()}
        </p>
      </Card>
      <div className="section">
        <Card className="center-column" style={{ alignItems: "stretch" }}>
          <div
            ref={boxRef}
            style={{
              maxHeight: 360,
              overflowY: "auto",
              paddingRight: 4,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.user_id === user.id ? "flex-end" : "flex-start",
                  maxWidth: "70%",
                }}
              >
                <Card
                  style={{
                    padding: "10px 12px",
                    background:
                      m.user_id === user.id
                        ? "var(--surface-2)"
                        : "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      fontSize: ".85rem",
                      color: "var(--muted)",
                      marginBottom: 4,
                    }}
                  >
                    {m.user?.full_name || "Usuário"}
                  </div>
                  <div>{m.message}</div>
                </Card>
              </div>
            ))}
          </div>
          <form
            onSubmit={sendMessage}
            className="stack"
            style={{ gap: "var(--space-3)" }}
          >
            <Input
              placeholder="Digite sua mensagem..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <Button type="submit">Enviar</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
