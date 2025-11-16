import React, {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components";
import { supabase } from "../../services/supabaseClient";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { Input, TextArea } from "../ui/Input";
import { buildAssetIndicators } from "../../utils/asset-utils";

const RAW_API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").trim();
const API_BASE_URL = RAW_API_BASE.endsWith("/")
  ? RAW_API_BASE.slice(0, -1)
  : RAW_API_BASE;
const apiUrl = (path: string) =>
  API_BASE_URL ? `${API_BASE_URL}${path}` : path;

type AssetCategory =
  | "hardware"
  | "software"
  | "network"
  | "peripherals"
  | "licenses"
  | "mobile";

const CATEGORY_ORDER: AssetCategory[] = [
  "hardware",
  "software",
  "network",
  "peripherals",
  "licenses",
  "mobile",
];

type LifecycleStage =
  | "acquisition"
  | "deployment"
  | "use"
  | "maintenance"
  | "disposal";
type AssetStatus = "em uso" | "em manutenção" | "planejado" | "obsoleto";
const STATUS_OPTIONS: AssetStatus[] = [
  "em uso",
  "em manutenção",
  "planejado",
  "obsoleto",
];

const ADMIN_SECTION_OPTIONS = [
  { id: "overview", label: "Visão geral" },
  { id: "critical", label: "Ativos críticos" },
  { id: "inventory", label: "Inventário" },
  { id: "create", label: "Cadastro rápido" },
];
const LIFECYCLE_LABEL: Record<LifecycleStage, string> = {
  acquisition: "Aquisição",
  deployment: "Implantação",
  use: "Uso",
  maintenance: "Manutenção",
  disposal: "Descarte",
};
type SupportUser = {
  id: string;
  full_name: string;
  email: string;
};
type OwnerInfo = {
  full_name: string | null;
  email: string | null;
  role?: string | null;
};
type CurrentUser = {
  id: string;
  role?: string | null;
  full_name?: string | null;
  email?: string | null;
};
type AssetRecord = {
  id: string;
  asset_code: string;
  name: string;
  category: AssetCategory;
  subcategory?: string | null;
  description?: string | null;
  quantity: number;
  status: AssetStatus;
  lifecycle_stage: LifecycleStage;
  acquisition_date: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  warranty_expires_at: string | null;
  license_expiry: string | null;
  location?: string | null;
  inventoried: boolean;
  support_owner: string | null;
  support_owner_profile?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};
type FiltersState = {
  search: string;
  category: "all" | AssetCategory;
  owner: "all" | "__none" | string;
  status: "all" | AssetStatus;
};
const normalizeAsset = (item: any): AssetRecord => {
  const quantity =
    typeof item?.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
  const ownerProfile = item?.support_owner_profile || null;
  return {
    ...item,
    quantity,
    inventoried: Boolean(item?.inventoried),
    support_owner_profile: ownerProfile,
  } as AssetRecord;
};
type AssetFormState = {
  asset_code: string;
  name: string;
  category: AssetCategory;
  subcategory: string;
  status: AssetStatus;
  lifecycle_stage: LifecycleStage;
  quantity: number;
  acquisition_date: string;
  last_maintenance_date: string;
  next_maintenance_date: string;
  warranty_expires_at: string;
  license_expiry: string;
  location: string;
  description: string;
  support_owner: string;
  inventoried: boolean;
};
type InlineDraftState = {
  status: AssetStatus;
  lifecycle_stage: LifecycleStage;
  last_maintenance_date: string;
  next_maintenance_date: string;
  warranty_expires_at: string;
  license_expiry: string;
  location: string;
  description: string;
  inventoried: boolean;
};
const DEFAULT_FORM_STATE: AssetFormState = {
  asset_code: "",
  name: "",
  category: "hardware",
  subcategory: "",
  status: "em uso",
  lifecycle_stage: "use",
  quantity: 1,
  acquisition_date: "",
  last_maintenance_date: "",
  next_maintenance_date: "",
  warranty_expires_at: "",
  license_expiry: "",
  location: "",
  description: "",
  support_owner: "",
  inventoried: true,
};
const CATEGORY_LABEL: Record<AssetCategory, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Rede",
  peripherals: "Periféricos",
  licenses: "Licenças",
  mobile: "Dispositivos móveis",
};

const LIFECYCLE_DESCRIPTION: Record<LifecycleStage, string> = {
  acquisition:
    "Planejamento do orçamento, cotação e registro do ativo no inventário.",
  deployment:
    "Configuração, teste e entrega ao usuário ou ambiente de produção.",
  use: "Fase operacional acompanhando desempenho, compliance e responsável.",
  maintenance:
    "Atualizações, substituição de peças, renovações de licenças e auditorias.",
  disposal: "Desmobilização segura, descarte sustentável ou revenda autorizada.",
};

const STATUS_BADGE: Record<
  AssetStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "danger" | "success" }
> = {
  "em uso": { label: "Em uso", tone: "success" },
  "em manutenção": { label: "Em manutenção", tone: "warning" },
  planejado: { label: "Planejado", tone: "info" },
  obsoleto: { label: "Obsoleto", tone: "danger" },
};

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 32px;
  margin-top: 40px;
`;

const SectionHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 920px;
`;

const SectionTitle = styled.h2`
  font-size: 1.9rem;
  font-weight: 600;
  color: #182230;
`;

const SectionDescription = styled.p`
  color: #4f5b67;
  line-height: 1.5;
`;

const SectionToolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const SectionFeedback = styled.p<{ tone?: "info" | "error" }>`
  font-size: 0.85rem;
  color: ${({ tone }) => (tone === "error" ? "#dc2626" : "#475569")};
`;

const RefreshCaption = styled.span`
  font-size: 0.8rem;
  color: #64748b;
`;

const SectionMenu = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 28px 0 8px;
`;

const SectionMenuButton = styled.button<{ $active: boolean }>`
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active ? "#1d4ed8" : "rgba(148, 163, 184, 0.4)")};
  background: ${({ $active }) =>
    $active ? "linear-gradient(135deg, #1d4ed8, #3b82f6)" : "#f8fafc"};
  color: ${({ $active }) => ($active ? "#ffffff" : "#1f2937")};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${({ $active }) =>
    $active ? "0 10px 24px rgba(59, 130, 246, 0.22)" : "none"};

  &:hover {
    border-color: #1d4ed8;
    color: ${({ $active }) => ($active ? "#ffffff" : "#1d4ed8")};
  }
`;

const AnimatedSection = styled.section<{ $visible: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: ${({ $visible }) => ($visible ? "28px" : "0")};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? "0" : "-12px")});
  max-height: ${({ $visible }) => ($visible ? "5000px" : "0px")};
  overflow: hidden;
  transition:
    opacity 0.24s ease,
    transform 0.24s ease,
    max-height 0.32s ease,
    margin-top 0.24s ease;
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
`;
const MetricsGrid = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const CardHeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

const CardTitleLabel = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2933;
`;

const CardSubtitle = styled.p`
  color: #5f6c80;
  font-size: 0.93rem;
`;

const MetricValue = styled.span<{
  tone?: "default" | "accent" | "warning";
}>`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${({ tone }) => {
    if (tone === "accent") return "#3b82f6";
    if (tone === "warning") return "#ef4444";
    return "#1f2933";
  }};
`;

const LifecycleGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const LifecycleTile = styled.div`
  background: #f6f8fb;
  border-radius: 18px;
  padding: 18px;
  border: 1px solid #e0e7f1;
  height: 100%;
`;

const LifecycleTitleText = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #1f2933;
`;

const LifecycleDescriptionText = styled.p`
  margin-top: 8px;
  color: #4f5b67;
  font-size: 0.85rem;
  line-height: 1.45;
`;

const FormLayout = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FilterToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
`;

const FilterField = styled(Field)`
  min-width: 180px;
  flex: 1 1 200px;
`;

const FilterActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const FullWidthField = styled(Field)`
  grid-column: 1 / -1;
`;

const FieldLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2933;
`;

const HelperText = styled.span`
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.4;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const CheckboxRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: #1f2933;
  cursor: pointer;
`;

const CheckboxInput = styled.input`
  width: 18px;
  height: 18px;
`;

const FormFeedback = styled.p<{ tone: "success" | "error" }>`
  font-size: 0.85rem;
  color: ${({ tone }) => (tone === "success" ? "#166534" : "#b91c1c")};
`;

const TableFeedback = styled.p<{ tone: "success" | "error" }>`
  font-size: 0.82rem;
  color: ${({ tone }) => (tone === "success" ? "#166534" : "#b91c1c")};
  margin: 0 0 12px;
`;

const EditingNotice = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  padding: 10px 16px;
  border-radius: 14px;
`;

const EditingLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
`;

const EditingMeta = styled.span`
  font-size: 0.8rem;
  color: #1e3a8a;
`;

const EditingActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CategoryStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
`;

const TableHeadCell = styled.th`
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
  padding: 12px 16px;
  border-bottom: 1px solid #e3e8ef;
  background: #f9fafc;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background: #fafbff;
  }
`;

const TableCell = styled.td`
  padding: 14px 16px;
  font-size: 0.9rem;
  color: #1f2933;
  vertical-align: top;
  border-bottom: 1px solid #edf1f7;
`;

const TableActions = styled.div`
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const OwnerHint = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #64748b;
`;

const AssetName = styled.p`
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 4px;
`;

const AssetMeta = styled.p`
  font-size: 0.78rem;
  color: #5f6c80;
`;

const EmptyState = styled.p`
  margin: 0;
  padding: 8px 0;
  font-size: 0.93rem;
  color: #4f5b67;
`;

const InlineEditor = styled.div`
  margin-top: 16px;
  padding: 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InlineGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const InlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
`;

const InlineError = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: #b91c1c;
`;

const AttentionSummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 4px;
`;

const AttentionSummaryChip = styled.span<{ $alert?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: ${({ $alert }) =>
    $alert ? "rgba(248,113,113,0.16)" : "rgba(37,99,235,0.12)"};
  color: ${({ $alert }) => ($alert ? "#b91c1c" : "#1d4ed8")};
  border: 1px solid
    ${({ $alert }) => ($alert ? "rgba(239,68,68,0.35)" : "rgba(37,99,235,0.25)")};
`;

const AttentionSummaryValue = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
`;

const AttentionFlagGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR");
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

type AssetManagementProps = {
  currentUser?: CurrentUser | null;
};

const AssetManagement: React.FC<AssetManagementProps> = ({ currentUser = null }) => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, OwnerInfo>>({});
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    category: "all",
    owner: "all",
    status: "all",
  });
  const [formState, setFormState] = useState<AssetFormState>({
    ...DEFAULT_FORM_STATE,
  });
  const [saving, setSaving] = useState(false);
  const [formStatus, setFormStatus] =
    useState<"idle" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");
  const [updatingOwners, setUpdatingOwners] = useState<Record<string, boolean>>({});
  const [tableMessage, setTableMessage] = useState<
    { tone: "success" | "error"; text: string } | null
  >(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<InlineDraftState | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    () => new Set(ADMIN_SECTION_OPTIONS.map((option) => option.id))
  );

  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setVisibleSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        if (next.size === 1) {
          return prev;
        }
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const patchAsset = useCallback(
    async (
      assetId: string,
      payload: Record<string, unknown>
    ): Promise<{ ok: true; asset: AssetRecord } | { ok: false; message: string }> => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn("[AssetManagement] patchAsset getSession:", sessionError.message);
        }

        const token = sessionData?.session?.access_token || null;
        const fallbackUser = currentUser && currentUser.id ? currentUser : null;
        const fallbackRole = fallbackUser?.role
          ? String(fallbackUser.role).toLowerCase()
          : null;

        if (!token && !fallbackUser) {
          return {
            ok: false,
            message: "Sessão expirada. Faça login novamente para atualizar o ativo.",
          };
        }

        if (!token && fallbackRole !== "admin") {
          return {
            ok: false,
            message: "Somente administradores autenticados podem atualizar ativos.",
          };
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (fallbackUser) {
          headers["X-Asset-User-Id"] = fallbackUser.id;
          if (fallbackRole) headers["X-Asset-User-Role"] = fallbackRole;
          if (fallbackUser.email) headers["X-Asset-User-Email"] = fallbackUser.email;
        }

        const response = await fetch(
          apiUrl(`/api/assets?id=${encodeURIComponent(assetId)}`),
          {
            method: "PATCH",
            headers,
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          let detail: any = null;
          try {
            detail = await response.json();
          } catch (_ignore) {
            detail = null;
          }
          const message = detail?.error || `Status ${response.status}`;
          return { ok: false, message };
        }

        let payloadResponse: { data?: unknown } | null = null;
        try {
          payloadResponse = await response.json();
        } catch (_ignore) {
          payloadResponse = null;
        }

        const updatedRaw = payloadResponse?.data ?? null;
        if (!updatedRaw) {
          return {
            ok: false,
            message: "Resposta inesperada ao atualizar o ativo.",
          };
        }

        const updatedAsset = normalizeAsset(updatedRaw);
        const ownerProfile = updatedAsset.support_owner_profile;
        if (ownerProfile?.id) {
          setOwnersMap((prev) => ({
            ...prev,
            [ownerProfile.id]: {
              full_name:
                typeof ownerProfile.full_name === "string" &&
                ownerProfile.full_name.trim()
                  ? ownerProfile.full_name.trim()
                  : ownerProfile.email || null,
              email: ownerProfile.email || null,
              role: ownerProfile.role || null,
            },
          }));
          setSupportUsers((prev) => {
            if (prev.some((user) => user.id === ownerProfile.id)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: ownerProfile.id,
                full_name:
                  (typeof ownerProfile.full_name === "string" &&
                    ownerProfile.full_name.trim()) ||
                  ownerProfile.email ||
                  "Sem nome",
                email: ownerProfile.email || "",
              },
            ];
          });
        }

        setAssets((prev) =>
          prev.map((asset) => (asset.id === assetId ? updatedAsset : asset))
        );

        return { ok: true, asset: updatedAsset };
      } catch (cause) {
        console.warn("[AssetManagement] patchAsset unexpected:", cause);
        return {
          ok: false,
          message: "Erro inesperado ao atualizar o ativo.",
        };
      }
    },
    [currentUser]
  );

  const isEditing = Boolean(editingAssetId);
  const editingAsset = useMemo(() => {
    if (!editingAssetId) {
      return null;
    }
    return assets.find((asset) => asset.id === editingAssetId) || null;
  }, [assets, editingAssetId]);


  const fetchAssets = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const isInitial = mode === "initial";
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setErrorMessage("");
      setTableMessage(null);

      const applyAssets = (rows: any[]) => {
        const ownersBuffer: Record<string, OwnerInfo> = {};

        const normalized = rows.map((item) => {
          const normalizedItem = normalizeAsset(item);
          const ownerProfile = normalizedItem.support_owner_profile;
          if (ownerProfile?.id) {
            ownersBuffer[ownerProfile.id] = {
              full_name:
                typeof ownerProfile.full_name === "string" &&
                ownerProfile.full_name.trim()
                  ? ownerProfile.full_name.trim()
                  : ownerProfile.email || null,
              email: ownerProfile.email || null,
              role: ownerProfile.role || null,
            };
          }
          return normalizedItem;
        });

        setAssets(normalized);
        setOwnersMap(ownersBuffer);
        setSupportUsers((prev) => {
          const combined = new Map<string, SupportUser>();
          prev.forEach((user) => combined.set(user.id, user));
          normalized.forEach((asset) => {
            const owner = asset.support_owner_profile;
            if (owner?.id && !combined.has(owner.id)) {
              combined.set(owner.id, {
                id: owner.id,
                full_name:
                  (typeof owner.full_name === "string" && owner.full_name.trim()) ||
                  owner.email ||
                  "Sem nome",
                email: owner.email || "",
              });
            }
          });
          return Array.from(combined.values()).sort((a, b) =>
            a.full_name.localeCompare(b.full_name)
          );
        });
      };

      const loadFromSupabase = async () => {
        try {
          let query = supabase
            .from("assets")
            .select(
              [
                "id",
                "asset_code",
                "name",
                "category",
                "subcategory",
                "status",
                "lifecycle_stage",
                "quantity",
                "acquisition_date",
                "last_maintenance_date",
                "next_maintenance_date",
                "warranty_expires_at",
                "license_expiry",
                "description",
                "location",
                "inventoried",
                "support_owner",
                "support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)",
              ].join(",")
            )
            .order("category", { ascending: true })
            .order("name", { ascending: true });

          const fallbackUser = currentUser && currentUser.id ? currentUser : null;
          const fallbackRole = fallbackUser?.role
            ? String(fallbackUser.role).toLowerCase()
            : null;

          if (fallbackRole === "support" && fallbackUser?.id) {
            query = query.eq("support_owner", fallbackUser.id);
          }

          const { data, error } = await query;
          if (error) {
            throw error;
          }
          applyAssets(Array.isArray(data) ? data : []);
          return true;
        } catch (cause) {
          console.warn("[AssetManagement] fallback Supabase fetch:", cause);
          setErrorMessage("Não foi possível carregar os ativos pelo Supabase.");
          setAssets([]);
          return false;
        }
      };

      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "[AssetManagement] getSession:",
            sessionError.message
          );
        }

        const token = sessionData?.session?.access_token || null;
        const fallbackUser = currentUser && currentUser.id ? currentUser : null;
        const fallbackRole = fallbackUser?.role
          ? String(fallbackUser.role).toLowerCase()
          : null;

        if (!token && !fallbackUser) {
          setErrorMessage(
            "Sessão expirada. Faça login novamente para visualizar os ativos."
          );
          setAssets([]);
          return;
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (fallbackUser) {
          headers["X-Asset-User-Id"] = fallbackUser.id;
          if (fallbackRole) headers["X-Asset-User-Role"] = fallbackRole;
          if (fallbackUser.email) headers["X-Asset-User-Email"] = fallbackUser.email;
        }

        const response = await fetch(apiUrl("/api/assets"), {
          headers,
        });

        if (!response.ok) {
          let detail: any = null;
          try {
            detail = await response.json();
          } catch (_ignore) {
            detail = null;
          }
          const message = detail?.error || `Status ${response.status}`;
          console.warn("[AssetManagement] fetchAssets:", message);
          const fetched = await loadFromSupabase();
          if (!fetched) {
            setErrorMessage("Não foi possível carregar os ativos: " + message);
          }
          return;
        }

        let payload: { data?: unknown } | null = null;
        try {
          payload = await response.json();
        } catch (_ignore) {
          payload = null;
        }

        const rawData = payload?.data;
        const items = Array.isArray(rawData) ? rawData : [];
        applyAssets(items);
      } catch (cause) {
        console.warn("[AssetManagement] fetchAssets unexpected:", cause);
        const fetched = await loadFromSupabase();
        if (!fetched) {
          setErrorMessage(
            "Não foi possível carregar os ativos. Tente novamente em instantes."
          );
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [currentUser]
  );

  const fetchSupportUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "support")
        .order("full_name", { ascending: true });

      if (error) {
        console.warn("[AssetManagement] fetchSupportUsers:", error.message);
        return;
      }

      const normalized = (data ?? []).map((user: any) => ({
        id: user.id,
        full_name:
          (typeof user.full_name === "string" && user.full_name.trim()) ||
          user.email ||
          "Sem nome",
        email: user.email || "",
      }));
      setSupportUsers(normalized);
      if (normalized.length) {
        setOwnersMap((prev) => {
          const next = { ...prev };
          normalized.forEach((user) => {
            next[user.id] = {
              full_name: user.full_name || null,
              email: user.email || null,
              role: "support",
            };
          });
          return next;
        });
      }
    } catch (cause) {
      console.warn("[AssetManagement] fetchSupportUsers: unexpected", cause);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    fetchSupportUsers();
  }, [fetchAssets, fetchSupportUsers]);

  const handleRefresh = useCallback(() => {
    setTableMessage(null);
    setInlineError(null);
    setErrorMessage("");
    fetchAssets("refresh");
  }, [fetchAssets]);

  const describeNextAction = useCallback((asset: AssetRecord) => {
    if (asset.license_expiry) {
      return `Renovar até ${formatDate(asset.license_expiry)}`;
    }
    if (asset.next_maintenance_date) {
      return `Planejar manutenção para ${formatDate(
        asset.next_maintenance_date
      )}`;
    }
    if (asset.last_maintenance_date) {
      return `Última manutenção em ${formatDate(
        asset.last_maintenance_date
      )}`;
    }
    return "—";
  }, []);

  const indicators = useMemo(() => {
    if (!assets.length) {
      return {
        inventoriedPercent: 0,
        expiredLicenses: 0,
        averageUpdateTime: null as number | null,
      };
    }

    const totalUnits = assets.reduce(
      (acc, asset) => acc + (asset.quantity || 0),
      0
    );
    const inventoriedUnits = assets.reduce(
      (acc, asset) => acc + (asset.inventoried ? asset.quantity || 0 : 0),
      0
    );
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiredLicenses = assets.filter((asset) => {
      if (!asset.license_expiry) return false;
      const expiry = new Date(asset.license_expiry);
      expiry.setHours(0, 0, 0, 0);
      return expiry < now;
    }).length;

    const maintenanceWindows = assets
      .map((asset) => {
        if (asset.last_maintenance_date && asset.next_maintenance_date) {
          const last = new Date(asset.last_maintenance_date).getTime();
          const next = new Date(asset.next_maintenance_date).getTime();
          return (next - last) / (1000 * 60 * 60 * 24);
        }
        if (asset.last_maintenance_date) {
          const last = new Date(asset.last_maintenance_date).getTime();
          const nowTs = Date.now();
          return (nowTs - last) / (1000 * 60 * 60 * 24);
        }
        return null;
      })
      .filter(
        (days): days is number => typeof days === "number" && !Number.isNaN(days)
      );

    const averageUpdateTime = maintenanceWindows.length
      ? Math.round(
          maintenanceWindows.reduce((acc, days) => acc + days, 0) /
            maintenanceWindows.length
        )
      : null;

    return {
      inventoriedPercent: totalUnits
        ? Math.round((inventoriedUnits / totalUnits) * 100)
        : 0,
      expiredLicenses,
      averageUpdateTime,
    };
  }, [assets]);

  const attentionSummary = useMemo(() => {
    if (!assets.length) {
      return {
        metrics: buildAssetIndicators([]),
        flagged: [] as { asset: AssetRecord; flags: string[]; priority: number }[],
      };
    }

    const metrics = buildAssetIndicators(assets);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const flagged = assets
      .map((asset) => {
        const flags: string[] = [];

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
              flags.push(`Licença vencida em ${formatDate(asset.license_expiry)}`);
            } else if (expiry <= in30Days) {
              flags.push(`Licença vence em ${formatDate(asset.license_expiry)}`);
            }
          }
        }

        if (!flags.length) {
          return null;
        }

        const priority = flags.reduce((score, flag) => {
          let nextScore = score;
          if (flag.includes("vencid") || flag.includes("atraso")) {
            nextScore += 5;
          } else if (flag.includes("vence")) {
            nextScore += 3;
          } else if (flag.includes("Inventário")) {
            nextScore += 2;
          }
          if (flag.includes("obsoleto")) {
            nextScore += 4;
          }
          return nextScore;
        }, 0);

        return { asset, flags, priority };
      })
      .filter((item): item is { asset: AssetRecord; flags: string[]; priority: number } => Boolean(item))
      .sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.asset.name.localeCompare(b.asset.name);
      });

    return { metrics, flagged };
  }, [assets]);

  const attentionSummaryChips = useMemo(
    () => {
      const metrics = attentionSummary.metrics;
      return [
        {
          key: "pendingInventory",
          label: "Inventário pendente",
          value: metrics.pendingInventory ?? 0,
          alert: true,
        },
        {
          key: "expiringLicense",
          label: "Licenças a vencer (30 dias)",
          value: metrics.expiringLicense ?? 0,
          alert: true,
        },
        {
          key: "maintenanceDue",
          label: "Manutenções em atraso",
          value: metrics.maintenanceDue ?? 0,
          alert: true,
        },
        {
          key: "obsolete",
          label: "Ativos obsoletos",
          value: metrics.obsolete ?? 0,
          alert: true,
        },
      ];
    },
    [attentionSummary.metrics]
  );

  const filteredAssets = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return assets.filter((asset) => {
      const ownerId =
        asset.support_owner_profile?.id || asset.support_owner || "";
      const matchesTerm =
        !term ||
        asset.name.toLowerCase().includes(term) ||
        asset.asset_code.toLowerCase().includes(term) ||
        CATEGORY_LABEL[asset.category].toLowerCase().includes(term) ||
        (asset.description
          ? asset.description.toLowerCase().includes(term)
          : false);
      const matchesCategory =
        filters.category === "all" || asset.category === filters.category;
      const matchesOwner =
        filters.owner === "all" ||
        (filters.owner === "__none" && !ownerId) ||
        ownerId === filters.owner;
      const matchesStatus =
        filters.status === "all" || asset.status === filters.status;
      return matchesTerm && matchesCategory && matchesOwner && matchesStatus;
    });
  }, [assets, filters]);

  const groupedAssets = useMemo(() => {
    const base = CATEGORY_ORDER.reduce(
      (acc, category) => {
        acc[category] = [] as AssetRecord[];
        return acc;
      },
      {} as Record<AssetCategory, AssetRecord[]>
    );

    filteredAssets.forEach((asset) => {
      const category = (
        CATEGORY_ORDER.includes(asset.category)
          ? asset.category
          : "hardware"
      ) as AssetCategory;
      base[category].push(asset);
    });

    CATEGORY_ORDER.forEach((category) => {
      base[category].sort((a, b) => a.name.localeCompare(b.name));
    });

    return base;
  }, [filteredAssets]);

  const categoriesWithData = CATEGORY_ORDER.filter(
    (category) => groupedAssets[category]?.length
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const field = event.target.name as keyof AssetFormState;
    let value: AssetFormState[keyof AssetFormState];

    if (event.target instanceof HTMLInputElement) {
      if (event.target.type === "number") {
        const numeric = Number(event.target.value);
        const safe = Number.isFinite(numeric) ? Math.max(1, Math.round(numeric)) : 1;
        value = safe as AssetFormState[keyof AssetFormState];
      } else if (event.target.type === "checkbox") {
        value = event.target.checked as AssetFormState[keyof AssetFormState];
      } else {
        value = event.target.value as AssetFormState[keyof AssetFormState];
      }
    } else {
      value = event.target.value as AssetFormState[keyof AssetFormState];
    }

    if (field === "category") {
      value = event.target.value as AssetCategory as AssetFormState[keyof AssetFormState];
    } else if (field === "status") {
      value = event.target.value as AssetStatus as AssetFormState[keyof AssetFormState];
    } else if (field === "lifecycle_stage") {
      value = event.target.value as LifecycleStage as AssetFormState[keyof AssetFormState];
    }

    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFilters((prev) => ({
      ...prev,
      search: value,
    }));
  };

  const handleFilterSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const field = event.target.name as keyof FiltersState;
    const value = event.target.value;
    setFilters((prev) => {
      if (field === "category") {
        const nextValue =
          value === "all" ? "all" : (value as AssetCategory);
        return { ...prev, category: nextValue };
      }
      if (field === "status") {
        const nextValue = value === "all" ? "all" : (value as AssetStatus);
        return { ...prev, status: nextValue };
      }
      if (field === "owner") {
        const nextValue =
          value === "all"
            ? "all"
            : value === "__none"
            ? "__none"
            : value;
        return { ...prev, owner: nextValue };
      }
      return prev;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      category: "all",
      owner: "all",
      status: "all",
    });
  };

  const handleResetForm = () => {
    setFormState({ ...DEFAULT_FORM_STATE });
    setFormStatus("idle");
    setFormMessage("");
    setEditingAssetId(null);
  };

  const handleEditAsset = useCallback((asset: AssetRecord) => {
    setEditingAssetId(asset.id);
    setFormStatus("idle");
    setFormMessage("");

    const currentOwnerId =
      asset.support_owner_profile?.id || asset.support_owner || "";

    setFormState({
      asset_code: asset.asset_code || "",
      name: asset.name || "",
      category: asset.category,
      subcategory: asset.subcategory || "",
      status: asset.status,
      lifecycle_stage: asset.lifecycle_stage,
      quantity: Math.max(1, Math.round(asset.quantity || 1)),
      acquisition_date: toDateInputValue(asset.acquisition_date),
      last_maintenance_date: toDateInputValue(asset.last_maintenance_date),
      next_maintenance_date: toDateInputValue(asset.next_maintenance_date),
      warranty_expires_at: toDateInputValue(asset.warranty_expires_at),
      license_expiry: toDateInputValue(asset.license_expiry),
      location: asset.location || "",
      description: asset.description || "",
      support_owner: currentOwnerId,
      inventoried: Boolean(asset.inventoried),
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleOwnerChange = useCallback(
    async (assetId: string, ownerId: string) => {
      const target = assets.find((asset) => asset.id === assetId);
      if (!target) return;

      const desiredOwner = ownerId || "";
      const currentOwner =
        target.support_owner_profile?.id || target.support_owner || "";

      if (desiredOwner === currentOwner) {
        return;
      }

      setTableMessage(null);
      setInlineError(null);
      setUpdatingOwners((prev) => ({ ...prev, [assetId]: true }));

      const cleanup = () => {
        setUpdatingOwners((prev) => {
          const next = { ...prev };
          delete next[assetId];
          return next;
        });
      };

      try {
        const result = await patchAsset(assetId, {
          support_owner: ownerId || null,
        });

        if (!result.ok) {
          setTableMessage({
            tone: "error",
            text: "Não foi possível atualizar o responsável: " + result.message,
          });
          return;
        }

        if (editingAssetId === assetId) {
          setFormState((prev) => ({
            ...prev,
            support_owner: ownerId || "",
          }));
        }

        setTableMessage({
          tone: "success",
          text: "Responsável atualizado com sucesso.",
        });
      } finally {
        cleanup();
      }
    },
    [assets, patchAsset, editingAssetId]
  );

  const toggleInlineEditor = useCallback((asset: AssetRecord) => {
    setInlineError(null);
    setInlineEditingId((current) => {
      if (current === asset.id) {
        setInlineDraft(null);
        return null;
      }
      setInlineDraft({
        status: asset.status,
        lifecycle_stage: asset.lifecycle_stage,
        last_maintenance_date: toDateInputValue(asset.last_maintenance_date),
        next_maintenance_date: toDateInputValue(asset.next_maintenance_date),
        warranty_expires_at: toDateInputValue(asset.warranty_expires_at),
        license_expiry: toDateInputValue(asset.license_expiry),
        location: asset.location || "",
        description: asset.description || "",
        inventoried: Boolean(asset.inventoried),
      });
      return asset.id;
    });
  }, []);

  const cancelInlineEditing = useCallback(() => {
    setInlineEditingId(null);
    setInlineDraft(null);
    setInlineError(null);
  }, []);

  const handleInlineDraftChange = useCallback(
    (field: keyof InlineDraftState, value: string | boolean) => {
      setInlineDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: value,
        } as InlineDraftState;
      });
    },
    []
  );

  const handleInlineSubmit = useCallback(async () => {
    if (!inlineEditingId || !inlineDraft) {
      return;
    }

    setInlineError(null);
    setInlineSaving(true);

    try {
      const payload = {
        status: inlineDraft.status,
        lifecycle_stage: inlineDraft.lifecycle_stage,
        last_maintenance_date: inlineDraft.last_maintenance_date || null,
        next_maintenance_date: inlineDraft.next_maintenance_date || null,
        warranty_expires_at: inlineDraft.warranty_expires_at || null,
        license_expiry: inlineDraft.license_expiry || null,
        location: inlineDraft.location.trim() || null,
        description: inlineDraft.description.trim() || null,
        inventoried: inlineDraft.inventoried,
      } as Record<string, unknown>;

      const result = await patchAsset(inlineEditingId, payload);

      if (!result.ok) {
        setInlineError(result.message);
        return;
      }

      setTableMessage({
        tone: "success",
        text: "Ativo atualizado diretamente no card.",
      });
      setInlineEditingId(null);
      setInlineDraft(null);
    } finally {
      setInlineSaving(false);
    }
  }, [inlineDraft, inlineEditingId, patchAsset]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormStatus("idle");
    setFormMessage("");

    const assetCode = formState.asset_code.trim().toUpperCase();
    const name = formState.name.trim();

    if (!assetCode || !name) {
      setFormStatus("error");
      setFormMessage("Informe o código e o nome do ativo.");
      return;
    }

    setSaving(true);
    const quantity = Math.max(1, Math.round(formState.quantity || 1));
    const payload = {
      asset_code: assetCode,
      name,
      category: formState.category,
      subcategory: formState.subcategory.trim() || null,
      status: formState.status,
      lifecycle_stage: formState.lifecycle_stage,
      quantity,
      acquisition_date: formState.acquisition_date || null,
      last_maintenance_date: formState.last_maintenance_date || null,
      next_maintenance_date: formState.next_maintenance_date || null,
      warranty_expires_at: formState.warranty_expires_at || null,
      license_expiry: formState.license_expiry || null,
      location: formState.location.trim() || null,
      description: formState.description.trim() || null,
      support_owner: formState.support_owner || null,
      inventoried: formState.inventoried,
    };

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.warn(
          "[AssetManagement] getSession (submit):",
          sessionError.message
        );
      }

      const token = sessionData?.session?.access_token || null;
      const fallbackUser = currentUser && currentUser.id ? currentUser : null;
      const fallbackRole = fallbackUser?.role
        ? String(fallbackUser.role).toLowerCase()
        : null;

      if (!token && !fallbackUser) {
        setFormStatus("error");
        setFormMessage(
          "Sessão expirada. Entre novamente para cadastrar ativos."
        );
        return;
      }

      if (!token && fallbackRole !== "admin") {
        setFormStatus("error");
        setFormMessage(
          "Somente administradores autenticados podem cadastrar ou editar ativos."
        );
        return;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else if (fallbackUser) {
        headers["X-Asset-User-Id"] = fallbackUser.id;
        if (fallbackRole)
          headers["X-Asset-User-Role"] = fallbackRole;
        if (fallbackUser.email)
          headers["X-Asset-User-Email"] = fallbackUser.email;
      }

      const endpoint =
        isEditing && editingAssetId
          ? apiUrl(`/api/assets?id=${encodeURIComponent(editingAssetId)}`)
          : apiUrl("/api/assets");
      const method = isEditing && editingAssetId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let detail: any = null;
        try {
          detail = await response.json();
        } catch (_ignore) {
          detail = null;
        }
        const message = detail?.error || `Status ${response.status}`;
        console.warn("[AssetManagement] submit asset:", message);
        setFormStatus("error");
        setFormMessage(
          `${isEditing ? "Falha ao atualizar ativo" : "Falha ao cadastrar ativo"}: ${message}`
        );
        return;
      }

      let payloadResponse: { data?: AssetRecord | null } | null = null;
      try {
        payloadResponse = await response.json();
      } catch (_ignore) {
        payloadResponse = null;
      }

      const savedAssetRaw = payloadResponse?.data ?? null;
      if (!savedAssetRaw) {
        setFormStatus("error");
        setFormMessage("Resposta inesperada ao salvar o ativo.");
        return;
      }

      const savedAsset = normalizeAsset(savedAssetRaw);
      const ownerProfile = savedAsset.support_owner_profile;
      if (ownerProfile?.id) {
        setOwnersMap((prev) => ({
          ...prev,
          [ownerProfile.id]: {
            full_name:
              typeof ownerProfile.full_name === "string" &&
              ownerProfile.full_name.trim()
                ? ownerProfile.full_name.trim()
                : ownerProfile.email || null,
            email: ownerProfile.email || null,
            role: ownerProfile.role || null,
          },
        }));
        setSupportUsers((prev) => {
          if (prev.some((user) => user.id === ownerProfile.id)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: ownerProfile.id,
              full_name:
                (typeof ownerProfile.full_name === "string" &&
                  ownerProfile.full_name.trim()) ||
                ownerProfile.email ||
                "Sem nome",
              email: ownerProfile.email || "",
            },
          ];
        });
      }

      setFormStatus("success");
      setFormMessage(
        isEditing ? "Ativo atualizado com sucesso." : "Ativo cadastrado com sucesso."
      );
      setFormState({ ...DEFAULT_FORM_STATE });
      if (isEditing) {
        setEditingAssetId(null);
      }
      await fetchAssets("refresh");
    } catch (cause) {
      console.warn("[AssetManagement] submit asset: unexpected", cause);
      setFormStatus("error");
      setFormMessage(
        isEditing
          ? "Erro inesperado ao atualizar o ativo."
          : "Erro inesperado ao cadastrar o ativo."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Gestão de Ativos Corporativos</SectionTitle>
        <SectionDescription>
          Visualize o parque tecnológico com dados reais do Supabase, acompanhe o ciclo de vida de cada ativo
          e mantenha o inventário atualizado para as equipes de suporte e administração.
        </SectionDescription>
        <SectionToolbar>
          <Button
            type="button"
            variant="soft"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            {refreshing ? "Atualizando..." : "Atualizar dados"}
          </Button>
          {(refreshing || (loading && !assets.length)) && (
            <RefreshCaption>Sincronizando com o banco de dados...</RefreshCaption>
          )}
        </SectionToolbar>
        {errorMessage && (
          <SectionFeedback role="alert" tone="error">
            {errorMessage}
          </SectionFeedback>
        )}
      </SectionHeader>

      <SectionMenu aria-label="Seleção de blocos do painel">
        {ADMIN_SECTION_OPTIONS.map((option) => {
          const active = visibleSections.has(option.id);
          return (
            <SectionMenuButton
              key={option.id}
              type="button"
              aria-pressed={active}
              $active={active}
              onClick={() => toggleSectionVisibility(option.id)}
            >
              {option.label}
            </SectionMenuButton>
          );
        })}
      </SectionMenu>

      <AnimatedSection
        $visible={visibleSections.has("overview")}
        aria-hidden={!visibleSections.has("overview")}
      >
        <MetricsGrid>
          <Card>
            <CardHeaderBlock>
              <CardTitleLabel>Ativos inventariados</CardTitleLabel>
              <CardSubtitle>Percentual em relação ao parque total</CardSubtitle>
            </CardHeaderBlock>
            <MetricValue tone="accent">
              {loading ? "..." : `${indicators.inventoriedPercent}%`}
            </MetricValue>
          </Card>

          <Card>
            <CardHeaderBlock>
              <CardTitleLabel>Licenças vencidas</CardTitleLabel>
              <CardSubtitle>Contratos que exigem renovação imediata</CardSubtitle>
            </CardHeaderBlock>
            <MetricValue tone="warning">
              {loading ? "..." : indicators.expiredLicenses}
            </MetricValue>
          </Card>

          <Card>
            <CardHeaderBlock>
              <CardTitleLabel>Tempo médio de atualização</CardTitleLabel>
              <CardSubtitle>Intervalo entre manutenções planejadas</CardSubtitle>
            </CardHeaderBlock>
            <MetricValue>
              {loading
                ? "..."
                : indicators.averageUpdateTime
                ? `${indicators.averageUpdateTime} dias`
                : "—"}
            </MetricValue>
          </Card>
        </MetricsGrid>

        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Ciclo de vida do ativo</CardTitleLabel>
            <CardSubtitle>
              Acompanhe responsabilidades e entregas em cada etapa da jornada do ativo.
            </CardSubtitle>
          </CardHeaderBlock>
          <LifecycleGrid>
            {(Object.keys(LIFECYCLE_LABEL) as LifecycleStage[]).map((stage) => (
              <LifecycleTile key={stage}>
                <LifecycleTitleText>{LIFECYCLE_LABEL[stage]}</LifecycleTitleText>
                <LifecycleDescriptionText>
                  {LIFECYCLE_DESCRIPTION[stage]}
                </LifecycleDescriptionText>
              </LifecycleTile>
            ))}
          </LifecycleGrid>
        </Card>
      </AnimatedSection>

      <AnimatedSection
        $visible={visibleSections.has("critical")}
        aria-hidden={!visibleSections.has("critical")}
      >
        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Ativos que exigem atenção</CardTitleLabel>
            <CardSubtitle>
              Indicadores de licenças, manutenções e inventário que precisam de ação.
            </CardSubtitle>
          </CardHeaderBlock>
          {!assets.length ? (
            <EmptyState>Carregue o inventário para visualizar os indicadores críticos.</EmptyState>
          ) : (
            <>
              <AttentionSummaryRow>
                {attentionSummaryChips.map((chip) => (
                  <AttentionSummaryChip
                    key={chip.key}
                    $alert={chip.value > 0 && chip.alert}
                  >
                    <span>{chip.label}</span>
                    <AttentionSummaryValue>{chip.value}</AttentionSummaryValue>
                  </AttentionSummaryChip>
                ))}
              </AttentionSummaryRow>
              {attentionSummary.flagged.length ? (
                <TableWrapper>
                  <StyledTable>
                    <thead>
                      <tr>
                        <TableHeadCell>Código</TableHeadCell>
                        <TableHeadCell>Ativo</TableHeadCell>
                        <TableHeadCell>Status</TableHeadCell>
                        <TableHeadCell>Próxima ação</TableHeadCell>
                        <TableHeadCell>Alertas</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {attentionSummary.flagged.map(({ asset, flags }) => {
                        const statusMeta =
                          STATUS_BADGE[asset.status] ?? {
                            label: asset.status,
                            tone: "neutral" as const,
                          };
                        const nextAction = describeNextAction(asset);
                        return (
                          <TableRow key={asset.id}>
                            <TableCell>{asset.asset_code}</TableCell>
                            <TableCell>
                              <AssetName>{asset.name}</AssetName>
                              <AssetMeta>
                                {CATEGORY_LABEL[asset.category]} • {asset.location || "Local não informado"}
                              </AssetMeta>
                              <AssetMeta>
                                Ciclo de vida: {LIFECYCLE_LABEL[asset.lifecycle_stage]}
                              </AssetMeta>
                            </TableCell>
                            <TableCell>
                              <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                            </TableCell>
                            <TableCell>{nextAction}</TableCell>
                            <TableCell>
                              <AttentionFlagGroup>
                                {flags.map((flag, index) => (
                                  <Badge
                                    key={`${asset.id}-flag-${index}`}
                                    tone={
                                      flag.includes("vencid") || flag.includes("atraso")
                                        ? "danger"
                                        : "warning"
                                    }
                                  >
                                    {flag}
                                  </Badge>
                                ))}
                              </AttentionFlagGroup>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </StyledTable>
                </TableWrapper>
              ) : (
                <EmptyState>Todos os ativos estão em dia no momento.</EmptyState>
              )}
            </>
          )}
        </Card>
      </AnimatedSection>

      <AnimatedSection
        $visible={visibleSections.has("create")}
        aria-hidden={!visibleSections.has("create")}
      >
        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Cadastrar novo ativo</CardTitleLabel>
            <CardSubtitle>
              Registre ativos diretamente no inventário para que o time de suporte acompanhe responsabilidades e prazos.
            </CardSubtitle>
          </CardHeaderBlock>
          <FormLayout onSubmit={handleSubmit}>
          {isEditing && (
            <EditingNotice>
              <div>
                <EditingLabel>Editando ativo existente</EditingLabel>
                <EditingMeta>
                  {(formState.asset_code || editingAsset?.asset_code || "—") +
                    " • " +
                    (formState.name || editingAsset?.name || "Sem nome")}
                </EditingMeta>
              </div>
              <EditingActions>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetForm}
                  disabled={saving}
                >
                  Cancelar edição
                </Button>
              </EditingActions>
            </EditingNotice>
          )}
          <FieldGrid>
            <Field>
              <FieldLabel htmlFor="asset_code">Código do ativo</FieldLabel>
              <Input
                id="asset_code"
                name="asset_code"
                placeholder="Ex.: SRV-DB"
                value={formState.asset_code}
                onChange={handleChange}
              />
              <HelperText>Utilize um identificador único para facilitar auditorias.</HelperText>
            </Field>
            <Field>
              <FieldLabel htmlFor="name">Nome</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="Servidor PostgreSQL"
                value={formState.name}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="category">Categoria</FieldLabel>
              <Select
                id="category"
                name="category"
                value={formState.category}
                onChange={handleChange}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select
                id="status"
                name="status"
                value={formState.status}
                onChange={handleChange}
              >
                <option value="em uso">Em uso</option>
                <option value="em manutenção">Em manutenção</option>
                <option value="planejado">Planejado</option>
                <option value="obsoleto">Obsoleto</option>
              </Select>
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field>
              <FieldLabel htmlFor="lifecycle_stage">Etapa do ciclo de vida</FieldLabel>
              <Select
                id="lifecycle_stage"
                name="lifecycle_stage"
                value={formState.lifecycle_stage}
                onChange={handleChange}
              >
                {(Object.keys(LIFECYCLE_LABEL) as LifecycleStage[]).map((stage) => (
                  <option key={stage} value={stage}>
                    {LIFECYCLE_LABEL[stage]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="subcategory">Subcategoria</FieldLabel>
              <Input
                id="subcategory"
                name="subcategory"
                placeholder="Ex.: servidor, notebook, licença"
                value={formState.subcategory}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="quantity">Quantidade</FieldLabel>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                value={String(formState.quantity)}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="support_owner">Responsável (suporte)</FieldLabel>
              <Select
                id="support_owner"
                name="support_owner"
                value={formState.support_owner}
                onChange={handleChange}
              >
                <option value="">Sem responsável definido</option>
                {supportUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </Select>
              <HelperText>Analista que verá o ativo no painel de suporte.</HelperText>
            </Field>
            <Field>
              <FieldLabel>Inventariado?</FieldLabel>
              <CheckboxRow>
                <CheckboxInput
                  type="checkbox"
                  name="inventoried"
                  checked={formState.inventoried}
                  onChange={handleChange}
                />
                <span>Ativo já conferido no inventário físico</span>
              </CheckboxRow>
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field>
              <FieldLabel htmlFor="acquisition_date">Data de aquisição</FieldLabel>
              <Input
                id="acquisition_date"
                name="acquisition_date"
                type="date"
                value={formState.acquisition_date}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="last_maintenance_date">Última manutenção</FieldLabel>
              <Input
                id="last_maintenance_date"
                name="last_maintenance_date"
                type="date"
                value={formState.last_maintenance_date}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="next_maintenance_date">Próxima manutenção</FieldLabel>
              <Input
                id="next_maintenance_date"
                name="next_maintenance_date"
                type="date"
                value={formState.next_maintenance_date}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="warranty_expires_at">Garantia expira em</FieldLabel>
              <Input
                id="warranty_expires_at"
                name="warranty_expires_at"
                type="date"
                value={formState.warranty_expires_at}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="license_expiry">Licença expira em</FieldLabel>
              <Input
                id="license_expiry"
                name="license_expiry"
                type="date"
                value={formState.license_expiry}
                onChange={handleChange}
              />
            </Field>
          </FieldGrid>

          <FullWidthField>
            <FieldLabel htmlFor="location">Localização</FieldLabel>
            <Input
              id="location"
              name="location"
              placeholder="Data center, escritório, nuvem..."
              value={formState.location}
              onChange={handleChange}
            />
          </FullWidthField>

          <FullWidthField>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <TextArea
              id="description"
              name="description"
              placeholder="Notas adicionais, contexto ou dependências do ativo."
              value={formState.description}
              onChange={handleChange}
            />
          </FullWidthField>

          <FormActions>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : isEditing
                ? "Salvar alterações"
                : "Cadastrar ativo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetForm}
              disabled={saving}
            >
              {isEditing ? "Limpar e cancelar" : "Limpar campos"}
            </Button>
          </FormActions>
          {formStatus !== "idle" && formMessage && (
            <FormFeedback tone={formStatus === "success" ? "success" : "error"}>
              {formMessage}
            </FormFeedback>
          )}
          </FormLayout>
        </Card>
      </AnimatedSection>

      <AnimatedSection
        $visible={visibleSections.has("inventory")}
        aria-hidden={!visibleSections.has("inventory")}
      >
        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Filtrar inventário</CardTitleLabel>
            <CardSubtitle>
              Combine filtros e refine a visão de ativos por código, categoria, status ou responsável.
            </CardSubtitle>
          </CardHeaderBlock>
          <FilterToolbar>
            <FilterField>
              <FieldLabel htmlFor="filter-search">Buscar</FieldLabel>
              <Input
                id="filter-search"
                name="filter-search"
                placeholder="Código, ativo ou palavra-chave"
                value={filters.search}
                onChange={handleFilterSearchChange}
              />
            </FilterField>
            <FilterField>
              <FieldLabel htmlFor="filter-category">Categoria</FieldLabel>
              <Select
                id="filter-category"
                name="category"
                value={filters.category}
                onChange={handleFilterSelectChange}
              >
                <option value="all">Todas as categorias</option>
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField>
              <FieldLabel htmlFor="filter-status">Status</FieldLabel>
              <Select
                id="filter-status"
                name="status"
                value={filters.status}
                onChange={handleFilterSelectChange}
              >
                <option value="all">Todos os status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_BADGE[status]?.label ?? status}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField>
              <FieldLabel htmlFor="filter-owner">Responsável</FieldLabel>
              <Select
                id="filter-owner"
                name="owner"
                value={filters.owner}
                onChange={handleFilterSelectChange}
              >
                <option value="all">Todos os responsáveis</option>
                <option value="__none">Sem responsável</option>
                {supportUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterActions>
              <Button type="button" variant="ghost" onClick={handleResetFilters}>
                Limpar filtros
              </Button>
            </FilterActions>
          </FilterToolbar>
        </Card>

        <CategoryStack>
          {loading && !assets.length ? (
            <Card>
              <EmptyState>Carregando inventário...</EmptyState>
            </Card>
          ) : !categoriesWithData.length ? (
            <Card>
              <EmptyState>Nenhum ativo cadastrado até o momento.</EmptyState>
            </Card>
          ) : (
            <>
              {tableMessage && (
                <TableFeedback tone={tableMessage.tone}>
                  {tableMessage.text}
                </TableFeedback>
              )}
              {categoriesWithData.map((category) => {
                const list = groupedAssets[category];
                const unitCount = list.reduce(
                  (acc, asset) => acc + (asset.quantity || 0),
                  0
                );
                const subtitle =
                  unitCount !== list.length
                    ? `${list.length} registros • ${unitCount} unidades`
                    : `${list.length} ativos catalogados`;
                return (
                  <Card key={category}>
                    <CardHeaderBlock>
                      <CardTitleLabel>{CATEGORY_LABEL[category]}</CardTitleLabel>
                      <CardSubtitle>{subtitle}</CardSubtitle>
                    </CardHeaderBlock>
                    <TableWrapper>
                      <StyledTable>
                    <thead>
                      <tr>
                        <TableHeadCell>Código</TableHeadCell>
                        <TableHeadCell>Ativo</TableHeadCell>
                        <TableHeadCell>Responsável</TableHeadCell>
                        <TableHeadCell>Etapa atual</TableHeadCell>
                        <TableHeadCell>Última manutenção</TableHeadCell>
                        <TableHeadCell>Próxima ação</TableHeadCell>
                        <TableHeadCell>Status</TableHeadCell>
                        <TableHeadCell>Inventário</TableHeadCell>
                        <TableHeadCell>Ações</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((asset) => {
                        const statusMeta =
                          STATUS_BADGE[asset.status] ?? {
                            label: asset.status,
                            tone: "neutral" as const,
                          };
                        const ownerMeta = asset.support_owner_profile?.id
                          ? {
                              full_name:
                                asset.support_owner_profile.full_name ||
                                asset.support_owner_profile.email ||
                                null,
                              email: asset.support_owner_profile.email || null,
                              role: asset.support_owner_profile.role || null,
                            }
                          : asset.support_owner
                          ? ownersMap[asset.support_owner]
                          : undefined;
                        const currentOwnerId =
                          asset.support_owner_profile?.id ||
                          asset.support_owner ||
                          "";
                        const ownerOptionMissing =
                          Boolean(currentOwnerId) &&
                          !supportUsers.some((user) => user.id === currentOwnerId);
                        const ownerSelectOptions =
                          ownerOptionMissing && ownerMeta
                            ? [
                                ...supportUsers,
                                {
                                  id: currentOwnerId,
                                  full_name:
                                    ownerMeta.full_name ||
                                    ownerMeta.email ||
                                    "Responsável atual",
                                  email: ownerMeta.email || "",
                                },
                              ]
                            : supportUsers;
                        const nextAction = describeNextAction(asset);
                        const editingThisAsset = editingAssetId === asset.id;

                        const inlineActive = inlineEditingId === asset.id;

                        return (
                          <React.Fragment key={asset.id}>
                            <TableRow>
                              <TableCell>{asset.asset_code}</TableCell>
                              <TableCell>
                                <AssetName>{asset.name}</AssetName>
                                <AssetMeta>
                                  Adquirido em {formatDate(asset.acquisition_date)}
                                </AssetMeta>
                                <AssetMeta>
                                  Qtd. {asset.quantity} • {asset.location?.length
                                    ? asset.location
                                    : "Local não informado"}
                                </AssetMeta>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={currentOwnerId}
                                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                    handleOwnerChange(asset.id, event.target.value)
                                  }
                                  disabled={Boolean(updatingOwners[asset.id])}
                                  style={{ minWidth: 200 }}
                                >
                                  <option value="">Sem responsável</option>
                                  {ownerSelectOptions.map((user) => (
                                    <option key={user.id} value={user.id}>
                                      {user.full_name}
                                    </option>
                                  ))}
                                </Select>
                                {updatingOwners[asset.id] ? (
                                  <OwnerHint>Atualizando...</OwnerHint>
                                ) : currentOwnerId ? (
                                  ownerMeta?.email ? (
                                    <OwnerHint>{ownerMeta.email}</OwnerHint>
                                  ) : null
                                ) : (
                                  <OwnerHint>
                                    Defina um responsável para aparecer no painel de suporte.
                                  </OwnerHint>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge tone="info">
                                  {LIFECYCLE_LABEL[asset.lifecycle_stage]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatDate(asset.last_maintenance_date)}
                              </TableCell>
                              <TableCell>{nextAction}</TableCell>
                              <TableCell>
                                <Badge tone={statusMeta.tone}>
                                  {statusMeta.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge tone={asset.inventoried ? "success" : "warning"}>
                                  {asset.inventoried ? "Inventariado" : "Pendente"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <TableActions>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="soft"
                                    onClick={() => toggleInlineEditor(asset)}
                                    disabled={inlineSaving && inlineActive}
                                  >
                                    {inlineActive ? "Cancelar edição rápida" : "Editar no card"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditAsset(asset)}
                                    disabled={saving || editingThisAsset}
                                  >
                                    {editingThisAsset ? "Em edição" : "Formulário completo"}
                                  </Button>
                                </TableActions>
                              </TableCell>
                            </TableRow>
                            {inlineActive && inlineDraft && (
                              <TableRow>
                                <TableCell colSpan={9}>
                                  <InlineEditor>
                                    {inlineError && <InlineError>{inlineError}</InlineError>}
                                    <InlineGrid>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-status-${asset.id}`}>
                                          Status
                                        </FieldLabel>
                                        <Select
                                          id={`inline-status-${asset.id}`}
                                          value={inlineDraft.status}
                                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                            handleInlineDraftChange(
                                              "status",
                                              event.target.value as AssetStatus
                                            )
                                          }
                                          disabled={inlineSaving}
                                        >
                                          {STATUS_OPTIONS.map((status) => (
                                            <option key={status} value={status}>
                                              {STATUS_BADGE[status]?.label ?? status}
                                            </option>
                                          ))}
                                        </Select>
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-lifecycle-${asset.id}`}>
                                          Etapa do ciclo de vida
                                        </FieldLabel>
                                        <Select
                                          id={`inline-lifecycle-${asset.id}`}
                                          value={inlineDraft.lifecycle_stage}
                                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                            handleInlineDraftChange(
                                              "lifecycle_stage",
                                              event.target.value as LifecycleStage
                                            )
                                          }
                                          disabled={inlineSaving}
                                        >
                                          {(Object.keys(LIFECYCLE_LABEL) as LifecycleStage[]).map((stage) => (
                                            <option key={stage} value={stage}>
                                              {LIFECYCLE_LABEL[stage]}
                                            </option>
                                          ))}
                                        </Select>
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-last-${asset.id}`}>
                                          Última manutenção
                                        </FieldLabel>
                                        <Input
                                          id={`inline-last-${asset.id}`}
                                          type="date"
                                          value={inlineDraft.last_maintenance_date}
                                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleInlineDraftChange(
                                              "last_maintenance_date",
                                              event.target.value
                                            )
                                          }
                                          disabled={inlineSaving}
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-next-${asset.id}`}>
                                          Próxima manutenção
                                        </FieldLabel>
                                        <Input
                                          id={`inline-next-${asset.id}`}
                                          type="date"
                                          value={inlineDraft.next_maintenance_date}
                                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleInlineDraftChange(
                                              "next_maintenance_date",
                                              event.target.value
                                            )
                                          }
                                          disabled={inlineSaving}
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-license-${asset.id}`}>
                                          Licença expira em
                                        </FieldLabel>
                                        <Input
                                          id={`inline-license-${asset.id}`}
                                          type="date"
                                          value={inlineDraft.license_expiry}
                                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleInlineDraftChange(
                                              "license_expiry",
                                              event.target.value
                                            )
                                          }
                                          disabled={inlineSaving}
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-warranty-${asset.id}`}>
                                          Garantia expira em
                                        </FieldLabel>
                                        <Input
                                          id={`inline-warranty-${asset.id}`}
                                          type="date"
                                          value={inlineDraft.warranty_expires_at}
                                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleInlineDraftChange(
                                              "warranty_expires_at",
                                              event.target.value
                                            )
                                          }
                                          disabled={inlineSaving}
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel htmlFor={`inline-location-${asset.id}`}>
                                          Localização
                                        </FieldLabel>
                                        <Input
                                          id={`inline-location-${asset.id}`}
                                          value={inlineDraft.location}
                                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleInlineDraftChange("location", event.target.value)
                                          }
                                          disabled={inlineSaving}
                                        />
                                      </Field>
                                      <Field>
                                        <CheckboxRow>
                                          <CheckboxInput
                                            type="checkbox"
                                            checked={inlineDraft.inventoried}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                              handleInlineDraftChange("inventoried", event.target.checked)
                                            }
                                            disabled={inlineSaving}
                                          />
                                          <span>Inventariado</span>
                                        </CheckboxRow>
                                      </Field>
                                      <Field style={{ gridColumn: "1 / -1" }}>
                                        <FieldLabel htmlFor={`inline-description-${asset.id}`}>
                                          Descrição
                                        </FieldLabel>
                                        <TextArea
                                          id={`inline-description-${asset.id}`}
                                          value={inlineDraft.description}
                                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                            handleInlineDraftChange(
                                              "description",
                                              event.target.value
                                            )
                                          }
                                          disabled={inlineSaving}
                                          style={{ minHeight: 90 }}
                                        />
                                      </Field>
                                    </InlineGrid>
                                    <InlineActions>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={cancelInlineEditing}
                                        disabled={inlineSaving}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleInlineSubmit}
                                        disabled={inlineSaving}
                                      >
                                        {inlineSaving ? "Salvando..." : "Salvar alterações"}
                                      </Button>
                                    </InlineActions>
                                  </InlineEditor>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </StyledTable>
                </TableWrapper>
              </Card>
            );
          })}
          </>
        )}
      </CategoryStack>
      </AnimatedSection>
    </Section>
  );
};

export default AssetManagement;
