import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportTicketsDashboard } from "@/components/support/support-tickets-dashboard"

export default async function SupportPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: viewerProfile } = user
    ? await supabase.from("users").select("*").eq("id", user.id).maybeSingle()
    : { data: null }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
    .order("created_at", { ascending: false })

  const { data: users } = await supabase.from("users").select("*").in("role", ["support", "admin"])

  return (
    <SupportTicketsDashboard
      initialTickets={tickets || []}
      supportUsers={users || []}
    />
  )
}
