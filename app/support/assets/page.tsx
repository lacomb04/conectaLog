import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportAssetsDashboard } from "@/components/support/support-assets-dashboard"

export default async function SupportAssetsPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: viewerProfile } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle()

  if (!viewerProfile || (viewerProfile.role !== "support" && viewerProfile.role !== "admin")) {
    redirect("/employee")
  }

  let assetsQuery = supabase
    .from("assets")
    .select(
      "*, support_owner_profile:users!assets_support_owner_fkey(id, full_name, email, role)",
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true })

  if (viewerProfile?.role === "support") {
    assetsQuery = assetsQuery.eq("support_owner", viewerProfile.id)
  }

  const { data: assignedAssets } = await assetsQuery

  return <SupportAssetsDashboard assignedAssets={assignedAssets || []} currentUser={viewerProfile} />
}
