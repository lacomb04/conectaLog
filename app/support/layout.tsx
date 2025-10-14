import type React from "react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SupportNav } from "@/components/support/support-nav"

export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <div className="min-h-screen bg-background">
      <SupportNav user={profile} />
      <main className="container mx-auto py-6 px-4">{children}</main>
    </div>
  )
}
