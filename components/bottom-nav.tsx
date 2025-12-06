"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, Map, User, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BottomNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  // Don't show bottom nav on auth pages
  const hideOnRoutes = ["/auth/signin", "/auth/signup", "/auth/verify-email"]
  if (!session || hideOnRoutes.includes(pathname)) {
    return null
  }

  const navItems = [
    {
      href: "/home",
      label: "Home",
      icon: Home,
    },
    {
      href: "/explore",
      label: "Esplora",
      icon: Map,
    },
    {
      href: "/kol-bed",
      label: "KOL&BED",
      icon: Building2,
    },
    {
      href: "/profile",
      label: "Profilo",
      icon: User,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

