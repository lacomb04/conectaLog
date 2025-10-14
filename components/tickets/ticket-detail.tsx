"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import type { Ticket, Message, User, TicketHistory } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Send, Clock, UserIcon, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface TicketDetailProps {
  ticket: Ticket
  initialMessages: Message[]
  currentUser: User
  isSupport: boolean
  history?: TicketHistory[]
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

export function TicketDetail({ ticket, initialMessages, currentUser, isSupport, history }: TicketDetailProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        async (payload) => {
          console.log("[v0] New message received:", payload)

          const { data: newMessage } = await supabase
            .from("messages")
            .select("*, user:users(*)")
            .eq("id", payload.new.id)
            .single()

          if (newMessage) {
            // Only show message if user has permission to see it
            if (!newMessage.is_internal || isSupport) {
              setMessages((prev) => [...prev, newMessage])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, ticket.id, isSupport])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)

    try {
      const { error } = await supabase.from("messages").insert({
        ticket_id: ticket.id,
        user_id: currentUser.id,
        message: newMessage,
        is_internal: isSupport && isInternal,
      })

      if (error) throw error

      // Update responded_at if this is the first response from support
      if (isSupport && !ticket.responded_at) {
        await supabase
          .from("tickets")
          .update({
            responded_at: new Date().toISOString(),
          })
          .eq("id", ticket.id)
      }

      setNewMessage("")
      setIsInternal(false)
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const slaResponseTime = ticket.sla_response_time
    ? `${Math.floor(ticket.sla_response_time / 60)}h ${ticket.sla_response_time % 60}m`
    : "N/A"
  const slaResolutionTime = ticket.sla_resolution_time
    ? `${Math.floor(ticket.sla_resolution_time / 60)}h ${ticket.sla_resolution_time % 60}m`
    : "N/A"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
                    <Badge className={priorityColors[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
                    <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                  </div>
                  <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Descrição</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Criado por:</span>
                    <p className="font-medium">{ticket.creator?.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado em:</span>
                    <p className="font-medium">
                      {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {ticket.assignee && (
                    <div>
                      <span className="text-muted-foreground">Atribuído a:</span>
                      <p className="font-medium">{ticket.assignee.full_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Categoria:</span>
                    <p className="font-medium capitalize">{ticket.category}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Conversação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Messages */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma mensagem ainda</p>
                  ) : (
                    messages.map((message) => {
                      const isCurrentUser = message.user_id === currentUser.id
                      return (
                        <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] ${isCurrentUser ? "items-end" : "items-start"} flex flex-col gap-1`}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {message.is_internal && (
                                <Lock className="h-3 w-3 text-yellow-600" title="Mensagem interna" />
                              )}
                              <span className="font-medium">{message.user?.full_name}</span>
                              <span>
                                {formatDistanceToNow(new Date(message.created_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : message.is_internal
                                    ? "bg-yellow-500/10 border border-yellow-500/20"
                                    : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    disabled={sending}
                  />
                  <div className="flex items-center justify-between">
                    {isSupport && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="internal"
                          checked={isInternal}
                          onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                        />
                        <Label htmlFor="internal" className="text-sm cursor-pointer">
                          Mensagem interna (apenas suporte)
                        </Label>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className={!isSupport ? "w-full" : ""}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SLA Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Tempo de Resposta</span>
                </div>
                <p className="text-lg font-semibold">{slaResponseTime}</p>
                {ticket.response_deadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prazo: {format(new Date(ticket.response_deadline), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
                {ticket.responded_at && (
                  <Badge className="mt-2 bg-green-500/10 text-green-700 dark:text-green-400">Respondido</Badge>
                )}
              </div>
              <Separator />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Tempo de Resolução</span>
                </div>
                <p className="text-lg font-semibold">{slaResolutionTime}</p>
                {ticket.resolution_deadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prazo: {format(new Date(ticket.resolution_deadline), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
                {ticket.resolved_at && (
                  <Badge className="mt-2 bg-green-500/10 text-green-700 dark:text-green-400">Resolvido</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* History (Support only) */}
          {isSupport && history && history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex items-start gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{item.user?.full_name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.action.replace("_", " ")}
                            {item.old_value && item.new_value && (
                              <>
                                : {item.old_value} → {item.new_value}
                              </>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
