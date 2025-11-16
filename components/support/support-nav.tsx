"use client"

import type { ComponentType } from "react"
import type { User } from "@/lib/types"
import { Button } from "@components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LifeBuoy, Ticket, BarChart3, Boxes, LogOut } from "lucide-react"

interface SupportNavProps {
  user: User
}

export function SupportNav({ user }: SupportNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getSupabaseBrowserClient()

  const navItems: Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }> = [
    {
      href: "/support/tickets",
      label: "Chamados",
      icon: Ticket,
    },
    {
      href: "/support/assets",
      label: "Ativos",
      icon: Boxes,
    },
    {
      href: "/support/analytics",
      label: "Analytics",
      icon: BarChart3,
    },
  ]

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
            <Link href="/support/tickets" className="flex items-center gap-2 font-semibold text-lg">
              <LifeBuoy className="h-6 w-6 text-primary" />
              <span>Suporte TI</span>
            </Link>
            <div className="flex gap-4">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link key={href} href={href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn("gap-2", isActive ? "font-semibold" : "")}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  </Link>
                )
              })}
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
