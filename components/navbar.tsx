"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, ChevronDown, Trash2 } from "lucide-react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const roleLabels: Record<string, string> = {
  host: "Host",
  creator: "Creator",
  manager: "Manager",
  traveler: "Traveler",
}

export default function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [profileError, setProfileError] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (session?.user?.id && !profileError) {
      loadProfile()
    }
  }, [session])

  const loadProfile = async () => {
    if (!session?.user?.id || profileError) return
    try {
      const { data, error } = await createSupabaseClient()
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", session.user.id)
        .maybeSingle()

      if (error) {
        // Handle specific error codes
        if (error.code === "PGRST116" || error.code === "PGRST301" || error.message?.includes("406")) {
          // Profile doesn't exist - don't retry
          setProfileError(true)
          return
        }
        console.error("Error loading profile:", error)
        return
      }

      if (data) {
        setProfile(data)
        // For now, single role per user. In future, can be expanded to support multiple roles
        if (data.role) {
          setAvailableRoles([data.role])
        }
      }
    } catch (error: any) {
      // Handle network errors or other issues
      if (error?.code === "PGRST116" || error?.message?.includes("406")) {
        setProfileError(true)
      }
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

  const handleDeleteProfile = async () => {
    if (!session?.user?.id) return

    setDeleting(true)
    try {
      // Chiama la funzione database che elimina tutto, incluso auth.users
      const { error } = await supabase.rpc("delete_user_account")

      if (error) throw error

      toast({
        title: "Profilo eliminato",
        description: "Il tuo profilo è stato eliminato con successo.",
      })

      // Logout e reindirizza immediatamente alla home
      // Usa window.location per forzare un reload completo e fermare tutte le query pendenti
      await signOut({ redirect: false })
      window.location.href = "/"
    } catch (error: any) {
      console.error("Error deleting profile:", error)
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione del profilo.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
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
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina profilo
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

      {/* Delete Profile Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina profilo</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il tuo profilo? Questa azione è irreversibile e eliminerà:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Tutti i tuoi post</li>
                <li>Le tue collaborazioni</li>
                {profile?.role === "creator" && <li>I tuoi account social collegati</li>}
                {profile?.role === "host" && <li>Le tue proprietà pubblicate</li>}
                <li>Le tue prenotazioni</li>
                <li>Il tuo profilo e tutti i dati associati</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProfile}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina profilo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  )
}

