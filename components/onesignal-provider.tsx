"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Script from "next/script"
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

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || ""

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => Promise<void>>
    OneSignal?: any
    OneSignalInitialized?: boolean
  }
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [isOneSignalReady, setIsOneSignalReady] = useState(false)

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.OneSignal &&
      session?.user?.id &&
      isOneSignalReady &&
      status === "authenticated"
    ) {
      initializeOneSignal()
    }
  }, [session, status, isOneSignalReady])

  const initializeOneSignal = async () => {
    if (!ONESIGNAL_APP_ID || !session?.user?.id) return

    const currentHost = typeof window !== "undefined" ? window.location.hostname : ""
    const currentUrl = typeof window !== "undefined" ? window.location.href : ""
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""
    const currentProtocol = typeof window !== "undefined" ? window.location.protocol : ""
    
    console.log("🔔 OneSignal: Tentativo di inizializzazione...")
    console.log("📍 Dominio corrente (hostname):", currentHost)
    console.log("🌐 Origin completo:", currentOrigin)
    console.log("🔒 Protocollo:", currentProtocol)
    console.log("🔗 URL completo:", currentUrl)
    console.log("🔑 App ID presente:", !!ONESIGNAL_APP_ID)
    console.log("👤 User ID presente:", !!session?.user?.id)

    // IMPORTANTE: OneSignal verifica l'URL ESATTO configurato nel dashboard
    // Se in OneSignal è configurato "https://nomadiqe.com" (senza www),
    // l'URL deve essere ESATTAMENTE "https://nomadiqe.com"
    // Se è configurato "https://www.nomadiqe.com" (con www),
    // l'URL deve essere ESATTAMENTE "https://www.nomadiqe.com"
    
    // Verifica che l'URL corrisponda esattamente a quello configurato in OneSignal
    // In OneSignal dashboard, il SITE URL è: https://nomadiqe.com (senza www)
    const allowedOrigins = [
      "https://nomadiqe.com",
      "https://www.nomadiqe.com", // Aggiunto anche www nel caso
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]
    
    const isAllowedOrigin = allowedOrigins.some(origin => currentOrigin === origin)
    const isLocalhost = currentHost === "localhost" || currentHost === "127.0.0.1"

    console.log("✅ Origin consentito:", isAllowedOrigin)
    console.log("🏠 È localhost:", isLocalhost)
    console.log("📋 Origin corrente:", currentOrigin)
    console.log("📋 Origins consentiti:", allowedOrigins)

    // Se l'origin non è consentito, non inizializzare OneSignal
    // per evitare errori di dominio non autorizzato
    if (!isAllowedOrigin && !isLocalhost) {
      console.error(
        "❌ OneSignal: Origin non autorizzato!\n" +
        "   Origin corrente: " + currentOrigin + "\n" +
        "   Verifica che il SITE URL in OneSignal dashboard corrisponda ESATTAMENTE a questo origin.\n" +
        "   Se stai usando www.nomadiqe.com, il SITE URL deve essere: https://www.nomadiqe.com\n" +
        "   Se stai usando nomadiqe.com (senza www), il SITE URL deve essere: https://nomadiqe.com"
      )
      return // Non inizializzare OneSignal su domini non autorizzati
    }

    if (!window.OneSignal) {
      console.error("❌ OneSignal: window.OneSignal non disponibile!")
      return
    }

    try {
      const OneSignal = window.OneSignal
      console.log("✅ OneSignal: Inizializzazione in corso...")

      // Inizializza OneSignal
      // Nota: safari_web_id è fornito da OneSignal quando usi "Custom Code"
      // Se non lo hai, puoi trovarlo in OneSignal Dashboard → Settings → Web Push → Safari Web Push ID
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: "web.onesignal.auto.4ddec2dc-5c48-40c7-bde8-da7159bee241", // Safari Web Push ID da OneSignal
        notifyButton: {
          enable: false, // Disabilitato perché usiamo il nostro dialog personalizzato
        },
        allowLocalhostAsSecureOrigin: true,
        // Configurazioni per notifiche anche quando app è chiusa
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "OneSignalSDKWorker.js",
        welcomeNotification: {
          disable: true,
        },
      })

      console.log("✅ OneSignal: Inizializzazione completata con successo!")

      // Controlla se l'utente è già iscritto in Supabase
      const supabase = createSupabaseClient()
      const { data: existingSubscription } = await supabase
        .from("push_subscriptions")
        .select("onesignal_player_id")
        .eq("user_id", session.user.id)
        .maybeSingle()

      const hasSubscriptionInDB = !!existingSubscription?.onesignal_player_id
      console.log("📱 OneSignal: Utente iscritto in DB?", hasSubscriptionInDB)

      // Controlla anche lo stato di OneSignal
      const isSubscribedInOneSignal = await OneSignal.isPushNotificationsEnabled()
      console.log("📱 OneSignal: Utente iscritto in OneSignal?", isSubscribedInOneSignal)

      // Se l'utente è iscritto in OneSignal ma non in DB, salva il player ID
      if (isSubscribedInOneSignal && !hasSubscriptionInDB) {
        const playerId = await OneSignal.getUserId()
        console.log("🆔 OneSignal: Player ID:", playerId)
        if (playerId) {
          await savePlayerId(playerId)
          console.log("💾 OneSignal: Player ID salvato in Supabase")
        }
      }

      // Mostra il dialog se l'utente NON è iscritto (né in DB né in OneSignal)
      if (!hasSubscriptionInDB && !isSubscribedInOneSignal) {
        // Mostra il dialog subito dopo il login (1 secondo per dare tempo al rendering)
        setTimeout(() => {
          setShowPermissionDialog(true)
        }, 1000)
      } else if (isSubscribedInOneSignal) {
        // Se è iscritto in OneSignal, assicurati che il player ID sia salvato
        const playerId = await OneSignal.getUserId()
        if (playerId && !hasSubscriptionInDB) {
          await savePlayerId(playerId)
        }
      }

      // Ascolta quando l'utente si iscrive
      OneSignal.on("subscriptionChange", async (isSubscribed: boolean) => {
        if (isSubscribed) {
          const playerId = await OneSignal.getUserId()
          if (playerId) {
            await savePlayerId(playerId)
          }
        }
      })

      // Setup Realtime listeners
      setupRealtimeListeners()
      console.log("👂 OneSignal: Listener Realtime configurati")
    } catch (error: any) {
      // Gestisci l'errore di dominio non autorizzato
      console.error("❌ OneSignal: Errore durante l'inizializzazione:", error)
      console.error("📋 Dettagli errore:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      })
      
      if (error?.message?.includes("Can only be used on")) {
        console.error(
          "🚫 OneSignal: Dominio non autorizzato. " +
          "Il dominio configurato in OneSignal dashboard è diverso da: " + currentHost
        )
        console.error("💡 Soluzione: Verifica che il SITE URL in OneSignal dashboard corrisponda esattamente a:", currentUrl)
        return // Non bloccare l'app, solo non inizializzare OneSignal
      }
      console.error("❌ Errore completo nell'inizializzazione di OneSignal:", error)
    }
  }

  const savePlayerId = async (playerId: string) => {
    if (!session?.user?.id) return

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          onesignal_player_id: playerId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )

      if (error) {
        console.error("Errore nel salvare il player ID:", error)
      }
    } catch (error) {
      console.error("Errore nel salvare il player ID:", error)
    }
  }

  const setupRealtimeListeners = () => {
    if (!session?.user?.id) return

    const supabase = createSupabaseClient()

    // Ascolta nuovi messaggi
    const messagesChannel = supabase
      .channel(`messages:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${session.user.id}`,
        },
        async (payload) => {
          console.log("📨 OneSignal: Nuovo messaggio ricevuto!", payload.new)
          await sendNotification("message", payload.new)
        }
      )
      .subscribe()

    // Ascolta nuovi like
    const likesChannel = supabase
      .channel(`post_likes:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_likes",
        },
        async (payload) => {
          // Verifica che il like non sia dell'utente stesso
          if (payload.new.user_id === session.user.id) return

          const { data: post } = await supabase
            .from("posts")
            .select("author_id")
            .eq("id", payload.new.post_id)
            .single()

          if (post && post.author_id === session.user.id) {
            await sendNotification("like", payload.new)
          }
        }
      )
      .subscribe()

    // Ascolta nuovi commenti
    const commentsChannel = supabase
      .channel(`post_comments:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_comments",
        },
        async (payload) => {
          // Verifica che il commento non sia dell'utente stesso
          if (payload.new.user_id === session.user.id) return

          const { data: post } = await supabase
            .from("posts")
            .select("author_id")
            .eq("id", payload.new.post_id)
            .single()

          if (post && post.author_id === session.user.id) {
            await sendNotification("comment", payload.new)
          }
        }
      )
      .subscribe()

    // Cleanup quando il componente si smonta
    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(likesChannel)
      supabase.removeChannel(commentsChannel)
    }
  }

  const sendNotification = async (type: "message" | "like" | "comment", data: any) => {
    if (!session?.user?.id) return

    try {
      console.log(`🔔 OneSignal: Invio notifica ${type}...`)
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          type,
          data,
        }),
      })

      if (response.ok) {
        console.log(`✅ OneSignal: Notifica ${type} inviata con successo!`)
      } else {
        const errorData = await response.json()
        console.error(`❌ OneSignal: Errore nell'invio della notifica ${type}:`, errorData)
      }
    } catch (error) {
      console.error(`❌ OneSignal: Errore nell'invio della notifica ${type}:`, error)
    }
  }

  const handleSubscribe = async () => {
    try {
      const OneSignal = window.OneSignal
      console.log("🔔 OneSignal: Richiesta permesso notifiche...")
      
      // Richiedi il permesso
      await OneSignal.registerForPushNotifications()
      
      // Attendi che OneSignal ottenga il player ID
      let attempts = 0
      const maxAttempts = 10
      const checkPlayerId = async (): Promise<void> => {
        const playerId = await OneSignal.getUserId()
        if (playerId) {
          console.log("✅ OneSignal: Player ID ottenuto:", playerId)
          await savePlayerId(playerId)
          setShowPermissionDialog(false)
          console.log("💾 OneSignal: Player ID salvato in Supabase")
        } else if (attempts < maxAttempts) {
          attempts++
          console.log(`⏳ OneSignal: Attendo player ID... (tentativo ${attempts}/${maxAttempts})`)
          setTimeout(checkPlayerId, 500)
        } else {
          console.error("❌ OneSignal: Impossibile ottenere player ID dopo", maxAttempts, "tentativi")
          setShowPermissionDialog(false)
        }
      }
      
      // Inizia a controllare dopo 500ms
      setTimeout(checkPlayerId, 500)
    } catch (error) {
      console.error("❌ Errore nella registrazione:", error)
      // Chiudi il dialog anche in caso di errore
      setShowPermissionDialog(false)
    }
  }

  // Handler per quando OneSignal è pronto
  useEffect(() => {
    const handleOneSignalReady = () => {
      setIsOneSignalReady(true)
      if (session?.user?.id && status === "authenticated") {
        setTimeout(() => initializeOneSignal(), 500)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("onesignal-ready", handleOneSignalReady)

      // Controlla se OneSignal è già caricato e inizializzato
      if (window.OneSignal && window.OneSignalInitialized) {
        setIsOneSignalReady(true)
        if (session?.user?.id && status === "authenticated") {
          setTimeout(() => initializeOneSignal(), 500)
        }
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("onesignal-ready", handleOneSignalReady)
      }
    }
  }, [session, status])

  // Controlla se l'origin è consentito prima di caricare lo script OneSignal
  const shouldLoadOneSignal = () => {
    if (typeof window === "undefined") return false
    if (!ONESIGNAL_APP_ID) return false
    
    const currentOrigin = window.location.origin
    const currentHost = window.location.hostname
    const allowedOrigins = [
      "https://nomadiqe.com",
      "https://www.nomadiqe.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ]
    
    const isLocalhost = currentHost === "localhost" || currentHost === "127.0.0.1"
    const isAllowed = allowedOrigins.includes(currentOrigin) || isLocalhost
    
    if (!isAllowed) {
      console.warn(
        "⚠️ OneSignal: Script non caricato - Origin non autorizzato:",
        currentOrigin,
        "\n💡 IMPORTANTE: Vai su OneSignal Dashboard → Settings → Web Push → Configure",
        "\n   Cambia il SITE URL da 'https://nomadiqe.com' a 'https://www.nomadiqe.com'",
        "\n   (Vercel reindirizza nomadiqe.com → www.nomadiqe.com)"
      )
      return false
    }
    
    // Se siamo su www.nomadiqe.com, assicuriamoci che OneSignal sia configurato per www
    if (currentOrigin === "https://www.nomadiqe.com") {
      console.log("✅ OneSignal: Origin www.nomadiqe.com rilevato - verifica che il SITE URL in OneSignal sia 'https://www.nomadiqe.com'")
    }
    
    return true
  }

  return (
    <>
      {ONESIGNAL_APP_ID && shouldLoadOneSignal() && (
        <>
          <Script
            id="onesignal-sdk"
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            strategy="afterInteractive"
            onLoad={() => {
              // Setup OneSignal quando lo script è caricato (senza inizializzarlo ancora)
              if (typeof window !== "undefined") {
                window.OneSignalDeferred = window.OneSignalDeferred || []
                window.OneSignalDeferred.push(async function (OneSignal: any) {
                  try {
                    // Solo salva l'oggetto OneSignal, non inizializzarlo qui
                    // L'inizializzazione avverrà in initializeOneSignal con error handling
                    window.OneSignal = OneSignal
                    window.OneSignalInitialized = true
                    setIsOneSignalReady(true)
                    if (window.dispatchEvent) {
                      window.dispatchEvent(new Event("onesignal-ready"))
                    }
                  } catch (error: any) {
                    // Gestisci errori durante il setup
                    if (error?.message?.includes("Can only be used on")) {
                      const currentHost = window.location.hostname
                      console.error(
                        "OneSignal: Dominio non autorizzato. " +
                          "Aggiungi questo dominio nel dashboard OneSignal: " +
                          "Settings → Platforms → Web Push → Allowed Origins"
                      )
                      console.error("Dominio corrente:", currentHost)
                    } else {
                      console.error("Errore nel setup di OneSignal:", error)
                    }
                  }
                })
              }
            }}
          />
        </>
      )}
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

