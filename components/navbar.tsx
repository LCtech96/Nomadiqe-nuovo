"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, ChevronDown } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

const roleLabels: Record<string, string> = {
  host: "Host",
  creator: "Creator",
  manager: "Manager",
  traveler: "Traveler",
}

export default function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (session?.user?.id) {
      loadProfile()
    }
  }, [session])

  const loadProfile = async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await createSupabaseClient()
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", session.user.id)
        .single()

      if (!error && data) {
        setProfile(data)
        // For now, single role per user. In future, can be expanded to support multiple roles
        if (data.role) {
          setAvailableRoles([data.role])
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", session.user.id)

      if (error) throw error
      
      setProfile({ ...profile, role: newRole })
      // Reload page to reflect new role
      window.location.reload()
    } catch (error) {
      console.error("Error changing role:", error)
    }
  }

  return (
    <nav className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Nomadiqe
            </Link>
            {session && (
              <div className="hidden md:flex items-center gap-4">
                <Link href="/explore" className="text-sm font-medium hover:text-primary">
                  Esplora
                </Link>
                <Link href="/home" className="text-sm font-medium hover:text-primary">
                  Home
                </Link>
                <Link href="/kol-bed" className="text-sm font-medium hover:text-primary">
                  KOL&BED
                </Link>
                <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
                  Dashboard
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <span>{session.user.name || session.user.email}</span>
                    {profile?.role && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                        {roleLabels[profile.role] || profile.role}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {profile?.full_name || session.user.name || session.user.email}
                  </DropdownMenuLabel>
                  {profile?.role && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                        Ruolo attuale: {roleLabels[profile.role] || profile.role}
                      </DropdownMenuLabel>
                      {availableRoles.length > 1 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Cambia ruolo</DropdownMenuLabel>
                          {availableRoles
                            .filter(role => role !== profile.role)
                            .map(role => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleRoleChange(role)}
                              >
                                {roleLabels[role] || role}
                              </DropdownMenuItem>
                            ))}
                        </>
                      )}
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profilo</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Esci
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost">
                  <Link href="/auth/signin">Accedi</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Registrati</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

