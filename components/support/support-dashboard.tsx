"use client"

import { useEffect, useState } from "react"
import type { Ticket, User } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface SupportDashboardProps {
  initialTickets: Ticket[]
  supportUsers: User[]
}

const priorityColors = {
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400",
}

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
}

const statusColors = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  waiting_response: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
  closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
}

const statusLabels = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_response: "Aguardando Resposta",
  resolved: "Resolvido",
  closed: "Fechado",
}

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  waiting_response: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
}

export function SupportDashboard({ initialTickets, supportUsers }: SupportDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

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
        async (payload) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Suporte</h1>
        <p className="text-muted-foreground mt-1">Gerencie todos os tickets em tempo real</p>
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
                      <Select value={ticket.status} onValueChange={(value) => handleStatusChange(ticket.id, value)}>
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
                        onValueChange={(value) => handleAssign(ticket.id, value)}
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
    </div>
  )
}
