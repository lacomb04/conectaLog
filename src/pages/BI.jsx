import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import supabase from "../services/supabaseClient";

const metrics = [
  { label: "Chamados abertos", value: 42, delta: "+8,2%", tone: "info" },
  { label: "Tempo médio de resposta", value: "37 min", delta: "-12 min", tone: "success" },
  { label: "Satisfação (CSAT)", value: "91%", delta: "+3 pts", tone: "success" },
  { label: "Backlog crítico", value: 4, delta: "+1", tone: "danger" },
];

const trendData = [
  { month: "Jan", value: 68 },
  { month: "Fev", value: 72 },
  { month: "Mar", value: 64 },
  { month: "Abr", value: 59 },
  { month: "Mai", value: 53 },
  { month: "Jun", value: 48 },
];

const categoryData = [
  { name: "LogisMax", value: 28 },
  { name: "Hardware", value: 19 },
  { name: "Rede/VPN", value: 14 },
  { name: "Acessos", value: 11 },
  { name: "Outros", value: 9 },
];

const satisfactionNotes = [
  { label: "Muito satisfeito", value: 62, tone: "#22c55e" },
  { label: "Satisfeito", value: 24, tone: "#60a5fa" },
  { label: "Neutro", value: 9, tone: "#facc15" },
  { label: "Insatisfeito", value: 5, tone: "#f97316" },
];

const PageShell = styled.div`
  padding: 24px;
  display: grid;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  color: #0f172a;
`;

const BackLink = styled(Link)`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: #1f2937;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.18s ease, border 0.18s ease;
  &:hover {
    border-color: #6366f1;
    background: #eef2ff;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
`;

const MetricCard = styled.div`
  background: #fff;
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  padding: 20px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 12px;
`;

const MetricLabel = styled.span`
  font-size: 0.85rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricValue = styled.span`
  font-size: 1.9rem;
  font-weight: 700;
  color: #0f172a;
`;

const MetricDelta = styled.span`
  font-weight: 600;
  color: ${({ tone }) =>
    tone === "success" ? "#16a34a" : tone === "danger" ? "#dc2626" : "#2563eb"};
`;

const Panel = styled.section`
  background: rgba(248, 250, 252, 0.85);
  border-radius: 26px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 24px;
  backdrop-filter: blur(8px);
  box-shadow: 0 26px 56px rgba(15, 23, 42, 0.1);
  display: grid;
  gap: 18px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  color: #0f172a;
`;

const TrendCanvas = styled.div`
  display: grid;
  grid-template-columns: repeat(${trendData.length}, 1fr);
  gap: 12px;
  align-items: end;
  height: 180px;
`;

const TrendBar = styled.div`
  position: relative;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.9), rgba(99, 102, 241, 0.2));
  border-radius: 12px 12px 4px 4px;
  height: ${({ size }) => size}%;
  transition: transform 0.18s ease;
  &:hover {
    transform: translateY(-4px);
  }
  &::after {
    content: attr(data-month);
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.78rem;
    color: #64748b;
  }
`;

const CategoryList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
`;

const CategoryItem = styled.li`
  display: grid;
  gap: 6px;
`;

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: #0f172a;
  font-weight: 600;
`;

const CategoryBar = styled.div`
  height: 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.18);
  position: relative;
  overflow: hidden;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    width: ${({ size }) => size}%;
    border-radius: inherit;
    background: linear-gradient(135deg, #6366f1, #4338ca);
    transition: width 0.2s ease;
  }
`;

const SatisfactionGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
`;

const SatisfactionCard = styled.div`
  background: #fff;
  border-radius: 20px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  text-align: center;
`;

const SatisfactionValue = styled.span`
  display: block;
  margin-top: 6px;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ tone }) => tone};
`;

const InsightsPanel = styled(Panel)`
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const Insight = styled.div`
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 18px;
  display: grid;
  gap: 8px;
`;

const InsightTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
`;

const InsightText = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
`;

export default function BI() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadBI() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, status, priority, category, created_at, updated_at, first_response_at, resolved_at"
        )
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("[BI] Erro ao buscar tickets:", error);
        setError("Não foi possível carregar os dados de BI.");
        setSummary(null);
        setTrendData([]);
        setCategoryData([]);
        setStatusBreakdown([]);
        setInsights([]);
        setLoading(false);
        return;
      }

      const computed = computeMetrics(data || []);
      setSummary(computed.summary);
      setTrendData(computed.trend);
      setCategoryData(computed.categories);
      setStatusBreakdown(computed.status);
      setInsights(computed.insights);
      setLoading(false);
    }

    loadBI();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (!summary) return [];
    const { totals, tempos, indicadores, comparativos } = summary;
    return [
      {
        label: "Chamados totais",
        value: totals.total,
        delta: formatDelta(comparativos.mesAtual, comparativos.mesAnterior),
        tone: comparativos.mesAtual >= comparativos.mesAnterior ? "info" : "danger",
      },
      {
        label: "Ativos na fila",
        value: totals.ativos,
        delta: formatDelta(totals.ativos, totals.total - totals.ativos),
        tone: totals.ativos <= totals.total / 2 ? "success" : "danger",
      },
      {
        label: "Tempo médio de resposta",
        value: formatMinutes(tempos.resposta),
        delta: `${tempos.respostaAmostra} atendidos`,
        tone: tempos.resposta ? "success" : "info",
      },
      {
        label: "Tempo médio de resolução",
        value: formatMinutes(tempos.resolucao),
        delta: `${tempos.resolucaoAmostra} resolvidos`,
        tone: tempos.resolucao ? "success" : "info",
      },
      {
        label: "CSAT estimado",
        value: `${indicadores.csat}%`,
        delta: `${indicadores.resolvidos} de ${totals.total}`,
        tone: indicadores.csat >= 80 ? "success" : indicadores.csat >= 60 ? "info" : "danger",
      },
      {
        label: "Backlog crítico",
        value: totals.criticos,
        delta: totals.criticos ? "Priorizar" : "Sem risco",
        tone: totals.criticos ? "danger" : "success",
      },
    ];
  }, [summary]);

  const maxTrend = useMemo(
    () => trendData.reduce((max, item) => Math.max(max, item.value), 0),
    [trendData]
  );
  const maxCategory = useMemo(
    () => categoryData.reduce((max, item) => Math.max(max, item.value), 0),
    [categoryData]
  );

  const loadingState = loading;
  const emptyState = !loading && (!summary || summary.totals.total === 0);

  return (
    <PageShell>
      <Header>
        <div>
          <Title>Business Intelligence</Title>
          <p style={{ color: "#64748b", marginTop: 4 }}>
            Painel consolidado de performance do suporte.
          </p>
        </div>
        <BackLink to="/">Voltar</BackLink>
      </Header>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {loadingState && <p>Carregando métricas...</p>}
      {emptyState && !loadingState && <p>Sem dados de chamados para exibir.</p>}

      {!loadingState && !emptyState && (
        <>
          <MetricsGrid>
            {metrics.map((metric) => (
              <MetricCard key={metric.label}>
                <MetricLabel>{metric.label}</MetricLabel>
                <MetricValue>{metric.value}</MetricValue>
                <MetricDelta tone={metric.tone}>{metric.delta}</MetricDelta>
              </MetricCard>
            ))}
          </MetricsGrid>

          <Panel>
            <PanelTitle>Volume de chamados (últimos 6 meses)</PanelTitle>
            <TrendCanvas>
              {trendData.map((point) => (
                <TrendBar
                  key={point.month}
                  size={maxTrend ? Math.round((point.value / maxTrend) * 100) : 0}
                  data-month={point.month}
                  title={`${point.value} chamados`}
                />
              ))}
            </TrendCanvas>
          </Panel>

          <Panel>
            <PanelTitle>Distribuição por categoria</PanelTitle>
            <CategoryList>
              {categoryData.map((category) => (
                <CategoryItem key={category.name}>
                  <CategoryHeader>
                    <span>{category.name}</span>
                    <span>{category.value}</span>
                  </CategoryHeader>
                  <CategoryBar
                    size={maxCategory ? Math.round((category.value / maxCategory) * 100) : 0}
                  />
                </CategoryItem>
              ))}
            </CategoryList>
          </Panel>

          <Panel>
            <PanelTitle>Status dos chamados</PanelTitle>
            <SatisfactionGrid>
              {statusBreakdown.map((item) => (
                <SatisfactionCard key={item.label}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {item.label}
                  </span>
                  <SatisfactionValue tone={item.tone}>{item.value}%</SatisfactionValue>
                </SatisfactionCard>
              ))}
            </SatisfactionGrid>
          </Panel>

          {insights.length > 0 && (
            <InsightsPanel>
              {insights.map((insight) => (
                <Insight key={insight.title}>
                  <InsightTitle>{insight.title}</InsightTitle>
                  <InsightText>{insight.text}</InsightText>
                </Insight>
              ))}
            </InsightsPanel>
          )}
        </>
      )}
    </PageShell>
  );
}

function computeMetrics(tickets) {
  if (!tickets.length) {
    return {
      summary: null,
      trend: [],
      categories: [],
      status: [],
      insights: [],
    };
  }

  const activeStatuses = ["open", "in_progress", "waiting"];
  const statusCounts = {
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  };
  const categoryCounts = {};
  const responseTimes = [];
  const resolutionTimes = [];

  tickets.forEach((ticket) => {
    if (statusCounts[ticket.status] != null) {
      statusCounts[ticket.status] += 1;
    }
    const categoryKey = ticket.category || "Outros";
    categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1;

    if (ticket.first_response_at) {
      const diff =
        new Date(ticket.first_response_at).getTime() -
        new Date(ticket.created_at).getTime();
      if (diff > 0) responseTimes.push(diff);
    }
    if (ticket.resolved_at) {
      const diff =
        new Date(ticket.resolved_at).getTime() -
        new Date(ticket.created_at).getTime();
      if (diff > 0) resolutionTimes.push(diff);
    }
  });

  const totals = {
    total: tickets.length,
    ativos:
      statusCounts.open + statusCounts.in_progress + statusCounts.waiting,
    resolvidos: statusCounts.resolved + statusCounts.closed,
    criticos: tickets.filter(
      (t) => t.priority === "critical" && activeStatuses.includes(t.status)
    ).length,
  };

  const tempos = {
    resposta: responseTimes.length
      ? responseTimes.reduce((acc, cur) => acc + cur, 0) / responseTimes.length / 60000
      : 0,
    respostaAmostra: responseTimes.length,
    resolucao: resolutionTimes.length
      ? resolutionTimes.reduce((acc, cur) => acc + cur, 0) / resolutionTimes.length / 60000
      : 0,
    resolucaoAmostra: resolutionTimes.length,
  };

  const indicadores = {
    csat: totals.total
      ? Math.round((totals.resolvidos / totals.total) * 100)
      : 0,
    resolvidos: totals.resolvidos,
  };

  const trendBuckets = buildTrendBuckets();
  const monthIndex = trendBuckets.reduce((acc, bucket, idx) => {
    acc[bucket.key] = idx;
    return acc;
  }, {});
  tickets.forEach((ticket) => {
    const d = new Date(ticket.created_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (monthIndex[key] != null) {
      trendBuckets[monthIndex[key]].value += 1;
    }
  });

  const categories = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const statusTotal = Object.values(statusCounts).reduce((acc, cur) => acc + cur, 0) || 1;
  const status = [
    {
      label: "Abertos",
      value: Math.round((statusCounts.open / statusTotal) * 100),
      tone: "#f97316",
    },
    {
      label: "Em andamento",
      value: Math.round((statusCounts.in_progress / statusTotal) * 100),
      tone: "#60a5fa",
    },
    {
      label: "Aguardando",
      value: Math.round((statusCounts.waiting / statusTotal) * 100),
      tone: "#facc15",
    },
    {
      label: "Encerrados",
      value: Math.round(((statusCounts.resolved + statusCounts.closed) / statusTotal) * 100),
      tone: "#22c55e",
    },
  ];

  const comparativos = {
    mesAtual: trendBuckets[trendBuckets.length - 1]?.value || 0,
    mesAnterior: trendBuckets[trendBuckets.length - 2]?.value || 0,
  };

  const insights = [];
  if (categories[0]) {
    insights.push({
      title: "Categoria com maior demanda",
      text: `"${categories[0].name}" concentra ${categories[0].value} chamados no período analisado.`,
    });
  }
  if (totals.criticos) {
    insights.push({
      title: "Backlog crítico",
      text: `Existem ${totals.criticos} chamados críticos ainda sem resolução. Avalie priorizar esta fila.`,
    });
  }
  if (tempos.resolucao && tempos.resposta && tempos.resolucao > tempos.resposta * 3) {
    insights.push({
      title: "Tempo de resolução elevado",
      text: `As resoluções têm levado em média ${formatMinutes(tempos.resolucao)} contra ${formatMinutes(
        tempos.resposta
      )} de resposta inicial. Revise o fluxo pós-atendimento.`,
    });
  }

  return {
    summary: { totals, tempos, indicadores, comparativos },
    trend: trendBuckets.map(({ label, value }) => ({ month: label, value })),
    categories,
    status,
    insights,
  };
}

function buildTrendBuckets() {
  const now = new Date();
  const buckets = [];
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth() + 1}`,
      label: date.toLocaleString("pt-BR", { month: "short" }),
      value: 0,
    });
  }
  return buckets;
}

function formatMinutes(minutes) {
  if (!minutes) return "–";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hrs) return `${mins} min`;
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function formatDelta(current, previous) {
  if (!previous) return current ? `+${current}` : "0";
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}
