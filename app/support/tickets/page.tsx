import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SupportTicketsDashboard } from "@/components/support/support-tickets-dashboard"

export default async function SupportTicketsPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle()

  if (!profile || (profile.role !== "support" && profile.role !== "admin")) {
    redirect("/employee")
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
    .order("created_at", { ascending: false })

  const { data: supportUsers } = await supabase
    .from("users")
    .select("*")
    .in("role", ["support", "admin"])
    .order("full_name", { ascending: true })

  return <SupportTicketsDashboard initialTickets={tickets || []} supportUsers={supportUsers || []} />
}
