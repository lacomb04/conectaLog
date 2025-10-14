"use client"

import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LifeBuoy, Ticket, LogOut } from "lucide-react"

interface EmployeeNavProps {
  user: User
}

export function EmployeeNav({ user }: EmployeeNavProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/employee" className="flex items-center gap-2 font-semibold text-lg">
              <LifeBuoy className="h-6 w-6 text-primary" />
              <span>Suporte TI</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/employee">
                <Button variant="ghost" size="sm">
                  <Ticket className="h-4 w-4 mr-2" />
                  Meus Tickets
                </Button>
              </Link>
              <Link href="/employee/new">
                <Button variant="ghost" size="sm">
                  Novo Ticket
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="font-medium">{user.full_name}</div>
              <div className="text-muted-foreground text-xs">{user.department}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
