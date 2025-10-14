"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { TicketPriority, TicketCategory } from "@/lib/types"

export function NewTicketForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("medium")
  const [category, setCategory] = useState<TicketCategory>("other")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Usuário não autenticado")

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title,
          description,
          priority,
          category,
          status: "open",
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Ticket criado com sucesso!",
        description: `Número do ticket: ${data.ticket_number}`,
      })

      router.push("/employee")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro ao criar ticket",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título do Problema</Label>
        <Input
          id="title"
          placeholder="Ex: Computador não liga"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição Detalhada</Label>
        <Textarea
          id="description"
          placeholder="Descreva o problema com o máximo de detalhes possível..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as TicketCategory)}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hardware">Hardware</SelectItem>
              <SelectItem value="software">Software</SelectItem>
              <SelectItem value="network">Rede</SelectItem>
              <SelectItem value="access">Acesso</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Criando..." : "Criar Ticket"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
