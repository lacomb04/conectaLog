"use client"

import type { Ticket } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react"

interface TicketListProps {
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

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  waiting_response: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
}

export function TicketList({ tickets }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhum ticket</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status]
        return (
          <Link key={ticket.id} href={`/employee/tickets/${ticket.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                      <Badge className={priorityColors[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                    </div>
                    <CardTitle className="text-xl">{ticket.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{ticket.description}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColors[ticket.status]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[ticket.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
