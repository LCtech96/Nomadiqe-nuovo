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
    if (locale === 'it') {
      setTranslation({
        locale: 'it',
        name: property.name,
        description: property.description,
      })
      return
    }

    // Carica la traduzione per la lingua corrente
    const loadTranslation = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("property_translations")
          .select("locale, name, description")
          .eq("property_id", property.id)
          .eq("locale", locale)
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("Error loading translation:", error)
        }

        if (data) {
          setTranslation({
            locale: data.locale,
            name: data.name || property.name, // Fallback al nome originale
            description: data.description || property.description, // Fallback alla descrizione originale
          })
        } else {
          // Se non c'è traduzione, usa i valori originali
          setTranslation({
            locale: locale,
            name: property.name,
            description: property.description,
          })
        }
      } catch (error) {
        console.error("Error loading property translation:", error)
        // Fallback ai valori originali in caso di errore
        setTranslation({
          locale: locale,
          name: property.name,
          description: property.description,
        })
      } finally {
        setLoading(false)
      }
    }

    loadTranslation()
  }, [property?.id, locale])

  return {
    translatedName: translation?.name || property?.name || "",
    translatedDescription: translation?.description || property?.description || null,
    loading,
  }
}
