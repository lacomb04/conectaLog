import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile to determine role
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

  // Redirect based on role
  if (profile?.role === "support" || profile?.role === "admin") {
    redirect("/support")
  } else {
    redirect("/employee")
  }
}
