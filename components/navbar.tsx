"use client"

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Moon, Sun, Menu, ChevronDown, Trash2, Bell, Mail, LayoutDashboard, BellRing } from "lucide-react"
import { usePathname } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getMessaging, getToken, isSupported } from "firebase/messaging"
import { VAPID_KEY } from "@/lib/firebase/config"
import { useI18n } from "@/lib/i18n/context"
import { Languages } from "lucide-react"
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
  jolly: "Jolly",
  traveler: "Traveler",
}

export default function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t, localeNames, availableLocales } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [availableRoles, setAvailableRoles] = useState<string[]>([])
  const [profileError, setProfileError] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [enablingPush, setEnablingPush] = useState(false)
  const supabase = createSupabaseClient()
  const isProfilePage = pathname === "/profile"

  useEffect(() => {
    if (session?.user?.id && !profileError) {
      loadProfile()
      loadNotifications()
    }
  }, [session])

  useEffect(() => {
    if (!session?.user?.id) return
    
    // Subscribe to notifications changes
    const notificationsChannel = supabase
      .channel(`notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
    }
  }, [session])

  const loadNotifications = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      const unread = (data || []).filter((n) => !n.read).length
      setUnreadCount(unread)
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id)
      loadNotifications()
    }
    
    setNotificationsOpen(false)
    
    // Navigate based on notification type
    if (notification.related_id) {
      if (notification.type?.includes("post") || notification.type === "post_comment" || notification.type === "post_like") {
        router.push(`/posts/${notification.related_id}`)
      } else if (notification.type?.includes("property")) {
        router.push(`/properties/${notification.related_id}`)
      } else if (notification.type?.includes("profile") || notification.type === "follow") {
        router.push(`/profile/${notification.related_id}`)
      } else if (notification.type === "message") {
        router.push("/messages")
      }
    } else if (notification.type === "message") {
      router.push("/messages")
    }
  }

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleEnablePushNotifications = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per attivare le notifiche",
        variant: "destructive",
      })
      return
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      toast({
        title: "Errore",
        description: "Le notifiche push non sono supportate su questo dispositivo",
        variant: "destructive",
      })
      return
    }

    // Verifica supporto notifiche
    if (!("Notification" in window)) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta le notifiche push",
        variant: "destructive",
      })
      return
    }

    // Verifica supporto Service Worker
    if (!("serviceWorker" in navigator)) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta i Service Worker necessari per le notifiche push",
        variant: "destructive",
      })
      return
    }

    setEnablingPush(true)

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

      // Verifica che FCM sia supportato
      const supported = await isSupported()
      if (!supported) {
        toast({
          title: "Non supportato",
          description: isIOS
            ? "Su iOS, le notifiche push richiedono iOS 16.4+ e Safari. Aggiungi il sito alla home screen per un'esperienza migliore."
            : "Il tuo browser non supporta le notifiche push FCM",
          variant: "destructive",
        })
        setEnablingPush(false)
        return
      }

      // Verifica che il service worker sia attivo
      const registration = await navigator.serviceWorker.ready

      // Richiedi permesso
      const permission = await Notification.requestPermission()

      if (permission === "granted") {
        // Aspetta un attimo per assicurarsi che il service worker sia completamente attivo
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Ottieni il token FCM
        const messaging = getMessaging()
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })

        if (token) {
          // Salva il token in Supabase
          const { error } = await supabase.from("push_subscriptions").upsert(
            {
              user_id: session.user.id,
              fcm_token: token,
              onesignal_player_id: null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
            }
          )

          if (error) {
            console.error("Error saving FCM token:", error)
            toast({
              title: "Errore",
              description: "Errore durante il salvataggio del token",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Notifiche attivate!",
              description: "Riceverai notifiche push quando qualcuno ti invia un messaggio o interagisce con i tuoi contenuti.",
            })
            setMobileMenuOpen(false)
            
            // Invia una notifica test immediata
            try {
              // Crea una notifica test nel database
              const { error: notifError } = await supabase
                .from("pending_notifications")
                .insert({
                  user_id: session.user.id,
                  notification_type: "message",
                  title: "🔔 Notifiche push attivate!",
                  message: "Questa è una notifica di test. Le notifiche push sono ora attive sul tuo dispositivo.",
                  url: "/profile",
                  data: {
                    type: "push_test",
                  },
                })

              if (notifError) {
                console.error("Error creating test notification:", notifError)
              } else {
                // Processa immediatamente la notifica per inviarla via FCM
                await fetch("/api/notifications/process-fcm", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
              }
            } catch (testNotifError) {
              console.error("Error sending test notification:", testNotifError)
              // Non bloccare il flusso se la notifica test fallisce
            }
          }
        } else {
          toast({
            title: "Errore",
            description: "Impossibile ottenere il token di notifica. Riprova più tardi.",
            variant: "destructive",
          })
        }
      } else if (permission === "denied") {
        toast({
          title: "Permesso negato",
          description: "Le notifiche sono state negate. Puoi abilitarle nelle impostazioni del browser.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Permesso non concesso",
          description: "Non è stato possibile ottenere il permesso per le notifiche.",
        })
      }
    } catch (error: any) {
      console.error("Error enabling push notifications:", error)
      toast({
        title: "Errore",
        description: error?.message || "Si è verificato un errore durante l'attivazione delle notifiche",
        variant: "destructive",
      })
    } finally {
      setEnablingPush(false)
    }
  }

  return (
    <>
      {/* Desktop Navbar */}
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
                <Link href="/dashboard" className="text-sm font-medium hover:text-primary flex items-center gap-1">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                {profile?.role !== "traveler" && (
                  <Link href="/kol-bed" className="text-sm font-medium hover:text-primary">
                    KOL&BED
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Languages className="h-5 w-5" />
                  <span className="sr-only">{t('language.select')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('language.title')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableLocales.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocale(loc)}
                    className={locale === loc ? "bg-accent" : ""}
                  >
                    {localeNames[loc]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {session && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setNotificationsOpen(true)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <span className="sr-only">Notifiche</span>
                </Button>
              </>
            )}

            {session && isProfilePage && (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/messages">
                  <Mail className="h-5 w-5" />
                  <span className="sr-only">Messaggi</span>
                </Link>
              </Button>
            )}

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
                    <Link href="/profile">Profilo</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Temporaneamente nascosto - Elimina profilo */}
                  {/* <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina profilo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator /> */}
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

      {/* Mobile Navbar */}
      <nav className="md:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Nomadiqe
            </Link>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">{t('language.select')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('language.title')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableLocales.map((loc) => (
                    <DropdownMenuItem
                      key={loc}
                      onClick={() => setLocale(loc)}
                      className={locale === loc ? "bg-accent" : ""}
                    >
                      {localeNames[loc]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {session && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => setNotificationsOpen(true)}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">Notifiche</span>
                  </Button>
                </>
              )}
              {session && isProfilePage && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/messages">
                    <Mail className="h-5 w-5" />
                    <span className="sr-only">Messaggi</span>
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dialog */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('nav.menu')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {session ? (
              <>
                <div className="space-y-2">
                  <DialogDescription className="text-base font-semibold">
                    {profile?.full_name || session.user.name || session.user.email}
                  </DialogDescription>
                  {profile?.role && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Ruolo:</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        {roleLabels[profile.role] || profile.role}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <Link 
                    href="/dashboard" 
                    className="block py-2 text-base flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      className="w-full flex items-center justify-between py-2 text-base"
                    >
                      <span>Impostazioni</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {settingsOpen && (
                      <div className="pl-4 border-l border-border space-y-1">
                        <button
                          onClick={handleEnablePushNotifications}
                          disabled={enablingPush}
                          className="w-full flex items-center gap-2 py-2 text-sm text-left hover:bg-accent rounded-md px-2 transition-colors disabled:opacity-50"
                        >
                          <BellRing className="h-4 w-4" />
                          {enablingPush ? "Attivazione in corso..." : "Attiva notifiche push"}
                        </button>
                        {/* Temporaneamente nascosto - Elimina profilo */}
                        {/* <button
                          onClick={() => {
                            setMobileMenuOpen(false)
                            setShowDeleteDialog(true)
                          }}
                          className="block w-full text-left py-2 text-sm text-destructive"
                        >
                          Elimina profilo
                        </button> */}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      signOut()
                    }}
                    className="w-full text-left py-2 text-base"
                  >
                    Esci
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Link 
                  href="/auth/signin" 
                  className="block py-2 text-base text-center border rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Accedi
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="block py-2 text-base text-center bg-primary text-primary-foreground rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registrati
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Notifiche</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nessuna notifica
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        !notification.read ? "bg-primary" : "bg-transparent"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString("it-IT", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

