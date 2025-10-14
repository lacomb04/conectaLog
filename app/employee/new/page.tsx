import { NewTicketForm } from "@/components/employee/new-ticket-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewTicketPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Novo Ticket de Suporte</h1>
        <p className="text-muted-foreground mt-1">Descreva seu problema e nossa equipe irá ajudá-lo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Chamado</CardTitle>
          <CardDescription>Preencha os detalhes para que possamos atendê-lo melhor</CardDescription>
        </CardHeader>
        <CardContent>
          <NewTicketForm />
        </CardContent>
      </Card>
    </div>
  )
}
