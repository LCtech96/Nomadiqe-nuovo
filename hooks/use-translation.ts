"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n } from "@/lib/i18n/context"

interface TranslationCache {
  [key: string]: string
}

// Cache locale per le traduzioni (per evitare chiamate API duplicate)
const translationCache: TranslationCache = {}
const translatingRef: { [key: string]: boolean } = {}

export function useTranslation() {
  const { locale } = useI18n()
  const [translating, setTranslating] = useState<string | null>(null)

  const translate = useCallback(
    async (text: string, forceLanguage?: string): Promise<string> => {
      if (!text || !text.trim()) return text

      const targetLanguage = forceLanguage || locale
      
      // Se la lingua è italiano, non tradurre
      if (targetLanguage === "it") {
        return text
      }

      // Crea una chiave unica per la cache
      const cacheKey = `${text}|${targetLanguage}`
      
      // Controlla se è già in cache
      if (translationCache[cacheKey]) {
        return translationCache[cacheKey]
      }

      // Se è già in traduzione, aspetta
      if (translatingRef[cacheKey]) {
        // Attendi che la traduzione finisca
        return new Promise((resolve) => {
          const checkCache = setInterval(() => {
            if (translationCache[cacheKey]) {
              clearInterval(checkCache)
              resolve(translationCache[cacheKey])
            }
          }, 100)
          
          // Timeout dopo 5 secondi
          setTimeout(() => {
            clearInterval(checkCache)
            resolve(text) // Fallback al testo originale
          }, 5000)
        })
      }

      try {
        translatingRef[cacheKey] = true
        setTranslating(cacheKey)
        
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            targetLanguage,
          }),
        })

        if (!response.ok) {
          throw new Error("Errore nella traduzione")
        }

        const data = await response.json()
        const translated = data.translatedText || text

        // Salva in cache
        translationCache[cacheKey] = translated

        return translated
      } catch (error) {
        console.error("Translation error:", error)
        // In caso di errore, ritorna il testo originale
        return text
      } finally {
        delete translatingRef[cacheKey]
        setTranslating(null)
      }
    },
    [locale]
  )

  // Funzione per tradurre array di testi (utile per commenti)
  const translateBatch = useCallback(
    async (texts: string[]): Promise<string[]> => {
      return Promise.all(texts.map((text) => translate(text)))
    },
    [translate]
  )

  // Pulisci la cache quando cambia la lingua
  useEffect(() => {
    // Mantieni solo le traduzioni per la lingua corrente
    Object.keys(translationCache).forEach((key) => {
      if (!key.endsWith(`|${locale}`)) {
        delete translationCache[key]
      }
    })
  }, [locale])

  return { translate, translateBatch, translating: translating !== null }
}
