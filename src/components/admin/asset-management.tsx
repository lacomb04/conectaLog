import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

const STATUS_BADGE: Record<AssetStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "em uso": { label: "Em uso", variant: "default" },
  "em manutenção": { label: "Em manutenção", variant: "secondary" },
  planejado: { label: "Planejado", variant: "outline" },
  obsoleto: { label: "Obsoleto", variant: "destructive" },
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const AssetManagement: React.FC = () => {
  const groupedAssets = useMemo(() => {
    return SAMPLE_ASSETS.reduce<Record<AssetCategory, Asset[]>>((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = [] as Asset[];
      }
      acc[asset.category].push(asset);
      return acc;
    }, {
      hardware: [],
      software: [],
      network: [],
      peripherals: [],
      licenses: [],
      mobile: [],
    });
  }, []);

  const indicators = useMemo(() => {
    const total = SAMPLE_ASSETS.length;
    const inventoried = SAMPLE_ASSETS.filter((asset) => asset.inventoried).length;
    const expiredLicenses = SAMPLE_ASSETS.filter(
      (asset) =>
        asset.category === "licenses" || asset.category === "software"
          ? asset.licenseExpiry && new Date(asset.licenseExpiry) < new Date()
          : false,
    ).length;

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
    <section className="mt-12 space-y-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          Gestão de Ativos Corporativos
        </h2>
        <p className="text-slate-600 max-w-3xl">
          Visualize o parque tecnológico por categoria, acompanhe o ciclo de vida de cada ativo,
          monitore indicadores operacionais e antecipe ações de manutenção ou renovação de licenças.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ativos inventariados</CardTitle>
            <CardDescription>Percentual em relação ao parque total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">
              {indicators.inventoriedPercent}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Licenças vencidas</CardTitle>
            <CardDescription>Softwares e contratos que exigem renovação imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-rose-500">
              {indicators.expiredLicenses}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tempo médio de atualização</CardTitle>
            <CardDescription>Intervalo entre manutenção planejada (em dias)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-indigo-600">
              {indicators.averageUpdateTime ? `${indicators.averageUpdateTime}d` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ciclo de vida do ativo</CardTitle>
          <CardDescription>
            Acompanhe a maturidade e as responsabilidades de sua operação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {(Object.keys(LIFECYCLE_LABEL) as LifecycleStage[]).map((stage) => (
              <div
                key={stage}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm"
              >
                <h3 className="font-semibold text-slate-800">
                  {LIFECYCLE_LABEL[stage]}
                </h3>
                <p className="mt-2 text-slate-600 text-xs leading-relaxed">
                  {LIFECYCLE_DESCRIPTION[stage]}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {(Object.keys(groupedAssets) as AssetCategory[]).map((category) => {
          const assets = groupedAssets[category];
          if (!assets.length) return null;

          return (
            <Card key={category}>
              <CardHeader className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{CATEGORY_LABEL[category]}</CardTitle>
                  <CardDescription>{assets.length} ativos catalogados</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Etapa atual</TableHead>
                      <TableHead>Última manutenção</TableHead>
                      <TableHead>Próxima ação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Inventário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => {
                      const statusMeta = STATUS_BADGE[asset.status];
                      const nextAction = asset.licenseExpiry
                        ? `Renovar até ${formatDate(asset.licenseExpiry)}`
                        : formatDate(asset.nextMaintenanceDate);

                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.id}</TableCell>
                          <TableCell className="max-w-xs">
                            <p className="font-medium text-slate-800">{asset.name}</p>
                            <p className="text-xs text-slate-500">Adquirido em {formatDate(asset.acquisitionDate)}</p>
                          </TableCell>
                          <TableCell>{asset.assignedTo ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{LIFECYCLE_LABEL[asset.lifecycleStage]}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(asset.lastMaintenanceDate)}</TableCell>
                          <TableCell>{nextAction}</TableCell>
                          <TableCell>
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={asset.inventoried ? "default" : "outline"}>
                              {asset.inventoried ? "Inventariado" : "Pendente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default AssetManagement;
