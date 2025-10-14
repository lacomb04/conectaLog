import { getSupabaseServerClient } from "@/lib/supabase/server"
import { AnalyticsDashboard } from "@/components/support/analytics-dashboard"

export default async function AnalyticsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*, creator:users!tickets_created_by_fkey(*), assignee:users!tickets_assigned_to_fkey(*)")

  const { data: stats } = await supabase.from("ticket_stats").select("*").single()

  return <AnalyticsDashboard tickets={tickets || []} stats={stats} />
}
