import { getSupabaseServerClient } from "@/lib/supabase/server"
import { SupportTicketsDashboard } from "@/components/support/support-tickets-dashboard"

export default async function SupportPage() {
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

  redirect("/support/tickets")
}
