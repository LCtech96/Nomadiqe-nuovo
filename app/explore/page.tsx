"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import Link from "next/link"

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map"), { ssr: false })

interface Property {
  id: string
  name: string
  description: string
  property_type: string
  city: string
  country: string
  latitude: number
  longitude: number
  price_per_night: number
  max_guests: number
  images: string[]
  rating: number
  review_count: number
}

export default function ExplorePage() {
  const supabase = createSupabaseClient()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .limit(50)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error("Error loading properties:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Esplora Alloggi</h1>
          <Input
            placeholder="Cerca per nome, città o paese..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-[600px] rounded-lg overflow-hidden mb-6">
              <MapComponent
                properties={filteredProperties}
                onPropertySelect={setSelectedProperty}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Risultati ({filteredProperties.length})</h2>
            {loading ? (
              <div>Caricamento...</div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className={`cursor-pointer transition-all ${
                      selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedProperty(property)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription>
                        {property.city}, {property.country}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-2xl font-bold">
                          €{property.price_per_night}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          per notte
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm">
                          ⭐ {property.rating.toFixed(1)} ({property.review_count})
                        </span>
                        <span className="text-sm text-muted-foreground">
                          • {property.max_guests} ospiti
                        </span>
                      </div>
                      <Button asChild className="w-full">
                        <Link href={`/properties/${property.id}`}>Vedi dettagli</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

