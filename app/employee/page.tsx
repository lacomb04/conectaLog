import { getSupabaseServerClient } from "@/lib/supabase/server"
import { TicketList } from "@/components/employee/ticket-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function EmployeePage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Tickets</h1>
          <p className="text-muted-foreground mt-1">Acompanhe seus chamados de suporte</p>
        </div>
        <Link href="/employee/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ticket
          </Button>
        </Link>
      </div>

      <TicketList tickets={tickets || []} />
    </div>
  )
}
