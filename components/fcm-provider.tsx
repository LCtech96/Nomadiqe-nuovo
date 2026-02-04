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
    // Riduci log verbosi - log solo quando cambiano condizioni critiche
    const shouldLog = status === "authenticated" && session?.user?.id
    if (shouldLog) {
      console.log("🔄 FCM: useEffect triggerato", {
        status,
        hasUserId: !!session?.user?.id,
      })
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.log("⏭️ FCM: window/navigator non disponibile (SSR)")
      return
    }

    // Salva userAgent in una variabile per evitare problemi TypeScript
    const userAgent = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
    
    // Log ridotto - solo quando necessario
    if (shouldLog) {
      console.log("🔄 FCM: Rilevamento dispositivo", { isIOS, isMobile })
    }

    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ FCM: Service Worker non supportato su questo browser", {
        isIOS,
        userAgent: userAgent,
      })
      return
    }

    if (!("Notification" in window)) {
      console.warn("⚠️ FCM: Notifiche non supportate su questo browser", {
        isIOS,
        userAgent: userAgent,
      })
      return
    }

    // Su iOS, verifica la versione (richiede iOS 16.4+)
    if (isIOS) {
      // iOS 16.4+ supporta le notifiche push web
      // Ma spesso richiedono che il sito sia aggiunto alla home screen
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
      
      if (!isStandalone && shouldLog) {
        console.warn("⚠️ FCM: Su iOS, le notifiche push funzionano meglio quando il sito è aggiunto alla home screen")
      }
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
          // console.log("✅ FCM: Condizioni soddisfatte, inizializzo...")
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

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.warn("⚠️ FCM: window/navigator non disponibile")
      return
    }

    // Assicura che il profilo esista prima di qualsiasi operazione (fix FK)
    try {
      await fetch("/api/profile/ensure", { credentials: "include" })
    } catch {
      // Ignora errori, continuiamo
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    try {
      // console.log("🔥 FCM: Inizializzazione in corso...")
      // console.log("👤 FCM: User ID:", session.user.id)

      // Verifica che FCM sia supportato
      // console.log("🔍 FCM: Verifica supporto FCM...")
      const supported = await isSupported()
      console.log("🔍 FCM: isSupported() risultato:", supported, { isIOS, isMobile })
      
      if (!supported) {
        console.warn("⚠️ FCM: Browser non supporta FCM", {
          isIOS,
          isMobile,
          userAgent: navigator.userAgent,
        })
        
        if (isIOS) {
          console.warn("💡 FCM: Su iOS, le notifiche push richiedono:")
          console.warn("   1. iOS 16.4 o superiore")
          console.warn("   2. Safari (non altri browser)")
          console.warn("   3. Sito aggiunto alla home screen (consigliato)")
        }
        return
      }

      // console.log("✅ FCM: Browser supporta FCM")

      // Ottieni il servizio messaging
      const messagingInstance = getMessaging()
      setMessaging(messagingInstance)
      setIsFCMReady(true)

      // console.log("✅ FCM: Inizializzazione completata")

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

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.warn("⚠️ FCM: window/navigator non disponibile")
      return
    }

    try {
      // Rileva se siamo su mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const isAndroid = /Android/i.test(navigator.userAgent)
      
      console.log("📱 FCM: Rilevamento dispositivo:", {
        isMobile,
        isIOS,
        isAndroid,
        userAgent: navigator.userAgent.substring(0, 50),
      })

      // Controlla se il browser supporta le notifiche push
      if (!("Notification" in window)) {
        console.warn("⚠️ FCM: Browser non supporta le notifiche push")
        return
      }

      // Controlla se l'utente è già iscritto in Supabase
      const supabase = createSupabaseClient()
      const { data: existingSubscription } = await supabase
        .from("push_subscriptions")
        .select("fcm_token")
        .eq("user_id", session.user.id)
        .maybeSingle()

      const hasSubscriptionInDB = !!existingSubscription?.fcm_token
      // console.log("📱 FCM: Utente iscritto in DB?", hasSubscriptionInDB)

      // Se l'utente non è iscritto, mostra il dialog
      if (!hasSubscriptionInDB) {
        console.log("🔔 FCM: Mostro dialog tra 1 secondo...", { isMobile, isIOS, isAndroid })
        // Su mobile, aspetta un po' di più per assicurarsi che la pagina sia completamente caricata
        const delay = isMobile ? 2000 : 1000
        setTimeout(() => {
          console.log("🔔 FCM: Apertura dialog ora!", { isMobile })
          setShowPermissionDialog(true)
        }, delay)
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
      // Assicura che il profilo esista (fix FK per utenti senza riga in profiles)
      await fetch("/api/profile/ensure", { credentials: "include" })

      // Usa API dedicata per bypassare RLS (il client non ha JWT Supabase)
      const res = await fetch("/api/notifications/register-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `HTTP ${res.status}`)
      }
      console.log("💾 FCM: Token salvato in Supabase")
    } catch (error) {
      console.error("❌ FCM: Errore nel salvare il token:", error)
    }
  }

  const handleSubscribe = async () => {
    if (!messaging) {
      console.error("❌ FCM: Messaging non disponibile")
      return
    }

    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.error("❌ FCM: window/navigator non disponibile")
      return
    }

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      console.log("🔔 FCM: Richiesta permesso notifiche...", { isMobile, isIOS })

      // Verifica che il service worker sia attivo
      const registration = await navigator.serviceWorker.ready
      console.log("✅ FCM: Service Worker pronto:", registration.active?.state, { isMobile })

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
        <DialogContent className="sm:max-w-[425px] max-w-[90vw] max-h-[90vh] overflow-y-auto z-[9999]">
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
              {typeof window !== "undefined" && typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
                <>
                  <br />
                  <br />
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                    <strong>🍎 Per iOS:</strong>
                    <br />
                    • Richiede iOS 16.4 o superiore
                    <br />
                    • Funziona meglio se aggiungi il sito alla home screen
                    <br />
                    • Vai su "Condividi" → "Aggiungi alla schermata Home"
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => {
                console.log("❌ FCM: Utente ha rifiutato le notifiche")
                setShowPermissionDialog(false)
              }}
              className="w-full sm:w-auto"
            >
              Non ora
            </Button>
            <Button 
              onClick={handleSubscribe} 
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Bell className="w-4 h-4" />
              Consenti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

