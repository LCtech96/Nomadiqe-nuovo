"use client"

import { useEffect, useState } from "react"

export default function CleanupSWPage() {
  const [status, setStatus] = useState<string>("Inizializzazione...")

  useEffect(() => {
    const cleanup = async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        setStatus("Service Worker non supportato")
        return
      }

      try {
        // Ottieni tutti i service worker registrati
        const registrations = await navigator.serviceWorker.getRegistrations()
        setStatus(`Trovati ${registrations.length} service worker`)

        let removed = 0
        for (const registration of registrations) {
          const scope = registration.scope
          const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL

          console.log("Service Worker trovato:", { scope, scriptURL })

          // Rimuovi se è OneSignal
          if (
            scope.includes("OneSignal") ||
            scriptURL?.includes("OneSignal") ||
            scriptURL?.includes("OneSignalSDKWorker")
          ) {
            await registration.unregister()
            removed++
            setStatus(`Rimosso: ${scope}`)
            console.log("✅ Service Worker OneSignal rimosso:", scope)
          }
        }

        if (removed === 0) {
          setStatus("Nessun service worker OneSignal trovato")
        } else {
          setStatus(`✅ Rimossi ${removed} service worker OneSignal`)
        }

        // Rimuovi anche dalla cache
        if ("caches" in window) {
          const cacheNames = await caches.keys()
          for (const cacheName of cacheNames) {
            if (cacheName.includes("OneSignal")) {
              await caches.delete(cacheName)
              console.log("✅ Cache OneSignal rimossa:", cacheName)
            }
          }
        }
      } catch (error) {
        console.error("Errore nel cleanup:", error)
        setStatus(`Errore: ${error}`)
      }
    }

    cleanup()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Cleanup Service Worker</h1>
        <p className="text-lg">{status}</p>
        <p className="text-sm text-gray-500 mt-4">
          Controlla la console (F12) per i dettagli
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Torna alla home
        </button>
      </div>
    </div>
  )
}




