"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createSupabaseClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { Star, Users, MapPin } from "lucide-react"

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
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    loadProperties()
  }, [])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
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

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    // Scroll to property in feed
    const element = document.getElementById(`property-${property.id}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Esplora Alloggi</h1>
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Cerca per nome, città o paese..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Button
              variant={showMap ? "default" : "outline"}
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? "Nascondi Mappa" : "Mostra Mappa"}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          {showMap && (
            <div className="lg:col-span-1 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <div className="h-full rounded-lg overflow-hidden border shadow-sm">
                <MapComponent
                  properties={filteredProperties}
                  onPropertySelect={handlePropertySelect}
                />
              </div>
            </div>
          )}

          {/* Feed Section */}
          <div className={showMap ? "lg:col-span-2" : "lg:col-span-3"}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Caricamento strutture...</div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nessuna struttura trovata
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  {filteredProperties.length} {filteredProperties.length === 1 ? "struttura trovata" : "strutture trovate"}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredProperties.map((property) => (
                    <Card
                      key={property.id}
                      id={`property-${property.id}`}
                      className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                        selectedProperty?.id === property.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedProperty(property)}
                    >
                      {/* Property Image */}
                      <div className="relative w-full h-64 overflow-hidden">
                        {property.images && property.images.length > 0 ? (
                          <Image
                            src={property.images[0]}
                            alt={property.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <MapPin className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        {/* Price Badge */}
                        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                          <span className="text-lg font-bold">€{property.price_per_night}</span>
                          <span className="text-xs text-muted-foreground">/notte</span>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg line-clamp-1">{property.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {property.city}, {property.country}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            {property.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">
                                  {property.rating.toFixed(1)}
                                </span>
                                {property.review_count > 0 && (
                                  <span className="text-muted-foreground">
                                    ({property.review_count})
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{property.max_guests} ospiti</span>
                            </div>
                          </div>

                          <Button asChild className="w-full mt-4" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/properties/${property.id}`}>Vedi dettagli</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
