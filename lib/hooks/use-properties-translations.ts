import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/context"

interface Property {
  id: string
  name: string
  description?: string | null
  title?: string | null
  [key: string]: any
}

interface PropertyTranslation {
  property_id: string
  locale: string
  name: string | null
  description: string | null
}

export function usePropertiesTranslations(properties: Property[] | null | undefined) {
  const { locale } = useI18n()
  const [translations, setTranslations] = useState<Record<string, PropertyTranslation>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!properties || properties.length === 0) {
      setTranslations({})
      return
    }

    // Se la lingua è 'it' (default), usa i valori originali
    if (locale === 'it') {
      const defaultTranslations: Record<string, PropertyTranslation> = {}
      properties.forEach((prop) => {
        defaultTranslations[prop.id] = {
          property_id: prop.id,
          locale: 'it',
          name: prop.name,
          description: prop.description || null,
        }
      })
      setTranslations(defaultTranslations)
      return
    }

    // Carica le traduzioni per tutte le proprietà
    const loadTranslations = async () => {
      setLoading(true)
      try {
        const propertyIds = properties.map((p) => p.id)
        const { data, error } = await supabase
          .from("property_translations")
          .select("property_id, locale, name, description")
          .in("property_id", propertyIds)
          .eq("locale", locale)

        if (error && error.code !== "PGRST116") {
          console.error("Error loading translations:", error)
        }

        const translationsMap: Record<string, PropertyTranslation> = {}
        
        // Inizializza con i valori originali
        properties.forEach((prop) => {
          translationsMap[prop.id] = {
            property_id: prop.id,
            locale: locale,
            name: prop.name || prop.title || '',
            description: prop.description || null,
          }
        })

        // Sostituisci con le traduzioni se disponibili
        if (data) {
          data.forEach((trans) => {
            if (translationsMap[trans.property_id]) {
              translationsMap[trans.property_id] = {
                property_id: trans.property_id,
                locale: trans.locale,
                name: trans.name || translationsMap[trans.property_id].name,
                description: trans.description || translationsMap[trans.property_id].description,
              }
            }
          })
        }

        setTranslations(translationsMap)
      } catch (error) {
        console.error("Error loading property translations:", error)
        // Fallback ai valori originali
        const defaultTranslations: Record<string, PropertyTranslation> = {}
        properties.forEach((prop) => {
          defaultTranslations[prop.id] = {
            property_id: prop.id,
            locale: locale,
            name: prop.name || prop.title || '',
            description: prop.description || null,
          }
        })
        setTranslations(defaultTranslations)
      } finally {
        setLoading(false)
      }
    }

    loadTranslations()
  }, [properties?.map(p => p.id).join(','), locale])

  const getTranslatedProperty = (property: Property) => {
    const translation = translations[property.id]
    if (!translation) {
      return {
        name: property.name,
        description: property.description || null,
        title: property.title || property.name,
      }
    }
    return {
      name: translation.name || property.name,
      description: translation.description || property.description || null,
      title: translation.name || property.title || property.name,
    }
  }

  return {
    getTranslatedProperty,
    loading,
  }
}
