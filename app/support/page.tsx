import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportDashboard } from "@/components/support/support-dashboard"

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

  let assetsQuery = supabase
    .from("assets")
    .select(
      "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)"
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (viewerProfile?.role === "support") {
    assetsQuery = assetsQuery.eq("support_owner", viewerProfile.id)
  }

  const { data: assignedAssets } = await assetsQuery

  return (
    <SupportDashboard
      initialTickets={tickets || []}
      supportUsers={users || []}
      assignedAssets={assignedAssets || []}
      currentUser={viewerProfile || null}
    />
  )
}
