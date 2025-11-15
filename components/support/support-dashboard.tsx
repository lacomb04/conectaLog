"use client"

import { type ChangeEvent, type ComponentType, useCallback, useEffect, useMemo, useState } from "react"
import type { Asset, Ticket, User } from "@/lib/types"
import { buildAssetIndicators, normalizeAssetFilter } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface SupportDashboardProps {
  initialTickets: Ticket[]
  supportUsers: User[]
  assignedAssets: Asset[]
  currentUser: User | null
}

const priorityColors: Record<Ticket["priority"], string> = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400",
}

const priorityLabels: Record<Ticket["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
}

const statusColors: Record<Ticket["status"], string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  waiting_response: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
}

const statusLabels: Record<Ticket["status"], string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_response: "Aguardando Resposta",
  resolved: "Resolvido",
  closed: "Fechado",
}

const statusIcons: Record<Ticket["status"], ComponentType<any>> = {
  open: AlertCircle,
  in_progress: Clock,
  waiting_response: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
}

const assetCategoryLabels: Record<string, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Rede",
  peripherals: "Periféricos",
  licenses: "Licenças",
  mobile: "Dispositivos móveis",
}

const assetStatusMeta: Record<string, { label: string; className: string }> = {
  "em uso": {
    label: "Em uso",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  "em manutenção": {
    label: "Em manutenção",
    className: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  planejado: {
    label: "Planejado",
    className: "bg-sky-500/10 text-sky-700 border-sky-200",
  },
  obsoleto: {
    label: "Obsoleto",
    className: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
}

export function SupportDashboard({ initialTickets, supportUsers, assignedAssets, currentUser }: SupportDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [trackedAssets, setTrackedAssets] = useState<Asset[]>(() => assignedAssets ?? [])
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all")
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all")
  const [assetSearch, setAssetSearch] = useState<string>("")
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  const formatAssetDate = useCallback((value?: string | null) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "—"
    return new Intl.DateTimeFormat("pt-BR").format(parsed)
  }, [])

  const sortAssets = useCallback((list: Asset[]) => {
    return [...list].sort((a, b) => {
      const categoryCompare = (a.category || "").localeCompare(b.category || "")
      if (categoryCompare !== 0) return categoryCompare
      return a.name.localeCompare(b.name)
    })
  }, [])

  const upsertTrackedAsset = useCallback(
    (asset: Asset) => {
      setTrackedAssets((prev) => {
        const index = prev.findIndex((item) => item.id === asset.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = asset
          return sortAssets(next)
        }
        return sortAssets([...prev, asset])
      })
    },
    [sortAssets],
  )

  const removeTrackedAsset = useCallback((assetId: string) => {
    setTrackedAssets((prev) => prev.filter((asset) => asset.id !== assetId))
  }, [])

  const nextActionLabel = useCallback(
    (asset: Asset) => {
      if (asset.license_expiry) {
        return `Renovar licença até ${formatAssetDate(asset.license_expiry)}`
      }
      if (asset.next_maintenance_date) {
        return `Planejar manutenção em ${formatAssetDate(asset.next_maintenance_date)}`
      }
      if (asset.last_maintenance_date) {
        return `Última manutenção em ${formatAssetDate(asset.last_maintenance_date)}`
      }
      return "Nenhuma ação futura registrada"
    },
    [formatAssetDate],
  )

  const filteredAssets = useMemo(
    () =>
      normalizeAssetFilter(trackedAssets, {
        term: assetSearch,
        category: assetCategoryFilter,
        status: assetStatusFilter,
      }),
    [trackedAssets, assetCategoryFilter, assetStatusFilter, assetSearch],
  )

  useEffect(() => {
    setTrackedAssets(sortAssets(assignedAssets ?? []))
  }, [assignedAssets, sortAssets])

  useEffect(() => {
    const channel = supabase
      .channel("tickets-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        async (payload: any) => {
          console.log("[v0] Real-time ticket update:", payload)

          if (payload.eventType === "INSERT") {
            const { data: newTicket } = await supabase
              .from("tickets")
              .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
              .eq("id", payload.new.id)
              .single()

            if (newTicket) {
              setTickets((prev) => [newTicket, ...prev])
              toast({
                title: "Novo ticket criado!",
                description: `${newTicket.ticket_number}: ${newTicket.title}`,
              })
            }
          } else if (payload.eventType === "UPDATE") {
            const { data: updatedTicket } = await supabase
              .from("tickets")
              .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
              .eq("id", payload.new.id)
              .single()

            if (updatedTicket) {
              setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)))
            }
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, toast])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    const channel = supabase
      .channel(`assets-owner-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assets",
        },
        async (payload: any) => {
          const newOwner = payload.new?.support_owner ?? null
          const previousOwner = payload.old?.support_owner ?? null

          if (payload.eventType === "DELETE") {
            if (payload.old?.id && previousOwner === currentUser.id) {
              removeTrackedAsset(payload.old.id as string)
            }
            return
          }

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (newOwner === currentUser.id) {
              const { data, error } = await supabase
                .from("assets")
                .select(
                  "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)"
                )
                .eq("id", payload.new?.id)
                .maybeSingle()

              if (error) {
                console.warn("[support] Falha ao sincronizar ativo:", error.message)
                return
              }

              if (data) {
                upsertTrackedAsset(data as Asset)
              }
            } else if (previousOwner === currentUser.id && payload.new?.id) {
              removeTrackedAsset(payload.new.id as string)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUser, removeTrackedAsset, upsertTrackedAsset])

  const handleAssign = async (ticketId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: userId,
          status: "in_progress",
        })
        .eq("id", ticketId)

      if (error) throw error

      toast({
        title: "Ticket atribuído com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir ticket",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      if (newStatus === "closed") {
        const current = tickets.find((t) => t.id === ticketId)
        if (current && current.status !== "closed") {
          toast({
            title: "Aguarde a confirmação do colaborador",
            description: "Somente o funcionário pode encerrar o ticket após avaliar a solução.",
            variant: "destructive",
          })
          return
        }
      }

      const updateData: any = { status: newStatus }

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString()
      } else if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString()
      }

      const { error } = await supabase.from("tickets").update(updateData).eq("id", ticketId)

      if (error) throw error

      toast({
        title: "Status atualizado!",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus !== "all" && ticket.status !== filterStatus) return false
    if (filterPriority !== "all" && ticket.priority !== filterPriority) return false
    return true
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  }

  const assetsStats = useMemo(() => buildAssetIndicators(filteredAssets), [filteredAssets])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Suporte</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie tickets em andamento e acompanhe os ativos sob responsabilidade da equipe.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="waiting_response">Aguardando Resposta</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status]
            const isOverdue =
              ticket.response_deadline && !ticket.responded_at && new Date(ticket.response_deadline) < new Date()

            return (
              <Card key={ticket.id} className={isOverdue ? "border-red-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge className={priorityColors[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                        <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                        {isOverdue && (
                          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            SLA Vencido
                          </Badge>
                        )}
                      </div>
                      <Link href={`/support/tickets/${ticket.id}`}>
                        <h3 className="text-xl font-semibold hover:text-primary cursor-pointer">{ticket.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                      {ticket.status === "resolved" && (
                        <p className="text-xs text-amber-600 mt-2 font-medium">
                          Aguardando confirmação do colaborador
                        </p>
                      )}
                      {ticket.status === "closed" && ticket.resolution_rating != null && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Avaliação do colaborador: {ticket.resolution_rating}/5
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>Criado por: {ticket.creator?.full_name}</span>
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[200px]">
                      <Select
                        value={ticket.status}
                        onValueChange={(value: Ticket["status"]) => handleStatusChange(ticket.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="waiting_response">Aguardando Resposta</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed" disabled={ticket.status !== "closed"}>
                            Fechado
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={ticket.assigned_to || "unassigned"}
                        onValueChange={(value: string) => handleAssign(ticket.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Atribuir a..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Não atribuído</SelectItem>
                          {supportUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Link href={`/support/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          Ver Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativos atribuídos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventariados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.inventoried}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Licenças a vencer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetsStats.expiringLicense}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Obsoletos / manutenção</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetsStats.obsolete + assetsStats.maintenanceDue}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ativos de TI atribuídos</CardTitle>
          <CardDescription>Monitore os ativos sob sua responsabilidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label htmlFor="asset-search" className="mb-1 block text-xs font-medium text-muted-foreground">
                Buscar
              </label>
              <Input
                id="asset-search"
                placeholder="Código, ativo ou palavra-chave"
                value={assetSearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAssetSearch(event.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="asset-category" className="mb-1 block text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
                <SelectTrigger id="asset-category">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="network">Rede</SelectItem>
                  <SelectItem value="peripherals">Periféricos</SelectItem>
                  <SelectItem value="licenses">Licenças</SelectItem>
                  <SelectItem value="mobile">Dispositivos móveis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label htmlFor="asset-status" className="mb-1 block text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                <SelectTrigger id="asset-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em uso">Em uso</SelectItem>
                  <SelectItem value="em manutenção">Em manutenção</SelectItem>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="obsoleto">Obsoleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ativo atribuído a você no momento.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground md:text-sm">
                <span>Total: {assetsStats.total}</span>
                <span>Inventariados: {assetsStats.inventoried}</span>
                <span>Pendentes: {assetsStats.pendingInventory}</span>
              </div>
              <div className="space-y-3">
                {filteredAssets.map((asset: Asset) => {
                  const statusMeta =
                    assetStatusMeta[asset.status] ?? {
                      label: asset.status,
                      className: "bg-slate-500/10 text-slate-700 border-slate-200",
                    }
                  const inventoryBadgeClass = asset.inventoried
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                    : "bg-amber-500/10 text-amber-700 border-amber-200"

                  return (
                    <div
                      key={asset.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold md:text-base">
                          {asset.asset_code} • {asset.name}
                        </p>
                        <p className="text-xs text-muted-foreground md:text-sm">
                          {assetCategoryLabels[asset.category] ?? asset.category}
                          {asset.location ? ` • ${asset.location}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge variant="outline" className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                        <Badge variant="outline" className={inventoryBadgeClass}>
                          {asset.inventoried ? "Inventariado" : "Inventário pendente"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground md:text-right md:text-sm">
                        <p>{nextActionLabel(asset)}</p>
                        {asset.warranty_expires_at && (
                          <p>Garantia: {formatAssetDate(asset.warranty_expires_at)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
