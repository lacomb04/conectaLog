import type React from "react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { EmployeeNav } from "@/components/employee/employee-nav"

export default async function EmployeeLayout({
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

  if (!profile) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeNav user={profile} />
      <main className="container mx-auto py-6 px-4">{children}</main>
    </div>
  )
}
