"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { initializeApp, getApps } from "firebase/app"
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging"
import { createSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Bell } from "lucide-react"
import { firebaseConfig, VAPID_KEY } from "@/lib/firebase/config"

// Inizializza Firebase solo se non è già inizializzato
if (typeof window !== "undefined" && getApps().length === 0) {
  initializeApp(firebaseConfig)
}

export function FCMProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [messaging, setMessaging] = useState<any>(null)
  const [isFCMReady, setIsFCMReady] = useState(false)

  useEffect(() => {
    console.log("🔄 FCM: useEffect triggerato", {
      status,
      hasUserId: !!session?.user?.id,
      hasWindow: typeof window !== "undefined",
    })

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    // Rimuovi service worker OneSignal se presenti
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.scope.includes("OneSignal") || registration.active?.scriptURL?.includes("OneSignal")) {
          console.log("🗑️ FCM: Rimozione Service Worker OneSignal:", registration.scope)
          registration.unregister()
        }
      })
    })

    // Registra il service worker FCM e aspetta che sia attivo
    console.log("🔧 FCM: Registrazione Service Worker...")
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then(async (registration) => {
        console.log("✅ FCM: Service Worker registrato:", registration.scope)
        
        // Aspetta che il service worker sia attivo
        if (registration.installing) {
          console.log("⏳ FCM: Service Worker in installazione...")
          await new Promise((resolve) => {
            registration.installing!.addEventListener("statechange", () => {
              if (registration.installing?.state === "activated") {
                console.log("✅ FCM: Service Worker attivato!")
                resolve(undefined)
              }
            })
          })
        } else if (registration.waiting) {
          console.log("⏳ FCM: Service Worker in attesa, attivazione...")
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } else if (registration.active) {
          console.log("✅ FCM: Service Worker già attivo")
        }

        // Ora inizializza FCM se l'utente è autenticato
        if (status === "authenticated" && session?.user?.id) {
          console.log("✅ FCM: Condizioni soddisfatte, inizializzo...")
          setTimeout(() => initializeFCM(), 500)
        }
      })
      .catch((error) => {
        console.error("❌ FCM: Errore nella registrazione Service Worker:", error)
      })

    if (status !== "authenticated" || !session?.user?.id) {
      console.log("⏳ FCM: In attesa di condizioni...", {
        status,
        hasUserId: !!session?.user?.id,
      })
    }
  }, [session, status])

  const initializeFCM = async () => {
    if (!session?.user?.id) {
      console.warn("⚠️ FCM: Nessun user ID disponibile")
      return
    }

    try {
      console.log("🔥 FCM: Inizializzazione in corso...")
      console.log("👤 FCM: User ID:", session.user.id)

      // Verifica che FCM sia supportato
      const supported = await isSupported()
      if (!supported) {
        console.warn("⚠️ FCM: Browser non supporta FCM")
        return
      }

      console.log("✅ FCM: Browser supporta FCM")

      // Ottieni il servizio messaging
      const messagingInstance = getMessaging()
      setMessaging(messagingInstance)
      setIsFCMReady(true)

      console.log("✅ FCM: Inizializzazione completata")

      // Controlla se l'utente è già iscritto (passa messagingInstance direttamente)
      await checkAndRequestPermission(messagingInstance)

      // Ascolta messaggi quando l'app è aperta
      onMessage(messagingInstance, (payload) => {
        console.log("📨 FCM: Messaggio ricevuto (app aperta):", payload)
        
        // Mostra notifica in-app
        if (Notification.permission === "granted" && payload.notification) {
          new Notification(payload.notification.title || "Nuova notifica", {
            body: payload.notification.body,
            icon: payload.notification.icon || "/icon.png",
            badge: "/icon.png",
            tag: payload.data?.type || "notification",
            data: payload.data,
          })
        }
      })
    } catch (error: any) {
      console.error("❌ FCM: Errore nell'inizializzazione:", error)
    }
  }

  const checkAndRequestPermission = async (messagingInstance?: any) => {
    const messagingToUse = messagingInstance || messaging
    if (!messagingToUse || !session?.user?.id) {
      console.log("⏳ FCM: checkAndRequestPermission - in attesa di messaging o user ID", {
        hasMessaging: !!messagingToUse,
        hasUserId: !!session?.user?.id,
      })
      return
    }

    try {
      // Controlla se l'utente è già iscritto in Supabase
      const supabase = createSupabaseClient()
      const { data: existingSubscription } = await supabase
        .from("push_subscriptions")
        .select("fcm_token")
        .eq("user_id", session.user.id)
        .maybeSingle()

      const hasSubscriptionInDB = !!existingSubscription?.fcm_token
      console.log("📱 FCM: Utente iscritto in DB?", hasSubscriptionInDB)

      // Se l'utente non è iscritto, mostra il dialog
      if (!hasSubscriptionInDB) {
        console.log("🔔 FCM: Mostro dialog tra 1 secondo...")
        setTimeout(() => {
          setShowPermissionDialog(true)
        }, 1000)
      } else {
        // Se è già iscritto, verifica che il token sia ancora valido
        const currentToken = await getToken(messagingToUse, { vapidKey: VAPID_KEY })
        if (currentToken && currentToken !== existingSubscription.fcm_token) {
          // Token cambiato, aggiorna
          await saveFCMToken(currentToken)
        }
      }
    } catch (error: any) {
      console.error("❌ FCM: Errore nel controllo permission:", error)
    }
  }

  const saveFCMToken = async (token: string) => {
    if (!session?.user?.id) return

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          fcm_token: token,
          onesignal_player_id: null, // Esplicitamente null per FCM-only
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )

      if (error) {
        console.error("❌ FCM: Errore nel salvare il token:", error)
      } else {
        console.log("💾 FCM: Token salvato in Supabase")
      }
    } catch (error) {
      console.error("❌ FCM: Errore nel salvare il token:", error)
    }
  }

  const handleSubscribe = async () => {
    if (!messaging) {
      console.error("❌ FCM: Messaging non disponibile")
      return
    }

    try {
      console.log("🔔 FCM: Richiesta permesso notifiche...")

      // Verifica che il service worker sia attivo
      const registration = await navigator.serviceWorker.ready
      console.log("✅ FCM: Service Worker pronto:", registration.active?.state)

      // Richiedi permesso
      const permission = await Notification.requestPermission()
      
      if (permission === "granted") {
        console.log("✅ FCM: Permesso concesso")

        // Aspetta un attimo per assicurarsi che il service worker sia completamente attivo
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Ottieni il token FCM
        console.log("🔑 FCM: Richiesta token FCM...")
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        
        if (token) {
          console.log("✅ FCM: Token ottenuto:", token.substring(0, 20) + "...")
          await saveFCMToken(token)
          setShowPermissionDialog(false)
        } else {
          console.error("❌ FCM: Impossibile ottenere token (token vuoto)")
        }
      } else {
        console.log("❌ FCM: Permesso negato")
        setShowPermissionDialog(false)
      }
    } catch (error: any) {
      console.error("❌ FCM: Errore nella registrazione:", error)
      console.error("❌ FCM: Dettagli errore:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      })
      setShowPermissionDialog(false)
    }
  }

  return (
    <>
      {children}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Abilita le notifiche push
            </DialogTitle>
            <DialogDescription className="pt-2">
              Ricevi notifiche quando qualcuno ti invia un messaggio, mette like o commenta i tuoi post.
              <br />
              <br />
              <strong>Le notifiche funzionano anche quando l'app è chiusa!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              Non ora
            </Button>
            <Button onClick={handleSubscribe} className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Consenti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

