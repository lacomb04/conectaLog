import React, { useMemo } from "react";
import styled from "styled-components";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

type AssetCategory =
  | "hardware"
  | "software"
  | "network"
  | "peripherals"
  | "licenses"
  | "mobile";

type LifecycleStage =
  | "acquisition"
  | "deployment"
  | "use"
  | "maintenance"
  | "disposal";

type AssetStatus = "em uso" | "em manutenção" | "planejado" | "obsoleto";

type Asset = {
  id: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  acquisitionDate: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedTo?: string;
  lifecycleStage: LifecycleStage;
  inventoried: boolean;
  licenseExpiry?: string;
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
  acquisition: "Planejamento do orçamento, cotação e registro do ativo no inventário.",
  deployment: "Configuração, teste e entrega ao usuário ou ambiente de produção.",
  use: "Fase operacional acompanhando desempenho, compliance e responsável.",
  maintenance: "Atualizações, substituição de peças, renovações de licenças e auditorias.",
  disposal: "Desmobilização segura, descarte sustentável ou revenda autorizada.",
};

const SAMPLE_ASSETS: Asset[] = [
  {
    id: "A-1001",
    name: "Notebook Dell Latitude 7440",
    category: "hardware",
    status: "em uso",
    acquisitionDate: "2023-02-12",
    lastMaintenanceDate: "2024-08-10",
    nextMaintenanceDate: "2025-08-01",
    assignedTo: "João Silva",
    lifecycleStage: "use",
    inventoried: true,
  },
  {
    id: "A-1002",
    name: "Switch Cisco Catalyst 9300",
    category: "network",
    status: "em manutenção",
    acquisitionDate: "2022-04-05",
    lastMaintenanceDate: "2024-06-18",
    nextMaintenanceDate: "2024-12-10",
    lifecycleStage: "maintenance",
    inventoried: true,
  },
  {
    id: "A-1003",
    name: "Licença Microsoft 365 E3",
    category: "licenses",
    status: "em uso",
    acquisitionDate: "2024-01-01",
    licenseExpiry: "2024-12-31",
    lifecycleStage: "use",
    inventoried: true,
  },
  {
    id: "A-1004",
    name: "CRM Corporativo",
    category: "software",
    status: "em uso",
    acquisitionDate: "2021-07-15",
    lastMaintenanceDate: "2024-05-01",
    nextMaintenanceDate: "2024-11-01",
    lifecycleStage: "maintenance",
    inventoried: true,
    licenseExpiry: "2025-07-31",
  },
  {
    id: "A-1005",
    name: "Monitor LG 27'' UHD",
    category: "peripherals",
    status: "em uso",
    acquisitionDate: "2022-11-02",
    lifecycleStage: "use",
    inventoried: false,
    assignedTo: "Carla Mendes",
  },
  {
    id: "A-1006",
    name: "Firewall Fortinet FG-80F",
    category: "network",
    status: "planejado",
    acquisitionDate: "2025-01-15",
    lifecycleStage: "acquisition",
    inventoried: false,
  },
  {
    id: "A-1007",
    name: "Impressora HP LaserJet M507",
    category: "hardware",
    status: "em manutenção",
    acquisitionDate: "2020-03-12",
    lastMaintenanceDate: "2024-09-12",
    lifecycleStage: "maintenance",
    inventoried: true,
  },
  {
    id: "A-1008",
    name: "iPhone 14 - Diretoria",
    category: "mobile",
    status: "em uso",
    acquisitionDate: "2024-04-20",
    lifecycleStage: "use",
    inventoried: true,
    assignedTo: "Diretoria",
  },
  {
    id: "A-1009",
    name: "Antivírus SentinelOne",
    category: "software",
    status: "em uso",
    acquisitionDate: "2023-09-01",
    lifecycleStage: "maintenance",
    inventoried: true,
    licenseExpiry: "2024-09-01",
  },
  {
    id: "A-1010",
    name: "Servidor VMware ESXi",
    category: "hardware",
    status: "em uso",
    acquisitionDate: "2019-06-10",
    lifecycleStage: "maintenance",
    inventoried: true,
    lastMaintenanceDate: "2024-02-15",
    nextMaintenanceDate: "2024-12-01",
  },
  {
    id: "A-1011",
    name: "Tablets de inventário",
    category: "mobile",
    status: "obsoleto",
    acquisitionDate: "2018-05-05",
    lifecycleStage: "disposal",
    inventoried: false,
  },
];

const STATUS_BADGE: Record<AssetStatus, { label: string; tone: "neutral" | "info" | "warning" | "danger" | "success" }> = {
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

const MetricValue = styled.span<{ tone?: "default" | "accent" | "warning" }>`
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

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const AssetManagement: React.FC = () => {
  const groupedAssets = useMemo(() => {
    return SAMPLE_ASSETS.reduce<Record<AssetCategory, Asset[]>>(
      (acc, asset) => {
        if (!acc[asset.category]) {
          acc[asset.category] = [] as Asset[];
        }
        acc[asset.category].push(asset);
        return acc;
      },
      {
        hardware: [],
        software: [],
        network: [],
        peripherals: [],
        licenses: [],
        mobile: [],
      },
    );
  }, []);

  const indicators = useMemo(() => {
    const total = SAMPLE_ASSETS.length;
    const inventoried = SAMPLE_ASSETS.filter((asset) => asset.inventoried).length;
    const expiredLicenses = SAMPLE_ASSETS.filter((asset) => {
      if (!asset.licenseExpiry) return false;
      return new Date(asset.licenseExpiry) < new Date();
    }).length;

    const maintenanceWindows = SAMPLE_ASSETS.map((asset) => {
      if (asset.lastMaintenanceDate && asset.nextMaintenanceDate) {
        const last = new Date(asset.lastMaintenanceDate).getTime();
        const next = new Date(asset.nextMaintenanceDate).getTime();
        return (next - last) / (1000 * 60 * 60 * 24);
      }
      if (asset.lastMaintenanceDate) {
        const last = new Date(asset.lastMaintenanceDate).getTime();
        const now = Date.now();
        return (now - last) / (1000 * 60 * 60 * 24);
      }
      return null;
    }).filter((value): value is number => value !== null && !Number.isNaN(value));

    const averageUpdateTime = maintenanceWindows.length
      ? Math.round(
          maintenanceWindows.reduce((acc, days) => acc + days, 0) /
            maintenanceWindows.length,
        )
      : null;

    return {
      total,
      inventoriedPercent: total ? Math.round((inventoried / total) * 100) : 0,
      expiredLicenses,
      averageUpdateTime,
    };
  }, []);

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Gestão de Ativos Corporativos</SectionTitle>
        <SectionDescription>
          Visualize o parque tecnológico por categoria, acompanhe o ciclo de vida de cada ativo,
          monitore indicadores operacionais e antecipe ações de manutenção ou renovação de licenças.
        </SectionDescription>
      </SectionHeader>

      <MetricsGrid>
        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Ativos inventariados</CardTitleLabel>
            <CardSubtitle>Percentual em relação ao parque total</CardSubtitle>
          </CardHeaderBlock>
          <MetricValue tone="accent">{indicators.inventoriedPercent}%</MetricValue>
        </Card>

        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Licenças vencidas</CardTitleLabel>
            <CardSubtitle>Contratos que exigem renovação imediata</CardSubtitle>
          </CardHeaderBlock>
          <MetricValue tone="warning">{indicators.expiredLicenses}</MetricValue>
        </Card>

        <Card>
          <CardHeaderBlock>
            <CardTitleLabel>Tempo médio de atualização</CardTitleLabel>
            <CardSubtitle>Intervalo entre manutenções planejadas</CardSubtitle>
          </CardHeaderBlock>
          <MetricValue>
            {indicators.averageUpdateTime ? `${indicators.averageUpdateTime} dias` : "—"}
          </MetricValue>
        </Card>
      </MetricsGrid>

      <Card>
        <CardHeaderBlock>
          <CardTitleLabel>Ciclo de vida do ativo</CardTitleLabel>
          <CardSubtitle>Acompanhe a maturidade e responsabilidades de cada etapa</CardSubtitle>
        </CardHeaderBlock>
        <LifecycleGrid>
          {(Object.keys(LIFECYCLE_LABEL) as LifecycleStage[]).map((stage) => (
            <LifecycleTile key={stage}>
              <LifecycleTitleText>{LIFECYCLE_LABEL[stage]}</LifecycleTitleText>
              <LifecycleDescriptionText>{LIFECYCLE_DESCRIPTION[stage]}</LifecycleDescriptionText>
            </LifecycleTile>
          ))}
        </LifecycleGrid>
      </Card>

      <CategoryStack>
        {(Object.keys(groupedAssets) as AssetCategory[]).map((category) => {
          const assets = groupedAssets[category];
          if (!assets.length) return null;

          return (
            <Card key={category}>
              <CardHeaderBlock>
                <CardTitleLabel>{CATEGORY_LABEL[category]}</CardTitleLabel>
                <CardSubtitle>{assets.length} ativos catalogados</CardSubtitle>
              </CardHeaderBlock>
              <TableWrapper>
                <StyledTable>
                  <thead>
                    <tr>
                      <TableHeadCell>Identificador</TableHeadCell>
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
                    {assets.map((asset) => {
                      const statusMeta = STATUS_BADGE[asset.status];
                      const nextAction = asset.licenseExpiry
                        ? `Renovar até ${formatDate(asset.licenseExpiry)}`
                        : formatDate(asset.nextMaintenanceDate);

                      return (
                        <TableRow key={asset.id}>
                          <TableCell>{asset.id}</TableCell>
                          <TableCell>
                            <AssetName>{asset.name}</AssetName>
                            <AssetMeta>Adquirido em {formatDate(asset.acquisitionDate)}</AssetMeta>
                          </TableCell>
                          <TableCell>{asset.assignedTo ?? "—"}</TableCell>
                          <TableCell>
                            <Badge tone="info">{LIFECYCLE_LABEL[asset.lifecycleStage]}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(asset.lastMaintenanceDate)}</TableCell>
                          <TableCell>{nextAction}</TableCell>
                          <TableCell>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
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
        })}
      </CategoryStack>
    </Section>
  );
};

export default AssetManagement;
