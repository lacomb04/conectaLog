import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportDashboard } from "@/components/support/support-dashboard"

export default async function SupportPage() {
  const supabase = await getSupabaseServerClient()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")
    .order("created_at", { ascending: false })

  const { data: users } = await supabase.from("users").select("*").in("role", ["support", "admin"])

  return <SupportDashboard initialTickets={tickets || []} supportUsers={users || []} />
}
