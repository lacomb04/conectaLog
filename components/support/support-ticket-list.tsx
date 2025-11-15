"use client"

import { useState } from "react"
import type { Ticket } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Search } from "lucide-react"

interface SupportTicketListProps {
  tickets: Ticket[]
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

export function SupportTicketList({ tickets }: SupportTicketListProps) {
  const [search, setSearch] = useState("")

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número, título ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum ticket encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <Link key={ticket.id} href={`/support/tickets/${ticket.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                        <Badge className={priorityColors[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                        <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{ticket.title}</h3>
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
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Criado por: {ticket.creator?.full_name}</span>
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {ticket.assignee && <span>Atribuído a: {ticket.assignee.full_name}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
