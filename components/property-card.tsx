"use client"

import { useState, useEffect } from "react"
import { createSupabaseClient } from "@/lib/supabase/client"
import { useI18n } from "@/lib/i18n/context"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Star } from "lucide-react"

interface Property {
  id: string
  name: string
  description?: string | null
  city: string
  country: string
  price_per_night: number
  images?: string[] | null
  rating?: number
  review_count?: number
  [key: string]: any
}

interface PropertyCardProps {
  property: Property
  showDescription?: boolean
}

export function PropertyCard({ property, showDescription = false }: PropertyCardProps) {
  const { locale } = useI18n()
  const [translation, setTranslation] = useState<{ name: string; description: string | null } | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    // Se la lingua è 'it' (default), usa i valori originali
    if (locale === 'it') {
      setTranslation({
        name: property.name,
        description: property.description || null,
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
          .maybeSingle()

        if (error) {
          console.error("Error loading translation:", error)
        }

        if (data) {
          setTranslation({
            name: data.name || property.name,
            description: data.description || property.description || null,
          })
        } else {
          // Se non c'è traduzione, usa i valori originali
          setTranslation({
            name: property.name,
            description: property.description || null,
          })
        }
      } catch (error) {
        console.error("Error loading property translation:", error)
        setTranslation({
          name: property.name,
          description: property.description || null,
        })
      } finally {
        setLoading(false)
      }
    }

    loadTranslation()
  }, [property.id, locale])

  const displayName = translation?.name || property.name
  const displayDescription = translation?.description || property.description

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative w-full h-48">
          {property.images && property.images.length > 0 ? (
            <Image
              src={property.images[0]}
              alt={displayName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">Nessuna immagine</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">{displayName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {property.city}, {property.country}
              </p>
            </div>
            {showDescription && displayDescription && (
              <p className="text-sm text-muted-foreground line-clamp-2">{displayDescription}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                {property.rating && property.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{property.rating.toFixed(1)}</span>
                    {property.review_count && property.review_count > 0 && (
                      <span className="text-muted-foreground">({property.review_count})</span>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-bold">€{property.price_per_night}</span>
                <span className="text-xs text-muted-foreground">/notte</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
