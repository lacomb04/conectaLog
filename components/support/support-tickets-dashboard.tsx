"use client"

import { type ComponentType, useEffect, useMemo, useState } from "react"
import type { Ticket, User } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { AlertCircle, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select"

interface SupportTicketsDashboardProps {
  initialTickets: Ticket[]
  supportUsers: User[]
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

export function SupportTicketsDashboard({ initialTickets, supportUsers }: SupportTicketsDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [filterStatus, setFilterStatus] = useState<Ticket["status"] | "all">("all")
  const [filterPriority, setFilterPriority] = useState<Ticket["priority"] | "all">("all")
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
        async (payload: any) => {
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
              setTickets((prev) => prev.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket)))
            }
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((ticket) => ticket.id !== payload.old.id))
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
          assigned_to: userId === "unassigned" ? null : userId,
          status: userId === "unassigned" ? "open" : "in_progress",
        })
        .eq("id", ticketId)

      if (error) throw error

      toast({ title: "Ticket atribuído com sucesso!" })
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir ticket",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: Ticket["status"]) => {
    try {
      if (newStatus === "closed") {
        const current = tickets.find((ticket) => ticket.id === ticketId)
        if (current && current.status !== "closed") {
          toast({
            title: "Aguarde a confirmação do colaborador",
            description: "Somente o funcionário pode encerrar o ticket após avaliar a solução.",
            variant: "destructive",
          })
          return
        }
      }

      const updateData: Partial<Ticket> & { status: Ticket["status"]; resolved_at?: string | null; closed_at?: string | null } = {
        status: newStatus,
      }

      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString()
      } else if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString()
      }

      const { error } = await supabase.from("tickets").update(updateData).eq("id", ticketId)

      if (error) throw error

      toast({ title: "Status atualizado!" })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (filterStatus !== "all" && ticket.status !== filterStatus) return false
        if (filterPriority !== "all" && ticket.priority !== filterPriority) return false
        return true
      }),
    [tickets, filterStatus, filterPriority],
  )

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in_progress").length,
      critical: tickets.filter((ticket) => ticket.priority === "critical").length,
    }),
    [tickets],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chamados de Suporte</h1>
        <p className="text-muted-foreground mt-1">
          Monitore a fila de tickets, atualize status e acompanhe prioridades críticas em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine os chamados por status e prioridade.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1 min-w-[200px]">
              <Select value={filterStatus} onValueChange={(value: Ticket["status"] | "all") => setFilterStatus(value)}>
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
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filterPriority}
                onValueChange={(value: Ticket["priority"] | "all") => setFilterPriority(value)}
              >
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

      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum ticket encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const isOverdue =
              ticket.response_deadline && !ticket.responded_at && new Date(ticket.response_deadline) < new Date()

            return (
              <Card key={ticket.id} className={isOverdue ? "border-red-500" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge className={priorityColors[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                        <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                        {isOverdue && (
                          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            SLA Vencido
                          </Badge>
                        )}
                      </div>
                      <Link href={`/support/tickets/${ticket.id}`}>
                        <h3 className="cursor-pointer text-xl font-semibold hover:text-primary">{ticket.title}</h3>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
                      {ticket.status === "resolved" && (
                        <p className="mt-2 text-xs font-medium text-amber-600">Aguardando confirmação do colaborador</p>
                      )}
                      {ticket.status === "closed" && ticket.resolution_rating != null && (
                        <p className="mt-2 text-xs text-muted-foreground">Avaliação do colaborador: {ticket.resolution_rating}/5</p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Criado por: {ticket.creator?.full_name}</span>
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-[200px] flex-col gap-3">
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
    </div>
  )
}
