import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/context"

export function usePropertyNameTranslation(propertyId: string | null, originalName: string) {
  const { locale } = useI18n()
  const [translatedName, setTranslatedName] = useState(originalName)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!propertyId) {
      setTranslatedName(originalName)
      return
    }

    // Se la lingua è 'it' (default), usa il nome originale
    if (locale === 'it') {
      setTranslatedName(originalName)
      return
    }

    // Carica la traduzione per la lingua corrente
    const loadTranslation = async () => {
      try {
        const { data } = await supabase
          .from("property_translations")
          .select("name")
          .eq("property_id", propertyId)
          .eq("locale", locale)
          .single()

        if (data?.name) {
          setTranslatedName(data.name)
        } else {
          setTranslatedName(originalName)
        }
      } catch (error) {
        setTranslatedName(originalName)
      }
    }

    loadTranslation()
  }, [propertyId, locale, originalName])

  return translatedName
}
