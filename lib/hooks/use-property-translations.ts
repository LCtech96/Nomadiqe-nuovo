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

// Traduce un singolo testo via API Groq
async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text?.trim() || targetLanguage === "it") return text
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLanguage }),
    })
    if (!res.ok) return text
    const data = await res.json()
    return data.translatedText || text
  } catch {
    return text
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

  return {
    translatedName: translation?.name || property?.name || "",
    translatedDescription: translation?.description ?? property?.description ?? null,
    loading,
  }
}
