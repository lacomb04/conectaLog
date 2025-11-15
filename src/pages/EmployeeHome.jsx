import React, { useEffect, useState, useMemo } from "react";
import supabase from "../../supabaseClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, TextArea } from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import { Link } from "react-router-dom";
import styled from "styled-components";
import ConectaBotChat from "../components/ConectaBotChat";

const STATUS_FLOW = ["open", "in_progress", "waiting", "resolved", "closed"];
const STATUS_LABEL = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting: "Aguardando",
  resolved: "Resolvido",
  closed: "Concluído",
};

const TicketCard = styled(Card)`
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openRatingModal(t)}
                          >
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 3000;
`;
                              await supabase
                                .from("tickets")
                                .update({
                                  status: "in_progress",
                                  resolution_rating: null,
                                  resolution_feedback: null,
                                  resolution_confirmed_at: null,
                                  resolution_confirmed_by: null,
                                  closed_at: null,
                                })
                                .eq("id", t.id);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
  display: flex;
                                    ? {
                                        ...x,
                                        status: "in_progress",
                                        resolution_rating: null,
                                        resolution_feedback: null,
                                        resolution_confirmed_at: null,
                                        resolution_confirmed_by: null,
                                        closed_at: null,
                                      }
  gap: var(--space-4);
`;

const ProgressTrack = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
`;

const ProgressNode = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
  color: ${({ active }) => (active ? "var(--primary)" : "var(--muted)")};
  font-size: 0.82rem;
`;

const NodeDot = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: ${({ active }) => (active ? "var(--primary)" : "var(--border)")};
  box-shadow: ${({ active }) =>
    active ? "0 0 0 4px rgba(15, 23, 42, 0.15)" : "none"};
  transition: background 0.2s ease, box-shadow 0.2s ease;
`;

const Connector = styled.span`
  flex: 1;
  height: 2px;
  background: ${({ complete }) =>
    complete ? "var(--primary)" : "var(--border)"};
  transition: background 0.2s ease;
`;

export default function EmployeeHome({ user, searchTerm }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "hardware",
    priority: "medium",
  });
  const [now, setNow] = useState(Date.now());
  const [showAIChat, setShowAIChat] = useState(false);
  const [ratingModal, setRatingModal] = useState({ visible: false, ticket: null });
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setTickets(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from("tickets").insert({
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      created_by: user.id,
      status: "open",
    });
    if (!error) {
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        category: "hardware",
        priority: "medium",
      });
      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      setTickets(data || []);
    }
  }

  async function handleDelete(ticketId) {
    if (!window.confirm("Tem certeza que deseja excluir este chamado?")) return;
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", ticketId)
      .eq("created_by", user.id);
    if (error) {
      alert("Não foi possível excluir o chamado.");
      return;
    }
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  function openRatingModal(ticket) {
    setRatingModal({ visible: true, ticket });
    setRatingValue(ticket?.resolution_rating || 5);
    setRatingComment(ticket?.resolution_feedback || "");
  }

  function closeRatingModal() {
    setRatingModal({ visible: false, ticket: null });
    setRatingValue(5);
    setRatingComment("");
    setRatingLoading(false);
  }

  async function handleRatingSubmit() {
    if (!ratingModal.ticket) return;
    setRatingLoading(true);
    const nowIso = new Date().toISOString();
    const sanitizedRating = Math.min(5, Math.max(1, ratingValue));
    const sanitizedFeedback = ratingComment.trim();

    const { error } = await supabase
      .from("tickets")
      .update({
        status: "closed",
        closed_at: nowIso,
        resolution_rating: sanitizedRating,
        resolution_feedback: sanitizedFeedback || null,
        resolution_confirmed_at: nowIso,
        resolution_confirmed_by: user.id,
      })
      .eq("id", ratingModal.ticket.id)
      .eq("created_by", user.id);

    if (error) {
      alert("Não foi possível concluir o chamado. Tente novamente.");
      setRatingLoading(false);
      return;
    }

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ratingModal.ticket.id
          ? {
              ...t,
              status: "closed",
              closed_at: nowIso,
              resolution_rating: sanitizedRating,
              resolution_feedback: sanitizedFeedback || null,
              resolution_confirmed_at: nowIso,
              resolution_confirmed_by: user.id,
            }
          : t,
      ),
    );

    closeRatingModal();
  }

  const formatDuration = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(
      2,
      "0"
    );
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const normalizedSearch = (searchTerm || "").trim().toLowerCase();
  const filteredTickets = useMemo(() => {
    if (!normalizedSearch) return tickets;
    return tickets.filter((t) => {
      const statusLabel = STATUS_LABEL[t.status] || "";
      return [t.title, t.description, t.category, t.priority, statusLabel]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(normalizedSearch));
    });
  }, [tickets, normalizedSearch]);
  const activeTickets = filteredTickets.filter((t) => t.status !== "closed");
  const closedTickets = filteredTickets.filter((t) => t.status === "closed");

  return (
    <div>
      <div className="stack-between section">
        <h1>Meus Chamados</h1>
        <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "Novo chamado"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form
            onSubmit={handleSubmit}
            className="stack"
            style={{ flexDirection: "column", gap: "12px" }}
          >
            <Input
              placeholder="Título do chamado"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />
            <TextArea
              placeholder="Descreva o problema"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              required
            />
            <div className="stack">
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                style={{ maxWidth: 220 }}
              >
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="network">Rede</option>
                <option value="access">Acesso</option>
                <option value="other">Outro</option>
              </Select>
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                style={{ maxWidth: 220 }}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </Select>
              <Button type="submit">Enviar</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="section">
        {loading ? (
          <p>Carregando...</p>
        ) : activeTickets.length === 0 ? (
          <Card>
            <p>
              {normalizedSearch
                ? "Nenhum chamado encontrado para a busca."
                : "Nenhum chamado em andamento."}
            </p>
          </Card>
        ) : (
          <div className="cards-grid">
            {activeTickets.map((t) => {
              const currentIndex = STATUS_FLOW.indexOf(t.status);
              const createdAtMs = new Date(t.created_at).getTime();
              const responseMs = (t.sla_response_time || 0) * 60000;
              const resolutionMs = (t.sla_resolution_time || 0) * 60000;
              const responseDeadline = createdAtMs + responseMs;
              const resolutionDeadline = createdAtMs + resolutionMs;
              const remainingResponse = responseMs
                ? responseDeadline - now
                : null;
              const remainingResolution = resolutionMs
                ? resolutionDeadline - now
                : null;
              const hasResponse = Boolean(t.first_response_at);
              const hasResolution = Boolean(t.resolved_at);
              const isOverdue =
                remainingResponse !== null && remainingResponse <= 0;
              const isWarning =
                remainingResponse !== null &&
                remainingResponse > 0 &&
                remainingResponse <= 5 * 60 * 1000;
              const isClosed = t.status === "closed";
              const baseCardStyle = {
                borderColor: isOverdue
                  ? "#ef4444"
                  : isWarning
                  ? "#f97316"
                  : undefined,
                boxShadow: isOverdue
                  ? "0 0 0 4px rgba(239,68,68,0.25)"
                  : isWarning
                  ? "0 0 0 4px rgba(249,115,22,0.2)"
                  : undefined,
                background: "rgba(255, 255, 255, 0.95)",
              };
              return (
                <TicketCard key={t.id} style={baseCardStyle}>
                  <div className="stack-between">
                    <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{t.title}</h3>
                    <Badge tone="neutral">
                      {STATUS_LABEL[t.status] || t.status}
                    </Badge>
                  </div>
                  <p>
                    <strong>Categoria:</strong> {t.category} •{" "}
                    <strong>Prioridade:</strong> {t.priority}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </p>

                  <ProgressTrack>
                    {STATUS_FLOW.map((status, index) => {
                      const active = index <= currentIndex;
                      return (
                        <React.Fragment key={status}>
                          <ProgressNode active={active}>
                            <NodeDot active={active} />
                            <span style={{ marginTop: "4px" }}>
                              {STATUS_LABEL[status]}
                            </span>
                          </ProgressNode>
                          {index < STATUS_FLOW.length - 1 && (
                            <Connector complete={index < currentIndex} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ProgressTrack>

                  <div
                    className="stack-between"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    <div
                      className="center-column"
                      style={{ alignItems: "flex-start", gap: "6px" }}
                    >
                      <span>
                        <strong>Tempo para resposta:</strong>{" "}
                        {hasResponse ? "✅ " : ""}
                        {remainingResponse !== null
                          ? formatDuration(remainingResponse)
                          : "—"}
                      </span>
                      <span>
                        <strong>Tempo para resolução:</strong>{" "}
                        {hasResolution ? "✅ " : ""}
                        {remainingResolution !== null
                          ? formatDuration(remainingResolution)
                          : "—"}
                      </span>
                    </div>
                    <div
                      className="center-column"
                      style={{ alignItems: "flex-end", gap: "var(--space-2)" }}
                    >
                      <Button
                        as={Link}
                        to={`/ticket/${t.id}`}
                        variant="primary"
                      >
                        Abrir chat
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        style={{ color: "#ef4444" }}
                      >
                        Excluir chamado
                      </Button>
                      {t.status === "resolved" && (
                        <div
                          className="stack"
                          style={{ gap: "var(--space-2)" }}
                        >
                          <Button
                            variant="soft"
                            size="sm"
                            onClick={async () => {
                              await supabase
                                .from("tickets")
                                .update({ status: "closed" })
                                .eq("id", t.id);
                              setTickets((prev) =>
                                prev.map((x) =>
                                  x.id === t.id ? { ...x, status: "closed" } : x
                                )
                              );
                            }}
                          >
                            Concluir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await supabase
                                .from("tickets")
                                .update({ status: "in_progress" })
                                .eq("id", t.id);
                              setTickets((prev) =>
                                prev.map((x) =>
                                  x.id === t.id
                                    ? { ...x, status: "in_progress" }
                                    : x
                                )
                              );
                            }}
                          >
                            Reabrir
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </TicketCard>
              );
            })}
          </div>
        )}
      </div>

      {closedTickets.length > 0 && (
        <div className="section" style={{ marginTop: "var(--space-5)" }}>
          <h2>Concluídos</h2>
          <div className="cards-grid">
            {closedTickets.map((t) => {
              const currentIndex = STATUS_FLOW.indexOf(t.status);
              const createdAtMs = new Date(t.created_at).getTime();
              const responseMs = (t.sla_response_time || 0) * 60000;
              const resolutionMs = (t.sla_resolution_time || 0) * 60000;
              const remainingResponse = responseMs
                ? createdAtMs + responseMs - now
                : null;
              const remainingResolution = resolutionMs
                ? createdAtMs + resolutionMs - now
                : null;
              const hasResponse = Boolean(t.first_response_at);
              const hasResolution = Boolean(t.resolved_at);
              return (
                <TicketCard
                  key={t.id}
                  style={{
                    borderColor: "#22c55e",
                    boxShadow: "0 0 0 4px rgba(34,197,94,0.25)",
                    background: "#f3f4f6",
                  }}
                >
                  <div className="stack-between">
                    <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{t.title}</h3>
                    <Badge tone="neutral">
                      {STATUS_LABEL[t.status] || t.status}
                    </Badge>
                  </div>
                  <p>
                    <strong>Categoria:</strong> {t.category} •{" "}
                    <strong>Prioridade:</strong> {t.priority}
                  </p>
                  <p>
                    <strong>Criado em:</strong>{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                  <ProgressTrack>
                    {STATUS_FLOW.map((status, index) => {
                      const active = index <= currentIndex;
                      return (
                        <React.Fragment key={status}>
                          <ProgressNode active={active}>
                            <NodeDot active={active} />
                            <span style={{ marginTop: "4px" }}>
                              {STATUS_LABEL[status]}
                            </span>
                          </ProgressNode>
                          {index < STATUS_FLOW.length - 1 && (
                            <Connector complete={index < currentIndex} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ProgressTrack>
                  <div
                    className="stack-between"
                    style={{ marginTop: "var(--space-2)" }}
                  >
                    <div
                      className="center-column"
                      style={{ alignItems: "flex-start", gap: "6px" }}
                    >
                      <span>
                        <strong>Tempo para resposta:</strong>{" "}
                        {hasResponse ? "✅ " : ""}
                        {remainingResponse !== null
                          ? formatDuration(remainingResponse)
                          : "—"}
                      </span>
                      <span>
                        <strong>Tempo para resolução:</strong>{" "}
                        {hasResolution ? "✅ " : ""}
                        {remainingResolution !== null
                          ? formatDuration(remainingResolution)
                          : "—"}
                      </span>
                    </div>
                    <div
                      className="center-column"
                      style={{ alignItems: "flex-end", gap: "var(--space-2)" }}
                    >
                      <Button
                        as={Link}
                        to={`/ticket/${t.id}`}
                        variant="primary"
                      >
                        Ver detalhes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        style={{ color: "#ef4444" }}
                      >
                        Excluir chamado
                      </Button>
                    </div>
                  </div>
                </TicketCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão flutuante para abrir o ConectaBot (IA) */}
      <button
        type="button"
        aria-label="Abrir chat IA ConectaBot"
        title="Suporte IA ConectaBot"
        onClick={() => setShowAIChat((o) => !o)}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg,#6366f1,#4338ca)",
          color: "#fff",
          fontSize: "1.7rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 18px 40px rgba(15,23,42,0.28)",
          zIndex: 1000,
        }}
      >
        🤖
      </button>

      {/* Overlay do chat IA */}
      {showAIChat && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            right: 32,
            zIndex: 1001,
          }}
        >
          <ConectaBotChat
            user={user}
            onTicketCreated={async () => {
              // Recarrega lista após criação via IA
              const { data } = await supabase
                .from("tickets")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false });
              setTickets(data || []);
              setShowAIChat(false);
            }}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
    </div>
  );
}
