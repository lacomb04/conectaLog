"use client"

import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LifeBuoy, LayoutDashboard, Ticket, BarChart3, Boxes, LogOut } from "lucide-react"

interface SupportNavProps {
  user: User
}

export function SupportNav({ user }: SupportNavProps) {
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
            <Link href="/support" className="flex items-center gap-2 font-semibold text-lg">
              <LifeBuoy className="h-6 w-6 text-primary" />
              <span>Suporte TI</span>
            </Link>
            <div className="flex gap-4">
              <Link href="/support">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/support/tickets">
                <Button variant="ghost" size="sm">
                  <Ticket className="h-4 w-4 mr-2" />
                  Tickets
                </Button>
              </Link>
              <Link href="/support/assets">
                <Button variant="ghost" size="sm">
                  <Boxes className="h-4 w-4 mr-2" />
                  Ativos
                </Button>
              </Link>
              <Link href="/support/analytics">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="font-medium">{user.full_name}</div>
              <div className="text-muted-foreground text-xs capitalize">{user.role}</div>
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
