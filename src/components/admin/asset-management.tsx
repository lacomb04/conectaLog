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

const LIFECYCLE_LABEL: Record<LifecycleStage, string> = {
  acquisition: "Aquisição",
  deployment: "Implantação",
  use: "Uso",
  maintenance: "Manutenção",
  disposal: "Descarte",
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

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("pt-BR");
};

const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, OwnerInfo>>({});
  const [formState, setFormState] = useState<AssetFormState>({
    ...DEFAULT_FORM_STATE,
  });
  const [saving, setSaving] = useState(false);
  const [formStatus, setFormStatus] =
    useState<"idle" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");


  const fetchAssets = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const isInitial = mode === "initial";
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setErrorMessage("");
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn(
            "[AssetManagement] getSession:",
            sessionError.message
          );
        }

        const token = sessionData?.session?.access_token;
        if (!token) {
          setErrorMessage(
            "Sessão expirada. Faça login novamente para visualizar os ativos."
          );
          setAssets([]);
          return;
        }

        const response = await fetch(apiUrl("/api/assets"), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          setErrorMessage("Não foi possível carregar os ativos: " + message);
          setAssets([]);
          return;
        }

        let payload: { data?: unknown } | null = null;
        try {
          payload = await response.json();
        } catch (_ignore) {
          payload = null;
        }

        const rawData = payload?.data;
        const items: AssetRecord[] = Array.isArray(rawData)
          ? (rawData as AssetRecord[])
          : [];
        const ownersBuffer: Record<string, OwnerInfo> = {};

        const normalized = items.map((item) => {
          const quantity =
            typeof item.quantity === "number" && item.quantity > 0
              ? item.quantity
              : 1;
          const ownerProfile = item.support_owner_profile;
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
          return {
            ...item,
            quantity,
            inventoried: Boolean(item.inventoried),
          } as AssetRecord;
        });

        if (Object.keys(ownersBuffer).length) {
          setOwnersMap((prev) => ({ ...prev, ...ownersBuffer }));
        }

        setAssets(normalized);
      } catch (cause) {
        console.warn("[AssetManagement] fetchAssets: unexpected", cause);
        setErrorMessage("Falha inesperada ao carregar os ativos.");
        setAssets([]);
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    []
  );

  const fetchSupportUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role")
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
    if (!refreshing) {
      fetchAssets("refresh");
    }
  }, [fetchAssets, refreshing]);

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

  const groupedAssets = useMemo(() => {
    const base = CATEGORY_ORDER.reduce(
      (acc, category) => {
        acc[category] = [] as AssetRecord[];
        return acc;
      },
      {} as Record<AssetCategory, AssetRecord[]>
    );

    assets.forEach((asset) => {
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
  }, [assets]);

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

  const handleResetForm = () => {
    setFormState({ ...DEFAULT_FORM_STATE });
    setFormStatus("idle");
    setFormMessage("");
  };

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
        console.warn("[AssetManagement] getSession (submit):", sessionError.message);
      }

      const token = sessionData?.session?.access_token;
      if (!token) {
        setFormStatus("error");
        setFormMessage("Sessão expirada. Entre novamente para cadastrar ativos.");
        return;
      }

      const response = await fetch(apiUrl("/api/assets"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        console.warn("[AssetManagement] insert:", message);
        setFormStatus("error");
        setFormMessage("Falha ao cadastrar ativo: " + message);
        return;
      }

      let payloadResponse: { data?: AssetRecord | null } | null = null;
      try {
        payloadResponse = await response.json();
      } catch (_ignore) {
        payloadResponse = null;
      }

      const createdAsset = payloadResponse?.data ?? null;
      if (createdAsset?.support_owner_profile?.id) {
        const ownerProfile = createdAsset.support_owner_profile;
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
      }

      setFormStatus("success");
      setFormMessage("Ativo cadastrado com sucesso.");
      setFormState({ ...DEFAULT_FORM_STATE });
      await fetchAssets("refresh");
    } catch (cause) {
      console.warn("[AssetManagement] insert: unexpected", cause);
      setFormStatus("error");
      setFormMessage("Erro inesperado ao cadastrar o ativo.");
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
          <CardTitleLabel>Cadastrar novo ativo</CardTitleLabel>
          <CardSubtitle>
            Registre ativos diretamente no inventário para que o time de suporte acompanhe responsabilidades e prazos.
          </CardSubtitle>
        </CardHeaderBlock>
        <FormLayout onSubmit={handleSubmit}>
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
              {saving ? "Salvando..." : "Cadastrar ativo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetForm}
              disabled={saving}
            >
              Limpar campos
            </Button>
          </FormActions>
          {formStatus !== "idle" && formMessage && (
            <FormFeedback tone={formStatus === "success" ? "success" : "error"}>
              {formMessage}
            </FormFeedback>
          )}
        </FormLayout>
      </Card>

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
          categoriesWithData.map((category) => {
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
                        const ownerLabel = ownerMeta?.full_name?.trim()
                          ? ownerMeta.full_name.trim()
                          : ownerMeta?.email || "—";
                        const nextAction = asset.license_expiry
                          ? `Renovar até ${formatDate(asset.license_expiry)}`
                          : asset.next_maintenance_date
                          ? `Planejado para ${formatDate(asset.next_maintenance_date)}`
                          : "—";

                        return (
                          <TableRow key={asset.id}>
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
                            <TableCell>{ownerLabel}</TableCell>
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
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </StyledTable>
                </TableWrapper>
              </Card>
            );
          })
        )}
      </CategoryStack>
    </Section>
  );
};

export default AssetManagement;
