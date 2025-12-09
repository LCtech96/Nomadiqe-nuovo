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

    try {
      const OneSignal = window.OneSignal

      // Inizializza OneSignal
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: {
          enable: false,
        },
        allowLocalhostAsSecureOrigin: true,
      })

      // Controlla se l'utente è già iscritto
      const isSubscribed = await OneSignal.isPushNotificationsEnabled()

      if (!isSubscribed) {
        // Mostra il dialog dopo 3 secondi
        setTimeout(() => {
          setShowPermissionDialog(true)
        }, 3000)
      } else {
        const playerId = await OneSignal.getUserId()
        if (playerId) {
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
    } catch (error) {
      console.error("Errore nell'inizializzazione di OneSignal:", error)
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
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          type,
          data,
        }),
      })
    } catch (error) {
      console.error("Errore nell'invio della notifica:", error)
    }
  }

  const handleSubscribe = async () => {
    try {
      const OneSignal = window.OneSignal
      await OneSignal.registerForPushNotifications()
      setShowPermissionDialog(false)

      // Salva il player ID dopo la registrazione
      setTimeout(async () => {
        const playerId = await OneSignal.getUserId()
        if (playerId) {
          await savePlayerId(playerId)
        }
      }, 1000)
    } catch (error) {
      console.error("Errore nella registrazione:", error)
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

  return (
    <>
      {ONESIGNAL_APP_ID && (
        <>
          <Script
            id="onesignal-sdk"
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            strategy="afterInteractive"
            onLoad={() => {
              // Inizializza OneSignal quando lo script è caricato
              if (typeof window !== "undefined") {
                window.OneSignalDeferred = window.OneSignalDeferred || []
                window.OneSignalDeferred.push(async function (OneSignal: any) {
                  window.OneSignal = OneSignal
                  await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                  })
                  window.OneSignalInitialized = true
                  setIsOneSignalReady(true)
                  if (window.dispatchEvent) {
                    window.dispatchEvent(new Event("onesignal-ready"))
                  }
                })
              }
            }}
          />
        </>
      )}
      {children}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abilita le notifiche</DialogTitle>
            <DialogDescription>
              Ricevi notifiche quando qualcuno ti invia un messaggio, mette like o commenta i tuoi post, anche quando
              l'app è chiusa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              Non ora
            </Button>
            <Button onClick={handleSubscribe}>
              <Bell className="w-4 h-4 mr-2" />
              Abilita notifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
