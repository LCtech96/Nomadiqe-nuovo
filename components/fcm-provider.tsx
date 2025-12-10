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
    // Registra il service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("✅ FCM: Service Worker registrato:", registration.scope)
        })
        .catch((error) => {
          console.error("❌ FCM: Errore nella registrazione Service Worker:", error)
        })
    }

    if (status === "authenticated" && session?.user?.id && typeof window !== "undefined") {
      initializeFCM()
    }
  }, [session, status])

  const initializeFCM = async () => {
    try {
      // Verifica che FCM sia supportato
      const supported = await isSupported()
      if (!supported) {
        console.warn("⚠️ FCM: Browser non supporta FCM")
        return
      }

      console.log("🔥 FCM: Inizializzazione in corso...")

      // Ottieni il servizio messaging
      const messagingInstance = getMessaging()
      setMessaging(messagingInstance)
      setIsFCMReady(true)

      console.log("✅ FCM: Inizializzazione completata")

      // Controlla se l'utente è già iscritto
      await checkAndRequestPermission()

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

  const checkAndRequestPermission = async () => {
    if (!messaging || !session?.user?.id) return

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
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY })
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

      // Richiedi permesso
      const permission = await Notification.requestPermission()
      
      if (permission === "granted") {
        console.log("✅ FCM: Permesso concesso")

        // Ottieni il token FCM
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        
        if (token) {
          console.log("✅ FCM: Token ottenuto:", token.substring(0, 20) + "...")
          await saveFCMToken(token)
          setShowPermissionDialog(false)
        } else {
          console.error("❌ FCM: Impossibile ottenere token")
        }
      } else {
        console.log("❌ FCM: Permesso negato")
        setShowPermissionDialog(false)
      }
    } catch (error: any) {
      console.error("❌ FCM: Errore nella registrazione:", error)
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

