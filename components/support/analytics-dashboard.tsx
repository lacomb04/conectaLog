"use client"

import { useMemo } from "react"
import type { Ticket } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, Clock, CheckCircle2, Users, Activity, Target } from "lucide-react"

interface AnalyticsDashboardProps {
  tickets: Ticket[]
  stats: any
}

const COLORS = {
  primary: "hsl(var(--primary))",
  blue: "#3b82f6",
  purple: "#a855f7",
  yellow: "#eab308",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f97316",
  gray: "#6b7280",
}

export function AnalyticsDashboard({ tickets, stats }: AnalyticsDashboardProps) {
  const analytics = useMemo(() => {
    // Status distribution
    const statusData = [
      { name: "Aberto", value: tickets.filter((t) => t.status === "open").length, color: COLORS.blue },
      { name: "Em Andamento", value: tickets.filter((t) => t.status === "in_progress").length, color: COLORS.purple },
      {
        name: "Aguardando",
        value: tickets.filter((t) => t.status === "waiting_response").length,
        color: COLORS.yellow,
      },
      { name: "Resolvido", value: tickets.filter((t) => t.status === "resolved").length, color: COLORS.green },
      { name: "Fechado", value: tickets.filter((t) => t.status === "closed").length, color: COLORS.gray },
    ]

    // Priority distribution
    const priorityData = [
      { name: "Baixa", value: tickets.filter((t) => t.priority === "low").length, color: COLORS.blue },
      { name: "Média", value: tickets.filter((t) => t.priority === "medium").length, color: COLORS.yellow },
      { name: "Alta", value: tickets.filter((t) => t.priority === "high").length, color: COLORS.orange },
      { name: "Crítica", value: tickets.filter((t) => t.priority === "critical").length, color: COLORS.red },
    ]

    // Category distribution
    const categoryData = [
      { name: "Hardware", value: tickets.filter((t) => t.category === "hardware").length },
      { name: "Software", value: tickets.filter((t) => t.category === "software").length },
      { name: "Rede", value: tickets.filter((t) => t.category === "network").length },
      { name: "Acesso", value: tickets.filter((t) => t.category === "access").length },
      { name: "Outro", value: tickets.filter((t) => t.category === "other").length },
    ]

    // Tickets over time (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split("T")[0]
    })

    const ticketsOverTime = last7Days.map((date) => {
      const dayTickets = tickets.filter((t) => t.created_at.startsWith(date))
      return {
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        tickets: dayTickets.length,
        resolved: dayTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
      }
    })

    // Response time analysis
    const respondedTickets = tickets.filter((t) => t.responded_at)
    const avgResponseTime =
      respondedTickets.length > 0
        ? respondedTickets.reduce((acc, t) => {
            const diff = new Date(t.responded_at!).getTime() - new Date(t.created_at).getTime()
            return acc + diff / (1000 * 60) // minutes
          }, 0) / respondedTickets.length
        : 0

    // Resolution time analysis
    const resolvedTickets = tickets.filter((t) => t.resolved_at)
    const avgResolutionTime =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, t) => {
            const diff = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()
            return acc + diff / (1000 * 60) // minutes
          }, 0) / resolvedTickets.length
        : 0

    // SLA compliance
    const slaResponseBreached = tickets.filter(
      (t) => t.responded_at && t.response_deadline && new Date(t.responded_at) > new Date(t.response_deadline),
    ).length

    const slaResolutionBreached = tickets.filter(
      (t) => t.resolved_at && t.resolution_deadline && new Date(t.resolved_at) > new Date(t.resolution_deadline),
    ).length

    const slaResponseCompliance =
      respondedTickets.length > 0
        ? ((respondedTickets.length - slaResponseBreached) / respondedTickets.length) * 100
        : 0

    const slaResolutionCompliance =
      resolvedTickets.length > 0 ? ((resolvedTickets.length - slaResolutionBreached) / resolvedTickets.length) * 100 : 0

    // Agent performance
    const agentPerformance = tickets
      .filter((t) => t.assigned_to)
      .reduce(
        (acc, ticket) => {
          const agentId = ticket.assigned_to!
          if (!acc[agentId]) {
            acc[agentId] = {
              name: ticket.assignee?.full_name || "Unknown",
              total: 0,
              resolved: 0,
              avgTime: 0,
              times: [],
            }
          }
          acc[agentId].total++
          if (ticket.status === "resolved" || ticket.status === "closed") {
            acc[agentId].resolved++
            if (ticket.resolved_at) {
              const time =
                (new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60)
              acc[agentId].times.push(time)
            }
          }
          return acc
        },
        {} as Record<string, any>,
      )

    const agentStats = Object.values(agentPerformance).map((agent: any) => ({
      name: agent.name,
      total: agent.total,
      resolved: agent.resolved,
      avgTime: agent.times.length > 0 ? agent.times.reduce((a: number, b: number) => a + b, 0) / agent.times.length : 0,
    }))

    return {
      statusData,
      priorityData,
      categoryData,
      ticketsOverTime,
      avgResponseTime,
      avgResolutionTime,
      slaResponseCompliance,
      slaResolutionCompliance,
      agentStats,
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === "open").length,
      resolvedTickets: resolvedTickets.length,
      criticalTickets: tickets.filter((t) => t.priority === "critical").length,
    }
  }, [tickets])

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & BI</h1>
        <p className="text-muted-foreground mt-1">Análise completa de desempenho e métricas</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Todos os chamados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(analytics.avgResponseTime)}</div>
            <div className="flex items-center gap-1 mt-1">
              <Target className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">
                SLA: {analytics.slaResponseCompliance.toFixed(1)}% cumprido
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Resolução</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(analytics.avgResolutionTime)}</div>
            <div className="flex items-center gap-1 mt-1">
              <Target className="h-3 w-3 text-green-500" />
              <p className="text-xs text-muted-foreground">
                SLA: {analytics.slaResolutionCompliance.toFixed(1)}% cumprido
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalTickets > 0 ? ((analytics.resolvedTickets / analytics.totalTickets) * 100).toFixed(1) : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.resolvedTickets} de {analytics.totalTickets} resolvidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Desempenho</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>Status atual de todos os tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Prioridade</CardTitle>
                <CardDescription>Prioridade dos tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Tickets por Categoria</CardTitle>
                <CardDescription>Distribuição de tickets por tipo de problema</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Tickets Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Tickets nos Últimos 7 Dias</CardTitle>
                <CardDescription>Criação e resolução de tickets ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.ticketsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tickets" stroke={COLORS.blue} name="Criados" strokeWidth={2} />
                    <Line type="monotone" dataKey="resolved" stroke={COLORS.green} name="Resolvidos" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* SLA Compliance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cumprimento de SLA - Resposta</CardTitle>
                  <CardDescription>Percentual de tickets respondidos dentro do prazo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">
                        {analytics.slaResponseCompliance.toFixed(1)}%
                      </div>
                      <p className="text-muted-foreground mt-2">Dentro do SLA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cumprimento de SLA - Resolução</CardTitle>
                  <CardDescription>Percentual de tickets resolvidos dentro do prazo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">
                        {analytics.slaResolutionCompliance.toFixed(1)}%
                      </div>
                      <p className="text-muted-foreground mt-2">Dentro do SLA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho dos Agentes</CardTitle>
              <CardDescription>Métricas individuais de cada agente de suporte</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.agentStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum agente com tickets atribuídos</p>
              ) : (
                <div className="space-y-4">
                  {analytics.agentStats.map((agent, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">{agent.name}</h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {agent.resolved}/{agent.total} resolvidos
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="text-lg font-semibold">{agent.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Taxa de Resolução</p>
                          <p className="text-lg font-semibold">
                            {agent.total > 0 ? ((agent.resolved / agent.total) * 100).toFixed(0) : 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tempo Médio</p>
                          <p className="text-lg font-semibold">{formatTime(agent.avgTime)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
