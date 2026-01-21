"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, Map, User, Building2, Plus, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"
import CreatePostDialog from "@/components/create-post-dialog"
import { createSupabaseClient } from "@/lib/supabase/client"

export default function BottomNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile()
    }
  }, [session])

  const loadProfile = async () => {
    if (!session?.user?.id) return
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
      
      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  // Don't show bottom nav on auth pages
  const hideOnRoutes = ["/auth/signin", "/auth/signup", "/auth/verify-email"]
  if (!session || hideOnRoutes.includes(pathname)) {
    return null
  }

  // For travelers, show Dashboard instead of KOL&BED
  const isTraveler = profile?.role === "traveler"
  
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
    ...(isTraveler 
      ? [{
          href: "/dashboard/traveler",
          label: "Dashboard",
          icon: LayoutDashboard,
        }]
      : [{
          href: "/kol-bed",
          label: "KOL&BED",
          icon: Building2,
        }]
    ),
    {
      href: "/profile",
      label: "Profilo",
      icon: User,
    },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
        {/* Gradient background with glassmorphism effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/98 to-white/95 dark:from-background dark:via-background/98 dark:to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-purple-500/3 to-pink-500/5" />
        <div className="absolute inset-0 backdrop-blur-2xl backdrop-saturate-150" />
        
        {/* Border with gradient */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200/50 to-transparent" />
        
        <div className="relative grid grid-cols-5 h-20 pb-safe-area-inset-bottom">
          {/* First two items */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 text-xs transition-all duration-300 ease-out relative group",
                  "active:scale-95 touch-manipulation"
                )}
              >
                {/* Active indicator background */}
                {isActive && (
                  <div className="absolute inset-0 mx-2 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]" />
                )}
                
                {/* Icon with smooth transitions */}
                <div className={cn(
                  "relative z-10 p-2 rounded-xl transition-all duration-300 ease-out",
                  isActive 
                    ? "bg-gradient-to-br from-primary/20 to-primary/10 scale-110 shadow-lg shadow-primary/20" 
                    : "group-hover:bg-accent/50 group-hover:scale-105"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive
                      ? "text-primary scale-110"
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  
                  {/* Active pulse effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-50 pointer-events-none" />
                  )}
                </div>
                
                {/* Label with gradient text when active */}
                <span className={cn(
                  "relative z-10 font-medium transition-all duration-300",
                  isActive
                    ? "text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                    : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* Central button for creating post - iOS style with gradient */}
          <div className="flex items-center justify-center relative">
            <button
              onClick={() => setCreatePostOpen(true)}
              className={cn(
                "absolute -top-6 w-14 h-14 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br from-primary via-primary to-primary/90",
                "shadow-2xl shadow-primary/50",
                "hover:shadow-primary/70 hover:scale-110",
                "active:scale-95",
                "transition-all duration-300 ease-out",
                "z-20 touch-manipulation",
                "border-2 border-background/50 dark:border-background/30"
              )}
              aria-label="Crea post"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent opacity-50" />
              
              {/* Icon */}
              <Plus className="h-6 w-6 text-primary-foreground relative z-10 transition-transform duration-300 hover:rotate-90" />
              
              {/* Pulse animation */}
              <div className="absolute inset-0 rounded-2xl bg-primary/40 animate-pulse" />
            </button>
          </div>

          {/* Last two items */}
          {navItems.slice(2).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 text-xs transition-all duration-300 ease-out relative group",
                  "active:scale-95 touch-manipulation"
                )}
              >
                {/* Active indicator background */}
                {isActive && (
                  <div className="absolute inset-0 mx-2 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]" />
                )}
                
                {/* Icon with smooth transitions */}
                <div className={cn(
                  "relative z-10 p-2 rounded-xl transition-all duration-300 ease-out",
                  isActive 
                    ? "bg-gradient-to-br from-primary/20 to-primary/10 scale-110 shadow-lg shadow-primary/20" 
                    : "group-hover:bg-accent/50 group-hover:scale-105"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive
                      ? "text-primary scale-110"
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  
                  {/* Active pulse effect */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-50 pointer-events-none" />
                  )}
                </div>
                
                {/* Label with gradient text when active */}
                <span className={cn(
                  "relative z-10 font-medium transition-all duration-300",
                  isActive
                    ? "text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                    : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
      
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onSuccess={() => {
          router.refresh()
        }}
      />
    </>
  )
}

