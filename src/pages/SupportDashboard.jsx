import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import supabase from "../../supabaseClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import { buildAssetIndicators, normalizeAssetFilter } from "../utils/asset-utils";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS as dndCSS } from "@dnd-kit/utilities";
import ConectaBotChat from "../components/ConectaBotChat";
import TeamChatPanel from "../components/TeamChatPanel";
import ChatDock from "../components/ChatDock";

const priorityVisual = {
  critical: { tone: "danger", dot: "#f87171", label: "Crítica" },
  high: { tone: "warning", dot: "#fbbf24", label: "Alta" },
  medium: { tone: "info", dot: "#60a5fa", label: "Média" },
  low: { tone: "success", dot: "#4ade80", label: "Baixa" },
};

const SLA_RULES = {
  critical: { response: 30, resolution: 480 },
  high: { response: 60, resolution: 1440 },
  medium: { response: 240, resolution: 4320 },
  low: { response: 1440, resolution: 7200 },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting", label: "Aguardando" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const ASSET_STATUS_META = {
  "em uso": { tone: "success", label: "Em uso" },
  "em manutenção": { tone: "warning", label: "Em manutenção" },
  planejado: { tone: "info", label: "Planejado" },
  obsoleto: { tone: "danger", label: "Obsoleto" },
};

const ASSET_LIFECYCLE_LABELS = {
  acquisition: "Aquisição",
  deployment: "Implantação",
  use: "Uso",
  maintenance: "Manutenção",
  disposal: "Descarte",
};

const ASSET_CATEGORY_LABELS = {
  hardware: "Hardware",
  software: "Software",
  network: "Rede",
  peripherals: "Periféricos",
  licenses: "Licenças",
  mobile: "Dispositivos móveis",
};

const Tile = styled(Card)`
  width: 100%;
  border-radius: 32px;
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
`;
const PriorityDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ color }) => color};
  display: inline-block;
`;
const DragHandle = styled.span`
  cursor: grab;
  padding: 6px 10px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 1.2rem;
  line-height: 1;
  &:active {
    cursor: grabbing;
  }
`;
const ChatPanel = styled.div`
  position: fixed;
  bottom: 120px;
  right: 32px;
  width: min(360px, 90vw);
  max-height: 60vh;
  padding: var(--space-4);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  transform: ${({ $open }) => ($open ? "translateY(0)" : "translateY(12px)")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 29;
`;
const ChatList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
`;
const ChatRow = styled.li`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 12px;
  border-radius: 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: background 0.15s ease, transform 0.15s ease;
  &:hover {
    background: #e8ecf7;
    transform: translateY(-1px);
  }
`;
const ChatDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ color }) => color};
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
`;
const ChatBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const ChatTitle = styled.span`
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
  whitespace: nowrap;
  overflow: hidden;
  textoverflow: ellipsis;
`;
const ChatMeta = styled.span`
  font-size: 0.8rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 12px;
`;
const ChatStatus = styled(Badge)`
  font-size: 0.72rem;
  padding: 2px 8px;
`;
const ViewModeToggle = styled.div`
  display: inline-flex;
  gap: var(--space-2);
`;
const ViewToggleButton = styled.button`
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: ${({ $active }) =>
    $active ? "var(--primary)" : "var(--surface-2)"};
  color: ${({ $active }) => ($active ? "#fff" : "var(--muted)")};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  &:hover {
    border-color: var(--primary);
  }
`;
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  th,
  td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  th {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--muted);
    background: var(--surface-1);
  }
  tbody tr:hover {
    background: rgba(15, 23, 42, 0.04);
  }
`;

const AssetMetricsGrid = styled.div`
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
`;

const AssetMetric = styled.div`
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-1, #f8fafc);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const AssetMetricLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
`;

const AssetMetricValue = styled.span`
  font-size: 1.7rem;
  font-weight: 700;
  color: ${({ $alert }) => ($alert ? "#dc2626" : "var(--text)")};
`;

const AssetFiltersRow = styled.div`
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const AssetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
`;

const AssetCardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
`;

const AssetInfoBlock = styled.div`
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
`;

const AssetBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const AssetFlagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
`;

const AssetMetaText = styled.span`
  font-size: 0.82rem;
  color: var(--muted);
`;

const AssetActionBlock = styled.div`
  flex: 1 1 200px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  color: var(--muted);
`;

const AssetError = styled.p`
  margin-top: var(--space-3);
  color: #b91c1c;
  font-size: 0.85rem;
`;

const AssetEmpty = styled.p`
  margin-top: var(--space-3);
  color: var(--muted);
  font-size: 0.9rem;
`;

function SortableTicket({
  ticket,
  usersMap,
  visual,
  onUpdateStatus,
  now,
  formatDuration,
  currentUserId,
  supportUsers,
  onAssignSelf,
  onTransfer,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: dndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : 1,
  };

  const createdAtMs = new Date(ticket.created_at).getTime();
  const responseMinutes =
    SLA_RULES[ticket.priority]?.response ?? ticket.sla_response_time ?? 0;
  const resolutionMinutes =
    SLA_RULES[ticket.priority]?.resolution ?? ticket.sla_resolution_time ?? 0;
  const responseDeadline = createdAtMs + responseMinutes * 60000;
  const resolutionDeadline = createdAtMs + resolutionMinutes * 60000;
  const remainingResponse = responseMinutes ? responseDeadline - now : null;
  const remainingResolution = resolutionMinutes
    ? resolutionDeadline - now
    : null;
  const isOverdue = remainingResponse !== null && remainingResponse <= 0;
  const isWarning =
    remainingResponse !== null &&
    remainingResponse > 0 &&
    remainingResponse <= 5 * 60 * 1000;

  const hasResponse = Boolean(ticket.first_response_at);
  const hasResolution = Boolean(ticket.resolved_at);
  const isClosed = ticket.status === "closed";

  const [showTransfer, setShowTransfer] = useState(false);

  return (
    <div ref={setNodeRef} style={style}>
      <Tile
        className={isOver ? "drop-target" : ""}
        style={{
          borderColor: isClosed
            ? "#22c55e"
            : isOverdue
            ? "#ef4444"
            : isWarning
            ? "#f97316"
            : undefined,
          boxShadow: isClosed
            ? "0 0 0 4px rgba(34,197,94,0.25)"
            : isOverdue
            ? "0 0 0 4px rgba(239,68,68,0.25)"
            : isWarning
            ? "0 0 0 4px rgba(249,115,22,0.2)"
            : undefined,
        }}
      >
        <div className="stack-between">
          <Link
            to={`/ticket/${ticket.id}`}
            style={{
              fontWeight: 700,
              fontSize: "1.15rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "75%",
            }}
            title={ticket.title}
          >
            {ticket.title}
          </Link>
          <DragHandle
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            title="Arraste para reordenar"
          >
            ⋮⋮
          </DragHandle>
        </div>

        <p>
          <strong>Solicitante:</strong>{" "}
          {usersMap?.[ticket.created_by]?.full_name ||
            usersMap?.[ticket.created_by]?.email ||
            "—"}
        </p>
        <p>
          <strong>Suporte responsável:</strong>{" "}
          {usersMap?.[ticket.assigned_to]?.full_name ||
            usersMap?.[ticket.assigned_to]?.email ||
            "—"}
        </p>
        <p>
          <strong>Categoria:</strong> {ticket.category || "—"}
        </p>

        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <PriorityDot color={visual.dot} />
          <span>{visual.label}</span>
        </div>

        <small style={{ color: "var(--muted)" }}>
          {new Date(ticket.created_at).toLocaleString()}
        </small>

        <div style={{ display: "grid", gap: "var(--space-2)" }}>
          <label style={{ fontSize: ".85rem", color: "var(--muted)" }}>
            SLA resposta
            <div
              style={{
                marginTop: "4px",
                padding: "10px 12px",
                borderRadius: "16px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              {hasResponse ? "✅ " : ""}
              {remainingResponse !== null
                ? formatDuration(remainingResponse)
                : "—"}
            </div>
          </label>
          <label style={{ fontSize: ".85rem", color: "var(--muted)" }}>
            SLA resolução
            <div
              style={{
                marginTop: "4px",
                padding: "10px 12px",
                borderRadius: "16px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              {hasResolution ? "✅ " : ""}
              {remainingResolution !== null
                ? formatDuration(remainingResolution)
                : "—"}
            </div>
          </label>
        </div>

        <div className="center-stack" style={{ width: "100%" }}>
          <Select
            aria-label="Alterar status"
            value={ticket.status}
            onChange={(e) => onUpdateStatus(ticket.id, e.target.value)}
            style={{ flex: 1 }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button as={Link} to={`/ticket/${ticket.id}`} variant="primary">
            Detalhes
          </Button>
        </div>
        {/* Ações de responsabilidade */}
        {!ticket.assigned_to && (
          <Button
            variant="secondary"
            onClick={() => onAssignSelf(ticket.id)}
            style={{ marginTop: 8 }}
          >
            Assumir
          </Button>
        )}
        {ticket.assigned_to === currentUserId && (
          <div
            style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransfer((v) => !v)}
            >
              {showTransfer ? "Cancelar" : "Transferir"}
            </Button>
            {showTransfer && (
              <select
                onChange={(e) => {
                  onTransfer(ticket.id, e.target.value);
                  setShowTransfer(false);
                }}
                defaultValue=""
              >
                <option value="">Selecionar destino...</option>
                {supportUsers
                  .filter((u) => u.id !== currentUserId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}
      </Tile>
    </div>
  );
}

/**
 * @param {{
 *   user: any,
 *   searchTerm?: string,
 *   extraHeaderActions?: import("react").ReactNode | null
 * }} props
 */
export default function SupportDashboard({
  user,
  searchTerm = "",
  extraHeaderActions = null
}) {
  const [tickets, setTickets] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", priority: "" });
  const [now, setNow] = useState(Date.now());
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [myChatTickets, setMyChatTickets] = useState([]);
  const [viewMode, setViewMode] = useState("card");
  const [supportUsers, setSupportUsers] = useState([]);
  const [showAIChat, setShowAIChat] = useState(false); // + estado chat IA
  const [showTeamChat, setShowTeamChat] = useState(false);
  const [assignedAssets, setAssignedAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState("all");
  const assetsMountedRef = useRef(true);

  const chatButtons = [
    {
      key: "attended",
      label: "Conversas",
      icon: "💬",
      active: showChatPanel,
      onClick: () => {
        setShowAIChat(false);
        setShowTeamChat(false);
        setShowChatPanel((open) => !open);
      },
    },
    {
      key: "team",
      label: "Equipe",
      icon: "🗨️",
      active: showTeamChat,
      bg: "linear-gradient(135deg,#0ea5e9,#0284c7)",
      onClick: () => {
        setShowAIChat(false);
        setShowChatPanel(false);
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
        setShowChatPanel(false);
        setShowAIChat((o) => !o);
      },
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    assetsMountedRef.current = true;
    return () => {
      assetsMountedRef.current = false;
    };
  }, []);

  const fetchAssignedAssets = useCallback(async () => {
    if (!assetsMountedRef.current) {
      return;
    }

    if (!user?.id) {
      setAssignedAssets([]);
      setAssetsError("");
      setAssetsLoading(false);
      return;
    }

    setAssetsLoading(true);
    setAssetsError("");
    try {
      const { data, error } = await supabase
        .from("assets")
        .select(
          [
            "id",
            "asset_code",
            "name",
            "category",
            "status",
            "lifecycle_stage",
            "last_maintenance_date",
            "next_maintenance_date",
            "license_expiry",
            "inventoried",
            "location",
            "acquisition_date",
          ].join(",")
        )
        .eq("support_owner", user.id)
        .order("name", { ascending: true });

      if (!assetsMountedRef.current) return;

      if (error) {
        console.error("Erro ao carregar ativos do suporte:", error);
        setAssetsError("Não foi possível carregar os ativos: " + error.message);
        setAssignedAssets([]);
      } else {
        setAssignedAssets(data || []);
      }
    } catch (cause) {
      console.error("Erro inesperado ao buscar ativos:", cause);
      if (assetsMountedRef.current) {
        setAssetsError("Erro inesperado ao buscar os ativos atribuídos.");
        setAssignedAssets([]);
      }
    } finally {
      if (assetsMountedRef.current) {
        setAssetsLoading(false);
      }
    }
  }, [user?.id]);

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

  const formatAssetDate = useCallback((value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("pt-BR");
  }, []);

  const computeAssetFlags = useCallback(
    (asset) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);

      const flags = [];
      if (!asset.inventoried) {
        flags.push("Inventário pendente");
      }

      if (asset.status === "obsoleto") {
        flags.push("Ativo obsoleto");
      }

      if (asset.next_maintenance_date) {
        const next = new Date(asset.next_maintenance_date);
        if (!Number.isNaN(next.getTime()) && next <= today) {
          flags.push("Manutenção em atraso");
        }
      }

      if (asset.license_expiry) {
        const expiry = new Date(asset.license_expiry);
        if (!Number.isNaN(expiry.getTime())) {
          if (expiry < today) {
            flags.push(`Licença vencida em ${formatAssetDate(asset.license_expiry)}`);
          } else if (expiry <= in30Days) {
            flags.push(`Licença vence em ${formatAssetDate(asset.license_expiry)}`);
          }
        }
      }

      return flags;
    },
    [formatAssetDate]
  );

  const nextAssetAction = useCallback(
    (asset) => {
      if (asset.license_expiry) {
        return `Renovar licença até ${formatAssetDate(asset.license_expiry)}`;
      }
      if (asset.next_maintenance_date) {
        return `Planejar manutenção em ${formatAssetDate(asset.next_maintenance_date)}`;
      }
      if (asset.last_maintenance_date) {
        return `Última manutenção em ${formatAssetDate(asset.last_maintenance_date)}`;
      }
      return "Nenhuma ação futura registrada";
    },
    [formatAssetDate]
  );

  const processedAssets = useMemo(() => {
    if (!assignedAssets?.length) {
      return [];
    }

    const normalized = normalizeAssetFilter(assignedAssets, {
      term: assetSearch,
      category: assetCategoryFilter,
      status: assetStatusFilter,
    });

    return normalized
      .map((asset) => {
        const flags = computeAssetFlags(asset);
        const priority = flags.reduce((score, flag) => {
          if (flag.includes("atraso")) return score + 4;
          if (flag.includes("vence")) return score + 3;
          if (flag.includes("Inventário")) return score + 2;
          if (flag.includes("obsoleto")) return score + 3;
          return score + 1;
        }, 0);
        return { asset, flags, priority };
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        const aCategory = ASSET_CATEGORY_LABELS[a.asset.category] || a.asset.category;
        const bCategory = ASSET_CATEGORY_LABELS[b.asset.category] || b.asset.category;
        const categoryCompare = aCategory.localeCompare(bCategory);
        if (categoryCompare !== 0) {
          return categoryCompare;
        }
        return a.asset.name.localeCompare(b.asset.name);
      });
  }, [assignedAssets, assetSearch, assetCategoryFilter, assetStatusFilter, computeAssetFlags]);

  const filteredAssets = useMemo(
    () => processedAssets.map((entry) => entry.asset),
    [processedAssets]
  );

  const assetIndicators = useMemo(
    () => buildAssetIndicators(filteredAssets),
    [filteredAssets]
  );

  const assetsNeedingCare = useMemo(
    () => processedAssets.filter((entry) => entry.flags.length > 0),
    [processedAssets]
  );

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
    fetchAssignedAssets();
  }, [fetchAssignedAssets]);

  useEffect(() => {
    if (!user?.id) return;
    async function fetchTicketsAndUsers() {
      setLoading(true);
      let query = supabase.from("tickets").select("*");
      if (filter.status) query = query.eq("status", filter.status);
      if (filter.priority) query = query.eq("priority", filter.priority);
      // Filtrar no backend: só tickets sem responsável ou atribuídos ao usuário
      if (user?.id) {
        query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
      }
      const { data: ticketsData } = await query.order("created_at", {
        ascending: false,
      });

      const userIds = [
        ...new Set(
          (ticketsData || [])
            .flatMap((t) => [t.created_by, t.assigned_to])
            .filter(Boolean)
        ),
      ];
      let usersData = [];
      if (userIds.length) {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", userIds);
        usersData = data || [];
      }
      const map = {};
      usersData.forEach((u) => (map[u.id] = u));

      const updates = {};
      const normalized = (ticketsData || []).map((t) => {
        const rule = SLA_RULES[t.priority];
        if (!rule) return t;
        const next = { ...t };
        if (rule.response != null && t.sla_response_time !== rule.response) {
          next.sla_response_time = rule.response;
          updates[t.id] = {
            ...(updates[t.id] || {}),
            sla_response_time: rule.response,
          };
        }
        if (
          rule.resolution != null &&
          t.sla_resolution_time !== rule.resolution
        ) {
          next.sla_resolution_time = rule.resolution;
          updates[t.id] = {
            ...(updates[t.id] || {}),
            sla_resolution_time: rule.resolution,
          };
        }
        return next;
      });

      if (Object.keys(updates).length) {
        await Promise.all(
          Object.entries(updates).map(([id, payload]) =>
            supabase.from("tickets").update(payload).eq("id", id)
          )
        );
      }

      setUsersMap(map);
      setTickets(normalized);
      setLoading(false);
    }
    fetchTicketsAndUsers();
  }, [filter, user?.id]);

  useEffect(() => {
    if (!user?.id || tickets.length === 0) {
      setMyChatTickets([]);
      return;
    }
    async function fetchMyChats() {
      const { data, error } = await supabase
        .from("messages")
        .select("ticket_id")
        .eq("user_id", user.id);
      if (error) {
        console.error("Erro ao buscar mensagens do suporte:", error);
        setMyChatTickets([]);
        return;
      }
      const ticketIds = [...new Set((data || []).map((msg) => msg.ticket_id))];
      setMyChatTickets(
        tickets
          .filter((t) => ticketIds.includes(t.id))
          .sort((a, b) => {
            const da = new Date(a.updated_at || a.created_at).getTime();
            const db = new Date(b.updated_at || b.created_at).getTime();
            return db - da;
          })
      );
    }
    fetchMyChats();
  }, [user?.id, tickets]);

  async function updateStatus(id, newStatus) {
    await supabase.from("tickets").update({ status: newStatus }).eq("id", id);
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  }

  const upsertUserInfo = useCallback(
    (info) => {
      if (!info?.id) return;
      setUsersMap((prev) => {
        const next = { ...(prev || {}) };
        next[info.id] = { ...(prev?.[info.id] || {}), ...info };
        return next;
      });
    },
    [setUsersMap]
  );
  const currentSupportInfo = useMemo(
    () => ({
      id: user?.id,
      full_name:
        user?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Suporte",
      email: user?.email || user?.user_metadata?.email || null,
    }),
    [user]
  );

  async function assignToSelf(id) {
    if (!user?.id) return;
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_to: user.id })
      .eq("id", id);
    if (error) {
      console.error("Erro ao assumir chamado:", error);
      return;
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, assigned_to: user.id } : t))
    );
    upsertUserInfo(currentSupportInfo);
  }

  async function transferTicket(id, newUserId) {
    if (!newUserId) return;
    const { error } = await supabase
      .from("tickets")
      .update({ assigned_to: newUserId })
      .eq("id", id);
    if (error) {
      console.error("Erro ao transferir chamado:", error);
      return;
    }
    const destino = supportUsers.find((u) => u.id === newUserId) || null;
    if (destino) {
      upsertUserInfo(destino);
    } else {
      try {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("id", newUserId)
          .single();
        if (data) upsertUserInfo(data);
      } catch (fetchErr) {
        console.warn(
          "Não foi possível obter dados do novo responsável:",
          fetchErr
        );
      }
    }
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  const normalizedSearch = (searchTerm || "").trim().toLowerCase();
  const { activeTickets, closedTickets } = useMemo(() => {
    const base =
      tickets.filter((t) => !t.assigned_to || t.assigned_to === user?.id) || [];
    const filtered = normalizedSearch
      ? base.filter((t) => {
          const requester = usersMap?.[t.created_by];
          const statusLabel = priorityVisual[t.priority]?.label || "";
          return [
            t.title,
            t.category,
            t.priority,
            statusLabel,
            requester?.full_name,
            requester?.email,
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(normalizedSearch));
        })
      : base;
    return {
      activeTickets: filtered.filter((t) => t.status !== "closed"),
      closedTickets: filtered.filter((t) => t.status === "closed"),
    };
  }, [tickets, usersMap, normalizedSearch, user?.id]);
  const hasActive = activeTickets.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTickets((prev) => {
      const next = [...prev];
      const oldIndex = next.findIndex((t) => t.id === active.id);
      const newIndex = next.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(next, oldIndex, newIndex);
    });
  }

  return (
    <div className="page-shell">
      <div
        className="stack-between section"
        style={{ alignItems: "flex-start" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1>Chamados (Suporte/Admin)</h1>
          {extraHeaderActions && (
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center"
              }}
            >
              {extraHeaderActions}
            </div>
          )}
        </div>
        <div className="stack">
          <ViewModeToggle>
            <ViewToggleButton
              type="button"
              $active={viewMode === "card"}
              onClick={() => setViewMode("card")}
              aria-label="Modo cards"
              title="Modo cards"
            >
              📇
            </ViewToggleButton>
            <ViewToggleButton
              type="button"
              $active={viewMode === "table"}
              onClick={() => setViewMode("table")}
              aria-label="Modo tabela"
              title="Modo tabela"
            >
              📋
            </ViewToggleButton>
          </ViewModeToggle>
          <Select
            value={filter.status}
            onChange={(e) =>
              setFilter((f) => ({ ...f, status: e.target.value }))
            }
            aria-label="Filtrar status"
            style={{ maxWidth: 220 }}
          >
            <option value="">Todos status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em andamento</option>
            <option value="waiting">Aguardando</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </Select>
          <Select
            value={filter.priority}
            onChange={(e) =>
              setFilter((f) => ({ ...f, priority: e.target.value }))
            }
            aria-label="Filtrar prioridade"
            style={{ maxWidth: 220 }}
          >
            <option value="">Todas prioridades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </Select>
        </div>
      </div>

      <Card style={{ marginTop: "var(--space-5)" }}>
        <div
          className="stack-between"
          style={{ alignItems: "flex-start", gap: "var(--space-3)" }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Ativos de TI sob sua responsabilidade</h2>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              Visualize manutenções, licenças e pendências de inventário dos ativos atribuídos.
            </p>
          </div>
        </div>

        {assetsError && <AssetError>{assetsError}</AssetError>}

        {assetsLoading ? (
          <AssetEmpty>Carregando ativos atribuídos...</AssetEmpty>
        ) : !assignedAssets.length ? (
          <AssetEmpty>Você ainda não possui ativos atribuídos.</AssetEmpty>
        ) : (
          <>
            <AssetMetricsGrid>
              <AssetMetric>
                <AssetMetricLabel>Total atribuídos</AssetMetricLabel>
                <AssetMetricValue>{assetIndicators.total}</AssetMetricValue>
              </AssetMetric>
              <AssetMetric>
                <AssetMetricLabel>Inventariados</AssetMetricLabel>
                <AssetMetricValue>{assetIndicators.inventoried}</AssetMetricValue>
              </AssetMetric>
              <AssetMetric>
                <AssetMetricLabel>Inventário pendente</AssetMetricLabel>
                <AssetMetricValue $alert={assetIndicators.pendingInventory > 0}>
                  {assetIndicators.pendingInventory}
                </AssetMetricValue>
              </AssetMetric>
              <AssetMetric>
                <AssetMetricLabel>Licenças a vencer (30 dias)</AssetMetricLabel>
                <AssetMetricValue $alert={assetIndicators.expiringLicense > 0}>
                  {assetIndicators.expiringLicense}
                </AssetMetricValue>
              </AssetMetric>
              <AssetMetric>
                <AssetMetricLabel>Manutenções em atraso</AssetMetricLabel>
                <AssetMetricValue $alert={assetIndicators.maintenanceDue > 0}>
                  {assetIndicators.maintenanceDue}
                </AssetMetricValue>
              </AssetMetric>
              <AssetMetric>
                <AssetMetricLabel>Obsoletos</AssetMetricLabel>
                <AssetMetricValue $alert={assetIndicators.obsolete > 0}>
                  {assetIndicators.obsolete}
                </AssetMetricValue>
              </AssetMetric>
            </AssetMetricsGrid>

            <AssetFiltersRow>
              <div>
                <label
                  htmlFor="support-asset-search"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Buscar
                </label>
                <Input
                  id="support-asset-search"
                  placeholder="Código, ativo ou palavra-chave"
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="support-asset-category"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Categoria
                </label>
                <Select
                  id="support-asset-category"
                  value={assetCategoryFilter}
                  onChange={(event) => setAssetCategoryFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label
                  htmlFor="support-asset-status"
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Status
                </label>
                <Select
                  id="support-asset-status"
                  value={assetStatusFilter}
                  onChange={(event) => setAssetStatusFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  {Object.entries(ASSET_STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </div>
            </AssetFiltersRow>

            {processedAssets.length > 0 && (
              <div style={{ marginTop: "var(--space-3)" }}>
                {assetsNeedingCare.length > 0 ? (
                  <Badge tone="warning">
                    {assetsNeedingCare.length === 1
                      ? "1 ativo precisa da sua atenção"
                      : `${assetsNeedingCare.length} ativos precisam da sua atenção`}
                  </Badge>
                ) : (
                  <Badge tone="success">Nenhum alerta crítico entre os filtros atuais</Badge>
                )}
              </div>
            )}

            {processedAssets.length === 0 ? (
              <AssetEmpty>
                Nenhum ativo corresponde aos filtros selecionados.
              </AssetEmpty>
            ) : (
              <AssetList>
                {processedAssets.map(({ asset, flags }) => {
                  const statusMeta =
                    ASSET_STATUS_META[asset.status] || {
                      tone: "neutral",
                      label: asset.status,
                    };
                  const flagged = flags.length > 0;
                  return (
                    <AssetCardRow
                      key={asset.id}
                      style={
                        flagged
                          ? {
                              borderColor: "#f97316",
                              boxShadow: "0 0 0 3px rgba(248, 113, 113, 0.12)",
                            }
                          : undefined
                      }
                    >
                      <AssetInfoBlock>
                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                          {asset.asset_code} • {asset.name}
                        </span>
                        <AssetMetaText>
                          {(ASSET_CATEGORY_LABELS[asset.category] || asset.category) +
                            (asset.location ? ` • ${asset.location}` : "")}
                        </AssetMetaText>
                        <AssetMetaText>
                          Ciclo de vida: {ASSET_LIFECYCLE_LABELS[asset.lifecycle_stage] || asset.lifecycle_stage}
                        </AssetMetaText>
                      </AssetInfoBlock>

                      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
                        <AssetBadgeRow>
                          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          <Badge tone={asset.inventoried ? "success" : "warning"}>
                            {asset.inventoried ? "Inventariado" : "Inventário pendente"}
                          </Badge>
                        </AssetBadgeRow>
                        {flags.length > 0 && (
                          <AssetFlagsRow>
                            {flags.map((flag, index) => (
                              <Badge
                                key={`${asset.id}-${index}`}
                                tone={
                                  flag.includes("atraso") || flag.includes("vencid")
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {flag}
                              </Badge>
                            ))}
                          </AssetFlagsRow>
                        )}
                      </div>

                      <AssetActionBlock>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                          Próxima ação
                        </span>
                        <span>{nextAssetAction(asset)}</span>
                        <AssetMetaText>
                          Última manutenção: {formatAssetDate(asset.last_maintenance_date)}
                        </AssetMetaText>
                        <AssetMetaText>
                          Próxima manutenção: {formatAssetDate(asset.next_maintenance_date)}
                        </AssetMetaText>
                        {asset.warranty_expires_at && (
                          <AssetMetaText>
                            Garantia: {formatAssetDate(asset.warranty_expires_at)}
                          </AssetMetaText>
                        )}
                      </AssetActionBlock>
                    </AssetCardRow>
                  );
                })}
              </AssetList>
            )}
          </>
        )}
      </Card>

      {loading ? (
        <p>Carregando...</p>
      ) : !hasActive ? (
        <Card>
          <p>
            {normalizedSearch
              ? "Nenhum chamado encontrado para a busca."
              : "Nenhum chamado em andamento."}
          </p>
        </Card>
      ) : viewMode === "card" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeTickets.map((t) => t.id)}
            strategy={rectSortingStrategy}
          >
            <div className="cards-grid">
              {activeTickets.map((t) => (
                <SortableTicket
                  key={t.id}
                  ticket={t}
                  usersMap={usersMap}
                  visual={
                    priorityVisual[t.priority] || { dot: "#e5e7eb", label: "—" }
                  }
                  onUpdateStatus={updateStatus}
                  now={now}
                  formatDuration={formatDuration}
                  currentUserId={user?.id}
                  supportUsers={supportUsers}
                  onAssignSelf={assignToSelf}
                  onTransfer={transferTicket}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card>
          <StyledTable>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Responsável</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {activeTickets.map((ticket) => {
                const requester =
                  usersMap?.[ticket.created_by]?.full_name ||
                  usersMap?.[ticket.created_by]?.email ||
                  "—";
                const assignee =
                  usersMap?.[ticket.assigned_to]?.full_name ||
                  usersMap?.[ticket.assigned_to]?.email ||
                  "—";
                const visual = priorityVisual[ticket.priority] || {
                  dot: "#e5e7eb",
                  label: "—",
                };
                const lastUpdate = new Date(
                  ticket.updated_at || ticket.created_at
                ).toLocaleString();
                return (
                  <tr key={ticket.id}>
                    <td>
                      <Link to={`/ticket/${ticket.id}`} title={ticket.title}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td>{requester}</td>
                    <td>{assignee}</td>
                    <td>{ticket.category || "—"}</td>
                    <td>
                      <span>
                        <PriorityDot color={visual.dot} /> {visual.label}
                      </span>
                    </td>
                    <td>
                      <Select
                        aria-label={`Alterar status do chamado ${ticket.title}`}
                        value={ticket.status}
                        onChange={(e) =>
                          updateStatus(ticket.id, e.target.value)
                        }
                        style={{ minWidth: 150 }}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>{lastUpdate}</td>
                    <td>
                      <Button
                        as={Link}
                        to={`/ticket/${ticket.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        Abrir
                      </Button>
                      {!ticket.assigned_to && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => assignToSelf(ticket.id)}
                          style={{ marginLeft: 8 }}
                        >
                          Assumir
                        </Button>
                      )}
                      {ticket.assigned_to === user?.id && (
                        <TransferInline
                          ticketId={ticket.id}
                          supportUsers={supportUsers}
                          onTransfer={transferTicket}
                          currentUserId={user?.id}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
        </Card>
      )}
      {closedTickets.length > 0 && (
        <Card style={{ marginTop: "var(--space-5)" }}>
          <h2 style={{ marginTop: 0 }}>Concluídos</h2>
          <StyledTable>
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Solicitante</th>
                <th>Responsável</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Atualizado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {closedTickets.map((ticket) => {
                const requester =
                  usersMap?.[ticket.created_by]?.full_name ||
                  usersMap?.[ticket.created_by]?.email ||
                  "—";
                const assignee =
                  usersMap?.[ticket.assigned_to]?.full_name ||
                  usersMap?.[ticket.assigned_to]?.email ||
                  "—";
                const visual = priorityVisual[ticket.priority] || {
                  dot: "#e5e7eb",
                  label: "—",
                };
                const lastUpdate = new Date(
                  ticket.updated_at || ticket.created_at
                ).toLocaleString();
                return (
                  <tr key={ticket.id} style={{ background: "#f3f4f6" }}>
                    <td>
                      <Link to={`/ticket/${ticket.id}`} title={ticket.title}>
                        {ticket.title}
                      </Link>
                    </td>
                    <td>{requester}</td>
                    <td>{assignee}</td>
                    <td>{ticket.category || "—"}</td>
                    <td>
                      <span>
                        <PriorityDot color={visual.dot} /> {visual.label}
                      </span>
                    </td>
                    <td>
                      {STATUS_OPTIONS.find(
                        (o) => o.value === ticket.status
                      )?.label || ticket.status}
                    </td>
                    <td>{lastUpdate}</td>
                    <td>
                      <Button
                        as={Link}
                        to={`/ticket/${ticket.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        Visualizar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </StyledTable>
        </Card>
      )}
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
          <div
            style={{
              fontSize: 12,
              color: "#556",
              textAlign: "right",
              marginBottom: 6,
            }}
          >
            Assistente IA para suporte (não cria chamados)
          </div>
          <ConectaBotChat
            user={user}
            allowTicketCreation={false}
            onTicketCreated={() => {
              setShowAIChat(false);
              setFilter((f) => ({ ...f }));
            }}
            onClose={() => setShowAIChat(false)}
          />
        </div>
      )}
      <ChatPanel $open={showChatPanel}>
        <div className="stack-between">
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
            Conversas atendidas
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChatPanel(false)}
          >
            Fechar
          </Button>
        </div>

        {myChatTickets.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Você ainda não respondeu nenhum chamado.
          </p>
        ) : (
          <ChatList>
            {myChatTickets.map((ticket) => {
              const visual = priorityVisual[ticket.priority] || {
                dot: "#e5e7eb",
                label: "—",
              };
              const lastUpdate = new Date(
                ticket.updated_at || ticket.created_at
              ).toLocaleString();
              return (
                <ChatRow key={ticket.id}>
                  <ChatDot color={visual.dot} />
                  <ChatBody>
                    <ChatTitle title={ticket.title}>{ticket.title}</ChatTitle>
                    <ChatMeta>
                      {visual.label}
                      <span>{lastUpdate}</span>
                    </ChatMeta>
                  </ChatBody>
                  <ChatStatus tone="neutral">{ticket.status}</ChatStatus>
                  <Button
                    as={Link}
                    to={`/ticket/${ticket.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChatPanel(false)}
                    style={{ padding: "6px 10px" }}
                  >
                    Abrir
                  </Button>
                </ChatRow>
              );
            })}
          </ChatList>
        )}
      </ChatPanel>
      <ChatDock buttons={chatButtons} />
    </div>
  );
}

// Componente inline para tabela
function TransferInline({ ticketId, supportUsers, onTransfer, currentUserId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        style={{ marginLeft: 8 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Cancelar" : "Transferir"}
      </Button>
      {open && (
        <select
          style={{ marginLeft: 8 }}
          defaultValue=""
          onChange={(e) => {
            onTransfer(ticketId, e.target.value);
            setOpen(false);
          }}
        >
          <option value="">Selecionar destino...</option>
          {supportUsers
            .filter((u) => u.id !== currentUserId)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
        </select>
      )}
    </>
  );
}
