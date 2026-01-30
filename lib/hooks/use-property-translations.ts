import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/context"

interface PropertyTranslation {
  locale: string
  name: string | null
  description: string | null
}

interface Property {
  id: string
  name: string
  description: string | null
  [key: string]: any
}

// Risposta "meta" di Groq quando riceve input vuoto - da scartare
const META_RESPONSE_PATTERNS = [
  "non c'è testo",
  "fornisci il testo",
  "provide the text",
  "no text provided",
  "sarò felice di aiutarti",
]

function isMetaResponse(str: string): boolean {
  const s = (str || "").toLowerCase()
  return META_RESPONSE_PATTERNS.some((p) => s.includes(p))
}

async function translateText(text: string, targetLanguage: string): Promise<string> {
  const trimmed = text?.trim()
  if (!trimmed || targetLanguage === "it") return trimmed || ""
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, targetLanguage }),
    })
    if (!res.ok) return trimmed
    const data = await res.json()
    const result = data.translatedText || trimmed
    return isMetaResponse(result) ? trimmed : result
  } catch {
    return trimmed
  }
}

export function usePropertyTranslations(property: Property | null) {
  const { locale } = useI18n()
  const [translation, setTranslation] = useState<PropertyTranslation | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!property) {
      setTranslation(null)
      return
    }

    // Se la lingua è 'it' (default), usa i valori originali
    if (locale === "it") {
      setTranslation({
        locale: "it",
        name: property.name,
        description: property.description,
      })
      return
    }

    const loadTranslation = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("property_translations")
          .select("locale, name, description")
          .eq("property_id", property.id)
          .eq("locale", locale)
          .maybeSingle()

        if (error) {
          console.error("Error loading translation:", error)
        }

        if (data?.name || data?.description) {
          setTranslation({
            locale: data.locale,
            name: data.name || property.name,
            description: data.description ?? property.description,
          })
          return
        }

        // Nessuna traduzione in DB: traduce on-the-fly via API
        const [translatedName, translatedDescription] = await Promise.all([
          translateText(property.name || "", locale),
          property.description
            ? translateText(property.description, locale)
            : Promise.resolve(null),
        ])
        setTranslation({
          locale,
          name: translatedName || property.name,
          description: translatedDescription ?? property.description,
        })
      } catch (error) {
        console.error("Error loading property translation:", error)
        setTranslation({
          locale,
          name: property.name,
          description: property.description,
        })
      } finally {
        setLoading(false)
      }
    }

    loadTranslation()
  }, [property?.id, property?.name, property?.description, locale])

  // Filtra risposte "meta" di Groq (es. "Non c'è testo fornito...") e usa originale
  const safeName = (v: string | null | undefined) =>
    v && !isMetaResponse(v) ? v : null
  let name = safeName(translation?.name) ?? safeName(property?.name) ?? property?.name ?? ""
  if (isMetaResponse(name)) name = ""

  let desc =
    (translation?.description && !isMetaResponse(translation.description)
      ? translation.description
      : null) ?? property?.description ?? null
  if (desc && isMetaResponse(desc)) desc = null

  const safePropName = property?.name && !isMetaResponse(property.name) ? property.name : ""

  return {
    translatedName: name || safePropName || "",
    translatedDescription: desc ?? (property?.description && !isMetaResponse(property.description) ? property.description : null),
    loading,
  }
}
