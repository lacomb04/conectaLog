import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportTicketList } from "@/components/support/support-ticket-list"

export default async function SupportTicketsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Todos os Tickets</h1>
        <p className="text-muted-foreground mt-1">Visualização completa de todos os chamados</p>
      </div>

      <SupportTicketList tickets={tickets || []} />
    </div>
  )
}
