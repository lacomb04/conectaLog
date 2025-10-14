import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TicketDetail } from "@/components/tickets/ticket-detail"

export default async function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!profile || (profile.role !== "support" && profile.role !== "admin")) {
    redirect("/employee")
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
    .eq("id", id)
    .single()

  if (!ticket) {
    redirect("/support")
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*, user:users(*)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true })

  const { data: history } = await supabase
    .from("ticket_history")
    .select("*, user:users(*)")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true })

  return (
    <TicketDetail
      ticket={ticket}
      initialMessages={messages || []}
      currentUser={profile}
      isSupport={true}
      history={history || []}
    />
  )
}
