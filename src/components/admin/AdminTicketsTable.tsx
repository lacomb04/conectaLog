import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { supabase } from "../../services/supabaseClient";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Input } from "../ui/Input";

const TableShell = styled.div`
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TableCard = styled.div`
  background: var(--surface, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
`;

const TitleWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const FilterInput = styled(Input)`
  max-width: 200px;
`;

const ColumnMenu = styled.div`
  position: absolute;
  top: 42px;
  right: 0;
  background: #ffffff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
  padding: 12px;
  min-width: 200px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ColumnToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--muted, #475569);
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 960px;
`;

const Th = styled.th`
  text-align: left;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted, #475569);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e2e8f0);
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const Tr = styled.tr`
  border-bottom: 1px solid var(--border, #edf2f7);
  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.95rem;
  color: var(--text, #1f2937);
  vertical-align: middle;
`;

const EmptyState = styled.div`
  padding: 48px;
  text-align: center;
  color: var(--muted, #64748b);
  font-size: 0.95rem;
`;

const AvatarStack = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AvatarBubble = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const AvatarInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.85rem;
`;

const Highlight = styled.span`
  display: inline-flex;
  font-size: 0.8rem;
  color: var(--muted, #64748b);
`;

const StatusDot = styled.span<{ tone: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ tone }) => tone};
`;

const StatusWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const allColumns = [
  "Ticket",
  "Solicitante",
  "Responsável",
  "Categoria",
  "Prioridade",
  "Status",
  "SLA",
  "Criado em",
  "Atualizado em",
  "Avaliação",
] as const;

type ColumnKey = (typeof allColumns)[number];

type TicketRow = {
  id: string;
  ticket_number: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  category: string | null;
  created_at: string;
  updated_at: string | null;
  response_deadline: string | null;
  resolution_deadline: string | null;
  closed_at: string | null;
  sla_response_time: number | null;
  sla_resolution_time: number | null;
  resolution_rating: number | null;
  resolution_feedback: string | null;
  creator: {
    full_name: string | null;
    email: string | null;
  } | null;
  assignee: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type AdminTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string | null;
  responseDeadline: string | null;
  resolutionDeadline: string | null;
  slaResponseTime: number | null;
  slaResolutionTime: number | null;
  closedAt: string | null;
  resolutionRating: number | null;
  resolutionFeedback: string | null;
  requesterName: string;
  requesterEmail: string;
  assigneeName: string;
  assigneeEmail: string;
};

const statusColor: Record<string, string> = {
  open: "#60a5fa",
  in_progress: "#f97316",
  waiting: "#facc15",
  waiting_response: "#facc15",
  resolved: "#34d399",
  closed: "#6366f1",
};

const statusTone: Record<string, "info" | "warning" | "success" | "danger" | "neutral"> = {
  open: "info",
  in_progress: "warning",
  waiting: "warning",
  waiting_response: "warning",
  resolved: "success",
  closed: "neutral",
};

const priorityTone: Record<string, "danger" | "warning" | "info" | "success" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

function formatSla(deadline: string | null, fallbackMinutes: number | null): string {
  if (!deadline && !fallbackMinutes) return "—";
  const now = Date.now();
  if (deadline) {
    const diff = new Date(deadline).getTime() - now;
    const abs = Math.abs(diff);
    const hours = Math.floor(abs / 3_600_000);
    const minutes = Math.floor((abs % 3_600_000) / 60_000);
    const label = diff >= 0 ? "restantes" : "em atraso";
    return `${hours}h ${minutes}min ${label}`;
  }
  if (fallbackMinutes) {
    const hours = Math.floor(fallbackMinutes / 60);
    const minutes = fallbackMinutes % 60;
    return `${hours}h ${minutes}min`;
  }
  return "—";
}

function initialsFrom(name: string, email: string): string {
  const source = name || email || "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[^\w\s]/g, "").toLowerCase();
}

interface AdminTicketsTableProps {
  searchTerm?: string;
  onViewTicket?: (ticketId: string) => void;
}

const AdminTicketsTable: React.FC<AdminTicketsTableProps> = ({
  searchTerm = "",
  onViewTicket,
}) => {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([...allColumns]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select(
          "*, creator:users!tickets_created_by_fkey(full_name,email), assignee:users!tickets_assigned_to_fkey(full_name,email)"
        )
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setTickets([]);
        setLoading(false);
        return;
      }

      const mapped = (data as TicketRow[] | null)?.map((row) => ({
        id: row.id,
        ticketNumber: row.ticket_number || row.id.slice(0, 8).toUpperCase(),
        title: row.title,
        description: row.description || "",
        status: row.status,
        priority: row.priority || "—",
        category: row.category || "—",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        responseDeadline: row.response_deadline,
        resolutionDeadline: row.resolution_deadline,
        slaResponseTime: row.sla_response_time,
        slaResolutionTime: row.sla_resolution_time,
        closedAt: row.closed_at,
        resolutionRating: row.resolution_rating,
        resolutionFeedback: row.resolution_feedback,
        requesterName: row.creator?.full_name || row.creator?.email || "—",
        requesterEmail: row.creator?.email || "",
        assigneeName: row.assignee?.full_name || "Não atribuído",
        assigneeEmail: row.assignee?.email || "",
      })) ?? [];

      setTickets(mapped);
      setLoading(false);
    };

    let active = true;
    (async () => {
      if (!active) return;
      await loadTickets();
    })();

    const channel = supabase
      .channel("admin-overview-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("click", handleClick);
    }
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [menuOpen]);

  const normalizedSearch = normalize(searchTerm || "");

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (statusFilter && !normalize(ticket.status).includes(normalize(statusFilter))) {
        return false;
      }
      if (priorityFilter && !normalize(ticket.priority).includes(normalize(priorityFilter))) {
        return false;
      }
      if (categoryFilter && !normalize(ticket.category).includes(normalize(categoryFilter))) {
        return false;
      }
      if (!normalizedSearch) return true;
      const haystack = [
        ticket.ticketNumber,
        ticket.title,
        ticket.description,
        ticket.status,
        ticket.priority,
        ticket.category,
        ticket.requesterName,
        ticket.assigneeName,
        ticket.requesterEmail,
        ticket.assigneeEmail,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [tickets, statusFilter, priorityFilter, categoryFilter, normalizedSearch]);

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((item) => item !== column)
        : [...prev, column]
    );
  };

  return (
    <TableShell>
      <TableCard>
        <Header>
          <TitleWrap>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
              Visão geral de tickets
            </h2>
            <span style={{ color: "var(--muted, #64748b)", fontSize: "0.95rem" }}>
              Monitore todos os chamados e acompanhe SLA em tempo real
            </span>
          </TitleWrap>

          <Actions ref={menuRef}>
            <Button
              variant="soft"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              Colunas
            </Button>
            {menuOpen && (
              <ColumnMenu>
                {allColumns.map((column) => (
                  <ColumnToggle key={column}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      onChange={() => toggleColumn(column)}
                    />
                    {column}
                  </ColumnToggle>
                ))}
              </ColumnMenu>
            )}
          </Actions>
        </Header>

        <Filters>
          <FilterInput
            placeholder="Filtrar por status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <FilterInput
            placeholder="Filtrar por prioridade"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
          />
          <FilterInput
            placeholder="Filtrar por categoria"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          />
        </Filters>

        <TableContainer>
          <StyledTable>
            <thead>
              <Tr>
                {visibleColumns.includes("Ticket") && <Th>Ticket</Th>}
                {visibleColumns.includes("Solicitante") && <Th>Solicitante</Th>}
                {visibleColumns.includes("Responsável") && <Th>Responsável</Th>}
                {visibleColumns.includes("Categoria") && <Th>Categoria</Th>}
                {visibleColumns.includes("Prioridade") && <Th>Prioridade</Th>}
                {visibleColumns.includes("Status") && <Th>Status</Th>}
                {visibleColumns.includes("SLA") && <Th>SLA</Th>}
                {visibleColumns.includes("Criado em") && <Th>Criado em</Th>}
                {visibleColumns.includes("Atualizado em") && <Th>Atualizado em</Th>}
                {visibleColumns.includes("Avaliação") && <Th>Avaliação</Th>}
              </Tr>
            </thead>
            <tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={visibleColumns.length}>Carregando tickets...</Td>
                </Tr>
              ) : error ? (
                <Tr>
                  <Td colSpan={visibleColumns.length} style={{ color: "#b91c1c" }}>
                    Não foi possível carregar os tickets: {error}
                  </Td>
                </Tr>
              ) : filteredTickets.length === 0 ? (
                <Tr>
                  <Td colSpan={visibleColumns.length}>
                    <EmptyState>Nenhum ticket corresponde aos filtros informados.</EmptyState>
                  </Td>
                </Tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <Tr key={ticket.id}>
                    {visibleColumns.includes("Ticket") && (
                      <Td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Highlight>#{ticket.ticketNumber}</Highlight>
                            {onViewTicket && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewTicket(ticket.id)}
                              >
                                Ver detalhes
                              </Button>
                            )}
                          </div>
                        </div>
                      </Td>
                    )}
                    {visibleColumns.includes("Solicitante") && (
                      <Td>
                        <AvatarStack title={ticket.requesterEmail}>
                          <AvatarBubble>
                            {initialsFrom(ticket.requesterName, ticket.requesterEmail)}
                          </AvatarBubble>
                          <AvatarInfo>
                            <span style={{ fontWeight: 600 }}>{ticket.requesterName}</span>
                            <Highlight>{ticket.requesterEmail || "—"}</Highlight>
                          </AvatarInfo>
                        </AvatarStack>
                      </Td>
                    )}
                    {visibleColumns.includes("Responsável") && (
                      <Td>
                        <AvatarStack title={ticket.assigneeEmail}>
                          <AvatarBubble style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                            {initialsFrom(ticket.assigneeName, ticket.assigneeEmail)}
                          </AvatarBubble>
                          <AvatarInfo>
                            <span style={{ fontWeight: 600 }}>{ticket.assigneeName}</span>
                            <Highlight>{ticket.assigneeEmail || "—"}</Highlight>
                          </AvatarInfo>
                        </AvatarStack>
                      </Td>
                    )}
                    {visibleColumns.includes("Categoria") && <Td>{ticket.category}</Td>}
                    {visibleColumns.includes("Prioridade") && (
                      <Td>
                        <Badge tone={priorityTone[(ticket.priority || "").toLowerCase()] || "neutral"}>
                          {ticket.priority}
                        </Badge>
                      </Td>
                    )}
                    {visibleColumns.includes("Status") && (
                      <Td>
                        <StatusWrap>
                          <StatusDot tone={statusColor[(ticket.status || "").toLowerCase()] || "#94a3b8"} />
                          <Badge tone={statusTone[(ticket.status || "").toLowerCase()] || "neutral"}>
                            {(ticket.status || "").replace(/_/g, " ") || "—"}
                          </Badge>
                        </StatusWrap>
                      </Td>
                    )}
                    {visibleColumns.includes("SLA") && (
                      <Td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <Highlight>
                            Resposta: {formatSla(ticket.responseDeadline, ticket.slaResponseTime)}
                          </Highlight>
                          <Highlight>
                            Resolução: {formatSla(ticket.resolutionDeadline, ticket.slaResolutionTime)}
                          </Highlight>
                        </div>
                      </Td>
                    )}
                    {visibleColumns.includes("Criado em") && <Td>{formatDate(ticket.createdAt)}</Td>}
                    {visibleColumns.includes("Atualizado em") && <Td>{formatDate(ticket.updatedAt || ticket.closedAt)}</Td>}
                    {visibleColumns.includes("Avaliação") && (
                      <Td>
                        {ticket.resolutionRating ? (
                          <Badge tone="success">
                            {ticket.resolutionRating}/5
                          </Badge>
                        ) : (
                          <Highlight>
                            {ticket.resolutionFeedback ? "Sem nota (feedback registrado)" : "Aguardando avaliação"}
                          </Highlight>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </tbody>
          </StyledTable>
        </TableContainer>
      </TableCard>
    </TableShell>
  );
};

export default AdminTicketsTable;
